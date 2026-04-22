import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../lib/prisma.js'
import { requireDoctor } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { Errors } from '../lib/errors.js'

const ProcessSchema = z.object({
  patientId: z.string().min(1),
  transcriptText: z.string().min(5, 'El transcript es demasiado corto'),
  durationSeconds: z.number().int().min(0),
  consentAt: z.string().datetime(),
})

interface ClaudeExtraction {
  chiefComplaint?: string | null
  evolutionNotes?: string | null
  physicalExam?: string | null
  diagnoses?: string[]
  treatmentPlan?: string | null
  aiSummary?: string
}

async function extractWithClaude(transcript: string): Promise<ClaudeExtraction> {
  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

  const anthropic = new Anthropic({ apiKey })

  const prompt = `Eres un asistente médico experto en documentación clínica. Analiza la siguiente transcripción de una consulta médica y extrae la información clínica estructurada.

REGLAS ESTRICTAS:
- Extrae SOLO información explícitamente mencionada en la transcripción
- NUNCA inventes, asumas ni inferas datos no presentes
- Si un campo no aparece en la transcripción, devuelve null para ese campo
- Si hay ambigüedad o información parcial, inicia el valor con [REVISAR]
- Redacta el resumen en lenguaje médico profesional, claro y conciso

TRANSCRIPCIÓN DE LA CONSULTA:
${transcript}

Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown ni texto adicional:
{
  "chiefComplaint": "motivo principal de consulta o null",
  "evolutionNotes": "padecimiento actual, historia de la enfermedad presente, síntomas y evolución o null",
  "physicalExam": "hallazgos relevantes de la exploración física mencionados o null",
  "diagnoses": ["diagnóstico principal", "diagnóstico secundario si aplica"],
  "treatmentPlan": "plan terapéutico, medicamentos con dosis si se mencionan, indicaciones y seguimiento o null",
  "aiSummary": "resumen clínico ejecutivo de 2-4 oraciones en lenguaje médico profesional que capture los puntos más importantes de la consulta"
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

  // Strip potential markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned) as ClaudeExtraction
}

export async function consultaIaRoutes(server: FastifyInstance) {
  // POST /api/consulta-ia/process
  // Procesa un transcript, llama a Claude y crea la nota clínica en DRAFT
  server.post('/process', { preHandler: requireDoctor }, async (request, reply) => {
    const { clinicId, doctorId, userId } = request.authUser

    if (!doctorId) return Errors.FORBIDDEN(reply, 'Requiere rol de médico con expediente activo')

    const parsed = ProcessSchema.safeParse(request.body)
    if (!parsed.success) return Errors.VALIDATION(reply, parsed.error.format())

    const { patientId, transcriptText, durationSeconds, consentAt } = parsed.data

    // Verify patient belongs to clinic and is active
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!patient) return Errors.NOT_FOUND(reply, 'Paciente no encontrado')

    // Verify doctor exists and is active
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, clinicId, isActive: true },
      select: { id: true },
    })
    if (!doctor) return Errors.FORBIDDEN(reply, 'Médico no activo en esta clínica')

    // Call Claude for clinical extraction
    let extracted: ClaudeExtraction = {}
    let claudeError: string | null = null

    try {
      extracted = await extractWithClaude(transcriptText)
    } catch (err) {
      claudeError = err instanceof Error ? err.message : 'Error al procesar con IA'
      extracted = {
        aiSummary: '[REVISAR] El procesamiento automático falló. Revise el transcript y complete los campos manualmente.',
      }
    }

    // Map diagnoses to ClinicalNote format: [{ code, description, type }]
    const diagnosesFormatted = (extracted.diagnoses ?? []).map((d: string, i: number) => ({
      code: '',
      description: d,
      type: i === 0 ? 'PRIMARY' : 'SECONDARY',
    }))

    // Create DRAFT clinical note with AI-populated fields
    const note = await prisma.clinicalNote.create({
      data: {
        clinicId,
        patientId,
        doctorId,
        chiefComplaint: extracted.chiefComplaint ?? undefined,
        evolutionNotes: extracted.evolutionNotes ?? undefined,
        physicalExam: extracted.physicalExam ?? undefined,
        diagnoses: diagnosesFormatted,
        treatmentPlan: extracted.treatmentPlan ?? undefined,
        isAiAssisted: true,
        aiSummary: extracted.aiSummary ?? undefined,
        transcriptText,
        transcriptDurationSeconds: durationSeconds,
        transcriptConsentAt: new Date(consentAt),
        status: 'DRAFT',
      },
      select: {
        id: true,
        patientId: true,
        chiefComplaint: true,
        diagnoses: true,
        treatmentPlan: true,
        evolutionNotes: true,
        aiSummary: true,
        transcriptDurationSeconds: true,
        isAiAssisted: true,
      },
    })

    await auditLog({
      clinicId,
      userId,
      action: 'AI_CONSULT',
      resourceType: 'ClinicalNote',
      resourceId: note.id,
      metadata: {
        patientId,
        doctorId,
        durationSeconds,
        transcriptLength: transcriptText.length,
        claudeError,
      },
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string | undefined,
    }).catch(console.error)

    return reply.send({
      data: {
        noteId: note.id,
        patientId,
        patientName: `${patient.lastName} ${patient.firstName}`.trim(),
        extracted,
        note,
      },
    })
  })
}
