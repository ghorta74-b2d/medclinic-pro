// Top CIE-10 diagnoses in Mexico — most common in primary care and gynecology
// Full CIE-10 database should be loaded from a DB or external service in production

export interface Cie10Entry {
  code: string
  description: string
  category: string
}

export const CIE10_COMMON: Cie10Entry[] = [
  // Gynecology
  { code: 'N94.6', description: 'Dismenorrea primaria', category: 'Ginecología' },
  { code: 'N92.0', description: 'Menstruación excesiva y frecuente', category: 'Ginecología' },
  { code: 'N83.2', description: 'Otros quistes de ovario', category: 'Ginecología' },
  { code: 'N76.0', description: 'Vaginitis aguda', category: 'Ginecología' },
  { code: 'N72', description: 'Enfermedad inflamatoria del cuello uterino', category: 'Ginecología' },
  { code: 'O80', description: 'Parto único espontáneo', category: 'Obstetricia' },
  { code: 'Z34', description: 'Supervisión del embarazo normal', category: 'Obstetricia' },
  { code: 'O26.9', description: 'Complicación del embarazo, no especificada', category: 'Obstetricia' },
  { code: 'N91.2', description: 'Amenorrea, sin especificar', category: 'Ginecología' },
  { code: 'N60.0', description: 'Quiste solitario de la mama', category: 'Ginecología' },
  // Respiratory
  { code: 'J00', description: 'Rinofaringitis aguda (resfriado común)', category: 'Respiratorio' },
  { code: 'J06.9', description: 'Infección aguda de vías respiratorias superiores', category: 'Respiratorio' },
  { code: 'J20.9', description: 'Bronquitis aguda, no especificada', category: 'Respiratorio' },
  { code: 'J18.9', description: 'Neumonía, no especificada', category: 'Respiratorio' },
  { code: 'J45.9', description: 'Asma, no especificada', category: 'Respiratorio' },
  // Digestive
  { code: 'K29.7', description: 'Gastritis, no especificada', category: 'Digestivo' },
  { code: 'K21.0', description: 'Enfermedad por reflujo gastroesofágico', category: 'Digestivo' },
  { code: 'K59.0', description: 'Estreñimiento', category: 'Digestivo' },
  { code: 'A09', description: 'Diarrea y gastroenteritis de origen infeccioso', category: 'Digestivo' },
  { code: 'K35.9', description: 'Apendicitis aguda, sin especificar', category: 'Digestivo' },
  // Metabolic
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2, sin complicaciones', category: 'Metabólico' },
  { code: 'E10.9', description: 'Diabetes mellitus tipo 1, sin complicaciones', category: 'Metabólico' },
  { code: 'E11.65', description: 'Diabetes mellitus tipo 2 con hiperglucemia', category: 'Metabólico' },
  { code: 'E78.5', description: 'Hiperlipidemia, no especificada', category: 'Metabólico' },
  { code: 'E66.9', description: 'Obesidad, no especificada', category: 'Metabólico' },
  { code: 'E03.9', description: 'Hipotiroidismo, no especificado', category: 'Metabólico' },
  // Cardiovascular
  { code: 'I10', description: 'Hipertensión esencial (primaria)', category: 'Cardiovascular' },
  { code: 'I25.1', description: 'Enfermedad aterosclerótica del corazón', category: 'Cardiovascular' },
  { code: 'I21.9', description: 'Infarto agudo del miocardio, sin especificar', category: 'Cardiovascular' },
  { code: 'I50.9', description: 'Insuficiencia cardiaca, no especificada', category: 'Cardiovascular' },
  // Musculoskeletal
  { code: 'M54.5', description: 'Lumbago, no especificado', category: 'Musculoesquelético' },
  { code: 'M54.2', description: 'Cervicalgia', category: 'Musculoesquelético' },
  { code: 'M79.3', description: 'Paniculitis, no especificada', category: 'Musculoesquelético' },
  { code: 'M25.5', description: 'Dolor en articulación', category: 'Musculoesquelético' },
  // Neurological
  { code: 'G43.9', description: 'Migraña, no especificada', category: 'Neurológico' },
  { code: 'G44.2', description: 'Cefalea tensional', category: 'Neurológico' },
  // Urinary
  { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado', category: 'Urinario' },
  { code: 'N30.0', description: 'Cistitis aguda', category: 'Urinario' },
  // Infections
  { code: 'B34.9', description: 'Infección viral, no especificada', category: 'Infeccioso' },
  { code: 'A41.9', description: 'Sepsis, no especificada', category: 'Infeccioso' },
  // Mental health
  { code: 'F32.9', description: 'Episodio depresivo, no especificado', category: 'Salud Mental' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada', category: 'Salud Mental' },
  // Skin
  { code: 'L30.9', description: 'Dermatitis, no especificada', category: 'Dermatología' },
  { code: 'L50.9', description: 'Urticaria, no especificada', category: 'Dermatología' },
  // Preventive / Z codes
  { code: 'Z00.0', description: 'Examen médico general', category: 'Preventivo' },
  { code: 'Z01.4', description: 'Examen ginecológico (general)', category: 'Preventivo' },
  { code: 'Z11.3', description: 'Examen de detección de infecciones de transmisión sexual', category: 'Preventivo' },
  { code: 'Z23', description: 'Necesidad de inmunización contra enfermedades bacterianas', category: 'Preventivo' },
]

export function searchCie10(query: string): Cie10Entry[] {
  const q = query.toLowerCase()
  return CIE10_COMMON.filter(
    (e) =>
      e.code.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
  ).slice(0, 15)
}
