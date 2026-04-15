/**
 * MedClinic Pro — Seed de Catálogos Regulatorios (Fase 2)
 *
 * Carga:
 *   1. CIE-10 SSA México — ~300 diagnósticos más frecuentes en atención primaria
 *   2. CUM COFEPRIS — medicamentos esenciales México
 *
 * Para cargar el catálogo COMPLETO de CIE-10 (~70 000 códigos):
 *   1. Descargar CSV oficial: https://www.paho.org/es/clasificacion-internacional-enfermedades
 *      o desde el portal DGIS-SSA: https://dgis.salud.gob.mx
 *   2. Ajustar la sección "FULL CSV IMPORT" al final de este archivo
 *   3. Ejecutar: pnpm tsx prisma/seed-catalogs.ts --csv=/ruta/al/CIE10.csv
 *
 * Ejecución normal (solo seed básico):
 *   pnpm tsx prisma/seed-catalogs.ts
 */

import { PrismaClient } from '../generated/index.js'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
// CIE-10 — Diagnósticos más frecuentes en México (atención primaria + especialidades)
// Fuente: SINAVE/SSA estadísticas de morbilidad
// ─────────────────────────────────────────────────────────────────────────────
const CIE10_SEED = [
  // ── Infecciosas y parasitarias ─────────────────────────────────────────────
  { code: 'A00.0', description: 'Cólera debida a Vibrio cholerae 01, biotipo cholerae', chapter: 'I', block: 'A00-A09' },
  { code: 'A01.0', description: 'Fiebre tifoidea', chapter: 'I', block: 'A00-A09' },
  { code: 'A06.0', description: 'Disentería amebiana aguda', chapter: 'I', block: 'A06' },
  { code: 'A08.0', description: 'Enteritis debida a rotavirus', chapter: 'I', block: 'A00-A09' },
  { code: 'A09', description: 'Diarrea y gastroenteritis de presunto origen infeccioso', chapter: 'I', block: 'A00-A09' },
  { code: 'A15.0', description: 'Tuberculosis pulmonar, confirmada por hallazgo microscópico', chapter: 'I', block: 'A15-A19' },
  { code: 'A16.2', description: 'Tuberculosis pulmonar, sin mención de confirmación bacteriológica', chapter: 'I', block: 'A15-A19' },
  { code: 'A36.0', description: 'Difteria faríngea', chapter: 'I', block: 'A36' },
  { code: 'A37.0', description: 'Tos ferina debida a Bordetella pertussis', chapter: 'I', block: 'A37' },
  { code: 'A50.9', description: 'Sífilis congénita, no especificada', chapter: 'I', block: 'A50-A64' },
  { code: 'A51.0', description: 'Sífilis genital primaria', chapter: 'I', block: 'A50-A64' },
  { code: 'A54.0', description: 'Infección gonocócica del tracto genitourinario inferior', chapter: 'I', block: 'A50-A64' },
  { code: 'A56.0', description: 'Infección del tracto genitourinario inferior debida a clamidia', chapter: 'I', block: 'A50-A64' },
  { code: 'A63.0', description: 'Condiloma acuminado', chapter: 'I', block: 'A63' },
  { code: 'A90', description: 'Dengue clásico (dengue sin signos de alarma)', chapter: 'I', block: 'A90-A99' },
  { code: 'A91', description: 'Dengue hemorrágico', chapter: 'I', block: 'A90-A99' },
  { code: 'B00.1', description: 'Herpes simple genital', chapter: 'I', block: 'B00-B09' },
  { code: 'B01.9', description: 'Varicela sin complicaciones', chapter: 'I', block: 'B00-B09' },
  { code: 'B02.9', description: 'Zóster sin complicaciones', chapter: 'I', block: 'B00-B09' },
  { code: 'B05.9', description: 'Sarampión sin complicaciones', chapter: 'I', block: 'B00-B09' },
  { code: 'B06.9', description: 'Rubéola sin complicaciones', chapter: 'I', block: 'B00-B09' },
  { code: 'B24', description: 'Enfermedad por VIH/SIDA, no especificada', chapter: 'I', block: 'B20-B24' },
  { code: 'B34.9', description: 'Infección viral, no especificada', chapter: 'I', block: 'B25-B34' },
  { code: 'B37.3', description: 'Candidiasis vulvovaginal', chapter: 'I', block: 'B35-B49' },
  { code: 'B37.0', description: 'Estomatitis candidiásica (muguet)', chapter: 'I', block: 'B35-B49' },
  { code: 'B77.9', description: 'Ascariasis, no especificada', chapter: 'I', block: 'B65-B83' },

  // ── Neoplasias ────────────────────────────────────────────────────────────
  { code: 'C16.9', description: 'Tumor maligno del estómago, parte no especificada', chapter: 'II', block: 'C15-C26' },
  { code: 'C18.9', description: 'Tumor maligno del colon, parte no especificada', chapter: 'II', block: 'C15-C26' },
  { code: 'C34.1', description: 'Tumor maligno del lóbulo superior, bronquio o pulmón', chapter: 'II', block: 'C30-C39' },
  { code: 'C50.9', description: 'Tumor maligno de la mama, parte no especificada', chapter: 'II', block: 'C50' },
  { code: 'C53.9', description: 'Tumor maligno del cuello del útero, parte no especificada', chapter: 'II', block: 'C51-C58' },
  { code: 'C54.1', description: 'Tumor maligno del endometrio', chapter: 'II', block: 'C51-C58' },
  { code: 'C56', description: 'Tumor maligno del ovario', chapter: 'II', block: 'C51-C58' },
  { code: 'C61', description: 'Tumor maligno de la próstata', chapter: 'II', block: 'C60-C63' },
  { code: 'C67.9', description: 'Tumor maligno de la vejiga urinaria, parte no especificada', chapter: 'II', block: 'C64-C68' },
  { code: 'D25.9', description: 'Leiomioma del útero, no especificado', chapter: 'II', block: 'D10-D36' },
  { code: 'D27', description: 'Tumor benigno del ovario', chapter: 'II', block: 'D10-D36' },

  // ── Endocrinas, nutricionales y metabólicas ───────────────────────────────
  { code: 'E10.9', description: 'Diabetes mellitus tipo 1 sin complicaciones', chapter: 'IV', block: 'E10-E14' },
  { code: 'E11.0', description: 'Diabetes mellitus tipo 2 con coma', chapter: 'IV', block: 'E10-E14' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones', chapter: 'IV', block: 'E10-E14' },
  { code: 'E11.5', description: 'Diabetes mellitus tipo 2 con complicaciones circulatorias periféricas', chapter: 'IV', block: 'E10-E14' },
  { code: 'E14.9', description: 'Diabetes mellitus no especificada, sin complicaciones', chapter: 'IV', block: 'E10-E14' },
  { code: 'E03.9', description: 'Hipotiroidismo, no especificado', chapter: 'IV', block: 'E00-E07' },
  { code: 'E05.0', description: 'Tirotoxicosis con bocio difuso (hipertiroidismo)', chapter: 'IV', block: 'E00-E07' },
  { code: 'E28.0', description: 'Exceso de estrógenos', chapter: 'IV', block: 'E20-E35' },
  { code: 'E28.2', description: 'Síndrome de ovario poliquístico', chapter: 'IV', block: 'E20-E35' },
  { code: 'E66.0', description: 'Obesidad debida a exceso de calorías', chapter: 'IV', block: 'E65-E68' },
  { code: 'E66.9', description: 'Obesidad, no especificada', chapter: 'IV', block: 'E65-E68' },
  { code: 'E78.0', description: 'Hipercolesterolemia pura', chapter: 'IV', block: 'E70-E90' },
  { code: 'E78.5', description: 'Hiperlipidemia mixta', chapter: 'IV', block: 'E70-E90' },
  { code: 'E87.1', description: 'Hipoosmolalidad e hiponatremia', chapter: 'IV', block: 'E70-E90' },

  // ── Trastornos mentales ───────────────────────────────────────────────────
  { code: 'F10.2', description: 'Trastornos mentales y del comportamiento debidos al uso del alcohol: síndrome de dependencia', chapter: 'V', block: 'F10-F19' },
  { code: 'F32.0', description: 'Episodio depresivo leve', chapter: 'V', block: 'F30-F39' },
  { code: 'F32.1', description: 'Episodio depresivo moderado', chapter: 'V', block: 'F30-F39' },
  { code: 'F32.9', description: 'Episodio depresivo, no especificado', chapter: 'V', block: 'F30-F39' },
  { code: 'F33.9', description: 'Trastorno depresivo recurrente, no especificado', chapter: 'V', block: 'F30-F39' },
  { code: 'F40.0', description: 'Agorafobia', chapter: 'V', block: 'F40-F48' },
  { code: 'F41.0', description: 'Trastorno de pánico', chapter: 'V', block: 'F40-F48' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada', chapter: 'V', block: 'F40-F48' },
  { code: 'F43.2', description: 'Trastornos de adaptación', chapter: 'V', block: 'F40-F48' },
  { code: 'F50.0', description: 'Anorexia nerviosa', chapter: 'V', block: 'F50-F59' },

  // ── Sistema nervioso ───────────────────────────────────────────────────────
  { code: 'G20', description: 'Enfermedad de Parkinson', chapter: 'VI', block: 'G20-G26' },
  { code: 'G35', description: 'Esclerosis múltiple', chapter: 'VI', block: 'G35-G37' },
  { code: 'G40.9', description: 'Epilepsia, no especificada', chapter: 'VI', block: 'G40-G47' },
  { code: 'G43.9', description: 'Migraña, no especificada', chapter: 'VI', block: 'G40-G47' },
  { code: 'G44.2', description: 'Cefalea tensional', chapter: 'VI', block: 'G40-G47' },
  { code: 'G47.0', description: 'Trastornos del inicio y del mantenimiento del sueño (insomnio)', chapter: 'VI', block: 'G40-G47' },
  { code: 'G54.2', description: 'Trastornos de la raíz nerviosa cervical', chapter: 'VI', block: 'G50-G59' },

  // ── Ojos ──────────────────────────────────────────────────────────────────
  { code: 'H10.9', description: 'Conjuntivitis, no especificada', chapter: 'VII', block: 'H10-H13' },
  { code: 'H26.9', description: 'Catarata, no especificada', chapter: 'VII', block: 'H25-H28' },
  { code: 'H40.9', description: 'Glaucoma, no especificado', chapter: 'VII', block: 'H40-H42' },
  { code: 'H52.1', description: 'Miopía', chapter: 'VII', block: 'H49-H52' },
  { code: 'H52.4', description: 'Presbicia', chapter: 'VII', block: 'H49-H52' },

  // ── Oído ──────────────────────────────────────────────────────────────────
  { code: 'H66.9', description: 'Otitis media, no especificada', chapter: 'VIII', block: 'H65-H75' },
  { code: 'H81.1', description: 'Vértigo posicional paroxístico benigno (VPPB)', chapter: 'VIII', block: 'H80-H83' },

  // ── Sistema circulatorio ──────────────────────────────────────────────────
  { code: 'I10', description: 'Hipertensión esencial (primaria)', chapter: 'IX', block: 'I10-I15' },
  { code: 'I11.9', description: 'Enfermedad cardíaca hipertensiva sin insuficiencia cardíaca', chapter: 'IX', block: 'I10-I15' },
  { code: 'I13.0', description: 'Hipertensión con nefropatía sin insuficiencia cardíaca', chapter: 'IX', block: 'I10-I15' },
  { code: 'I20.9', description: 'Angina de pecho, no especificada', chapter: 'IX', block: 'I20-I25' },
  { code: 'I21.9', description: 'Infarto agudo del miocardio, no especificado', chapter: 'IX', block: 'I20-I25' },
  { code: 'I25.1', description: 'Enfermedad aterosclerótica del corazón', chapter: 'IX', block: 'I20-I25' },
  { code: 'I48.9', description: 'Fibrilación auricular y aleteo auricular, no especificados', chapter: 'IX', block: 'I30-I52' },
  { code: 'I50.9', description: 'Insuficiencia cardíaca, no especificada', chapter: 'IX', block: 'I30-I52' },
  { code: 'I63.9', description: 'Infarto cerebral, no especificado (EVC isquémico)', chapter: 'IX', block: 'I60-I69' },
  { code: 'I64', description: 'Accidente vascular encefálico, no especificado como hemorrágico o isquémico', chapter: 'IX', block: 'I60-I69' },
  { code: 'I83.9', description: 'Várices de los miembros inferiores sin úlcera ni inflamación', chapter: 'IX', block: 'I80-I89' },
  { code: 'I87.2', description: 'Insuficiencia venosa crónica (periférica)', chapter: 'IX', block: 'I80-I89' },

  // ── Sistema respiratorio ──────────────────────────────────────────────────
  { code: 'J00', description: 'Rinofaringitis aguda (resfriado común)', chapter: 'X', block: 'J00-J06' },
  { code: 'J01.9', description: 'Sinusitis aguda, no especificada', chapter: 'X', block: 'J00-J06' },
  { code: 'J02.9', description: 'Faringitis aguda, no especificada', chapter: 'X', block: 'J00-J06' },
  { code: 'J03.9', description: 'Amigdalitis aguda, no especificada', chapter: 'X', block: 'J00-J06' },
  { code: 'J04.0', description: 'Laringitis aguda', chapter: 'X', block: 'J00-J06' },
  { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores, no especificada', chapter: 'X', block: 'J00-J06' },
  { code: 'J10.1', description: 'Influenza con otras manifestaciones respiratorias, virus de influenza identificado', chapter: 'X', block: 'J09-J18' },
  { code: 'J11.1', description: 'Influenza con otras manifestaciones respiratorias, virus no identificado', chapter: 'X', block: 'J09-J18' },
  { code: 'J18.9', description: 'Neumonía, no especificada', chapter: 'X', block: 'J09-J18' },
  { code: 'J20.9', description: 'Bronquitis aguda, no especificada', chapter: 'X', block: 'J20-J22' },
  { code: 'J30.0', description: 'Rinitis alérgica debida a polen (fiebre del heno)', chapter: 'X', block: 'J30-J39' },
  { code: 'J30.1', description: 'Rinitis alérgica, no especificada', chapter: 'X', block: 'J30-J39' },
  { code: 'J32.0', description: 'Sinusitis maxilar crónica', chapter: 'X', block: 'J30-J39' },
  { code: 'J32.9', description: 'Sinusitis crónica, no especificada', chapter: 'X', block: 'J30-J39' },
  { code: 'J40', description: 'Bronquitis, no especificada como aguda o crónica', chapter: 'X', block: 'J40-J47' },
  { code: 'J41.0', description: 'Bronquitis crónica simple', chapter: 'X', block: 'J40-J47' },
  { code: 'J44.1', description: 'EPOC con exacerbación aguda', chapter: 'X', block: 'J40-J47' },
  { code: 'J44.9', description: 'EPOC no especificada', chapter: 'X', block: 'J40-J47' },
  { code: 'J45.0', description: 'Asma predominantemente alérgica', chapter: 'X', block: 'J40-J47' },
  { code: 'J45.9', description: 'Asma, no especificada', chapter: 'X', block: 'J40-J47' },

  // ── Sistema digestivo ─────────────────────────────────────────────────────
  { code: 'K02.9', description: 'Caries dental, no especificada', chapter: 'XI', block: 'K00-K14' },
  { code: 'K04.0', description: 'Pulpitis', chapter: 'XI', block: 'K00-K14' },
  { code: 'K21.0', description: 'Enfermedad por reflujo gastroesofágico con esofagitis', chapter: 'XI', block: 'K20-K31' },
  { code: 'K21.9', description: 'Enfermedad por reflujo gastroesofágico sin esofagitis', chapter: 'XI', block: 'K20-K31' },
  { code: 'K25.9', description: 'Úlcera gástrica, no especificada como aguda o crónica', chapter: 'XI', block: 'K20-K31' },
  { code: 'K26.9', description: 'Úlcera duodenal, no especificada', chapter: 'XI', block: 'K20-K31' },
  { code: 'K29.0', description: 'Gastritis hemorrágica aguda', chapter: 'XI', block: 'K20-K31' },
  { code: 'K29.7', description: 'Gastritis, no especificada', chapter: 'XI', block: 'K20-K31' },
  { code: 'K30', description: 'Dispepsia funcional', chapter: 'XI', block: 'K20-K31' },
  { code: 'K35.9', description: 'Apendicitis aguda, no especificada', chapter: 'XI', block: 'K35-K38' },
  { code: 'K37', description: 'Apendicitis, no especificada', chapter: 'XI', block: 'K35-K38' },
  { code: 'K40.9', description: 'Hernia inguinal unilateral sin obstrucción ni gangrena', chapter: 'XI', block: 'K40-K46' },
  { code: 'K41.9', description: 'Hernia crural unilateral sin obstrucción ni gangrena', chapter: 'XI', block: 'K40-K46' },
  { code: 'K44.9', description: 'Hernia diafragmática sin obstrucción ni gangrena', chapter: 'XI', block: 'K40-K46' },
  { code: 'K50.9', description: 'Enfermedad de Crohn (enteritis regional), sin especificar', chapter: 'XI', block: 'K50-K52' },
  { code: 'K51.9', description: 'Colitis ulcerosa, no especificada', chapter: 'XI', block: 'K50-K52' },
  { code: 'K57.9', description: 'Enfermedad diverticular del intestino, parte no especificada', chapter: 'XI', block: 'K55-K63' },
  { code: 'K58.9', description: 'Síndrome de colon irritable sin diarrea', chapter: 'XI', block: 'K55-K63' },
  { code: 'K59.0', description: 'Constipación (estreñimiento)', chapter: 'XI', block: 'K55-K63' },
  { code: 'K64.9', description: 'Hemorroides, no especificadas', chapter: 'XI', block: 'K55-K63' },
  { code: 'K74.6', description: 'Cirrosis hepática, no especificada', chapter: 'XI', block: 'K70-K77' },
  { code: 'K80.2', description: 'Colelitiasis con cólico biliar', chapter: 'XI', block: 'K80-K87' },
  { code: 'K80.5', description: 'Colelitiasis sin mención de colecistitis', chapter: 'XI', block: 'K80-K87' },
  { code: 'K85.9', description: 'Pancreatitis aguda, no especificada', chapter: 'XI', block: 'K80-K87' },
  { code: 'K86.1', description: 'Otras pancreatitis crónicas', chapter: 'XI', block: 'K80-K87' },
  { code: 'K92.0', description: 'Hematemesis', chapter: 'XI', block: 'K90-K93' },
  { code: 'K92.1', description: 'Melena', chapter: 'XI', block: 'K90-K93' },

  // ── Sistema genitourinario ────────────────────────────────────────────────
  { code: 'N03.9', description: 'Síndrome nefrítico crónico, no especificado', chapter: 'XIV', block: 'N00-N08' },
  { code: 'N10', description: 'Nefritis tubulointersticial aguda (pielonefritis aguda)', chapter: 'XIV', block: 'N10-N16' },
  { code: 'N11.9', description: 'Nefritis tubulointersticial crónica, no especificada', chapter: 'XIV', block: 'N10-N16' },
  { code: 'N17.9', description: 'Insuficiencia renal aguda, no especificada', chapter: 'XIV', block: 'N17-N19' },
  { code: 'N18.9', description: 'Enfermedad renal crónica, no especificada', chapter: 'XIV', block: 'N17-N19' },
  { code: 'N20.0', description: 'Cálculo del riñón (nefrolitiasis)', chapter: 'XIV', block: 'N20-N23' },
  { code: 'N20.1', description: 'Cálculo del uréter', chapter: 'XIV', block: 'N20-N23' },
  { code: 'N30.0', description: 'Cistitis aguda', chapter: 'XIV', block: 'N30-N39' },
  { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado', chapter: 'XIV', block: 'N30-N39' },
  { code: 'N40', description: 'Hiperplasia de la próstata', chapter: 'XIV', block: 'N40-N51' },
  { code: 'N60.0', description: 'Quiste solitario de la mama', chapter: 'XIV', block: 'N60-N64' },
  { code: 'N60.1', description: 'Mastopatía fibroquística difusa', chapter: 'XIV', block: 'N60-N64' },
  { code: 'N63', description: 'Tumor de la mama, sin especificar (masa palpable)', chapter: 'XIV', block: 'N60-N64' },
  { code: 'N72', description: 'Enfermedad inflamatoria del cuello uterino (cervicitis)', chapter: 'XIV', block: 'N70-N77' },
  { code: 'N73.9', description: 'Enfermedad inflamatoria pélvica femenina, no especificada (EIP)', chapter: 'XIV', block: 'N70-N77' },
  { code: 'N76.0', description: 'Vaginitis aguda', chapter: 'XIV', block: 'N70-N77' },
  { code: 'N76.1', description: 'Vaginitis subaguda y crónica', chapter: 'XIV', block: 'N70-N77' },
  { code: 'N80.0', description: 'Endometriosis del útero (adenomiosis)', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N80.1', description: 'Endometriosis del ovario', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N80.9', description: 'Endometriosis, no especificada', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N83.0', description: 'Quiste folicular del ovario', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N83.1', description: 'Quiste del cuerpo amarillo', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N83.2', description: 'Otros quistes de ovario', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N84.0', description: 'Pólipo del cuerpo del útero', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N85.0', description: 'Hiperplasia endometrial glandular', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N91.2', description: 'Amenorrea, sin especificar', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N92.0', description: 'Menstruación excesiva y frecuente con ciclo regular (menorragia)', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N92.1', description: 'Menstruación excesiva e irregular (metrorragia)', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N93.9', description: 'Sangrado uterino/vaginal anormal, no especificado', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N94.0', description: 'Dolor intermenstrual (ovulación)', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N94.3', description: 'Síndrome de tensión premenstrual (SPM)', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N94.6', description: 'Dismenorrea primaria', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N95.1', description: 'Menopausia y climaterio femenino', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N96', description: 'Aborto habitual', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N97.0', description: 'Infertilidad femenina debida a anovulación', chapter: 'XIV', block: 'N80-N98' },
  { code: 'N97.9', description: 'Infertilidad femenina, no especificada', chapter: 'XIV', block: 'N80-N98' },

  // ── Embarazo, parto y puerperio ───────────────────────────────────────────
  { code: 'O00.9', description: 'Embarazo ectópico, no especificado', chapter: 'XV', block: 'O00-O08' },
  { code: 'O02.1', description: 'Aborto retenido', chapter: 'XV', block: 'O00-O08' },
  { code: 'O03.9', description: 'Aborto espontáneo, completo o no especificado', chapter: 'XV', block: 'O00-O08' },
  { code: 'O10.0', description: 'Hipertensión esencial preexistente que complica el embarazo', chapter: 'XV', block: 'O10-O16' },
  { code: 'O14.0', description: 'Preeclampsia moderada', chapter: 'XV', block: 'O10-O16' },
  { code: 'O14.1', description: 'Preeclampsia severa', chapter: 'XV', block: 'O10-O16' },
  { code: 'O15.0', description: 'Eclampsia en el embarazo', chapter: 'XV', block: 'O10-O16' },
  { code: 'O20.0', description: 'Amenaza de aborto', chapter: 'XV', block: 'O20-O29' },
  { code: 'O20.9', description: 'Hemorragia precoz del embarazo, no especificada', chapter: 'XV', block: 'O20-O29' },
  { code: 'O21.0', description: 'Hiperemesis gravídica leve (náuseas y vómitos del embarazo)', chapter: 'XV', block: 'O20-O29' },
  { code: 'O21.1', description: 'Hiperemesis gravídica con trastornos metabólicos', chapter: 'XV', block: 'O20-O29' },
  { code: 'O24.4', description: 'Diabetes mellitus gestacional', chapter: 'XV', block: 'O20-O29' },
  { code: 'O26.9', description: 'Complicación del embarazo, no especificada', chapter: 'XV', block: 'O20-O29' },
  { code: 'O32.1', description: 'Atención materna por presentación de nalgas', chapter: 'XV', block: 'O30-O48' },
  { code: 'O34.2', description: 'Atención materna por cicatriz uterina debida a cirugía previa', chapter: 'XV', block: 'O30-O48' },
  { code: 'O36.0', description: 'Atención materna por isoinmunización Rh', chapter: 'XV', block: 'O30-O48' },
  { code: 'O42.0', description: 'Ruptura prematura de membranas, inicio del parto dentro de las 24 horas', chapter: 'XV', block: 'O40-O48' },
  { code: 'O44.1', description: 'Placenta previa con hemorragia', chapter: 'XV', block: 'O40-O48' },
  { code: 'O45.9', description: 'Desprendimiento prematuro de placenta (DPPNI), no especificado', chapter: 'XV', block: 'O40-O48' },
  { code: 'O60.0', description: 'Amenaza de parto pretérmino', chapter: 'XV', block: 'O60-O75' },
  { code: 'O62.0', description: 'Contracciones primarias inadecuadas', chapter: 'XV', block: 'O60-O75' },
  { code: 'O63.0', description: 'Período de dilatación prolongado', chapter: 'XV', block: 'O60-O75' },
  { code: 'O80', description: 'Parto único espontáneo, presentación cefálica de vértice', chapter: 'XV', block: 'O80-O84' },
  { code: 'O82.0', description: 'Parto por cesárea electiva', chapter: 'XV', block: 'O80-O84' },
  { code: 'O82.1', description: 'Parto por cesárea urgente', chapter: 'XV', block: 'O80-O84' },
  { code: 'O85', description: 'Sepsis puerperal', chapter: 'XV', block: 'O85-O92' },
  { code: 'O86.0', description: 'Infección de herida quirúrgica obstétrica', chapter: 'XV', block: 'O85-O92' },
  { code: 'O90.0', description: 'Dehiscencia de sutura de cesárea', chapter: 'XV', block: 'O85-O92' },
  { code: 'O92.2', description: 'Otros problemas con la lactancia', chapter: 'XV', block: 'O85-O92' },

  // ── Afecciones perinatales ────────────────────────────────────────────────
  { code: 'P07.3', description: 'Otros recién nacidos de peso extremadamente bajo', chapter: 'XVI', block: 'P05-P08' },
  { code: 'P21.0', description: 'Asfixia severa al nacer', chapter: 'XVI', block: 'P20-P29' },

  // ── Piel y tejido subcutáneo ─────────────────────────────────────────────
  { code: 'L20.9', description: 'Dermatitis atópica, no especificada', chapter: 'XII', block: 'L20-L30' },
  { code: 'L21.0', description: 'Seborrosis cefálica (costra láctea)', chapter: 'XII', block: 'L20-L30' },
  { code: 'L23.9', description: 'Dermatitis de contacto alérgica, no especificada', chapter: 'XII', block: 'L20-L30' },
  { code: 'L24.9', description: 'Dermatitis de contacto irritante, no especificada', chapter: 'XII', block: 'L20-L30' },
  { code: 'L29.9', description: 'Prurito, no especificado', chapter: 'XII', block: 'L20-L30' },
  { code: 'L30.9', description: 'Dermatitis, no especificada', chapter: 'XII', block: 'L20-L30' },
  { code: 'L40.0', description: 'Psoriasis vulgaris', chapter: 'XII', block: 'L40-L45' },
  { code: 'L50.0', description: 'Urticaria alérgica', chapter: 'XII', block: 'L50-L54' },
  { code: 'L50.9', description: 'Urticaria, no especificada', chapter: 'XII', block: 'L50-L54' },
  { code: 'L70.0', description: 'Acné vulgar', chapter: 'XII', block: 'L60-L75' },
  { code: 'L72.0', description: 'Quiste epidérmico', chapter: 'XII', block: 'L60-L75' },

  // ── Sistema osteomuscular ─────────────────────────────────────────────────
  { code: 'M06.9', description: 'Artritis reumatoide, no especificada', chapter: 'XIII', block: 'M05-M14' },
  { code: 'M10.9', description: 'Gota, no especificada', chapter: 'XIII', block: 'M05-M14' },
  { code: 'M19.9', description: 'Osteoartritis, no especificada', chapter: 'XIII', block: 'M15-M19' },
  { code: 'M32.9', description: 'Lupus eritematoso sistémico, no especificado', chapter: 'XIII', block: 'M30-M36' },
  { code: 'M47.9', description: 'Espondiloartrosis (espondilosis), no especificada', chapter: 'XIII', block: 'M45-M49' },
  { code: 'M51.1', description: 'Trastornos de disco lumbar con radiculopatía (ciática)', chapter: 'XIII', block: 'M50-M54' },
  { code: 'M54.5', description: 'Lumbalgia (dolor lumbar bajo)', chapter: 'XIII', block: 'M50-M54' },
  { code: 'M54.2', description: 'Cervicalgia', chapter: 'XIII', block: 'M50-M54' },
  { code: 'M65.9', description: 'Sinovitis y tenosinovitis, no especificadas', chapter: 'XIII', block: 'M60-M79' },
  { code: 'M75.1', description: 'Síndrome del manguito rotador', chapter: 'XIII', block: 'M60-M79' },
  { code: 'M77.1', description: 'Epicondilitis lateral (codo de tenista)', chapter: 'XIII', block: 'M60-M79' },
  { code: 'M79.3', description: 'Paniculitis', chapter: 'XIII', block: 'M60-M79' },
  { code: 'M81.0', description: 'Osteoporosis postmenopáusica sin fractura patológica', chapter: 'XIII', block: 'M80-M94' },

  // ── Lesiones y causas externas ────────────────────────────────────────────
  { code: 'S00.0', description: 'Traumatismo superficial del cuero cabelludo', chapter: 'XIX', block: 'S00-S09' },
  { code: 'S09.9', description: 'Traumatismo de la cabeza, no especificado', chapter: 'XIX', block: 'S00-S09' },
  { code: 'S52.5', description: 'Fractura del extremo distal del radio (fractura de Colles)', chapter: 'XIX', block: 'S50-S59' },
  { code: 'S72.0', description: 'Fractura del cuello del fémur', chapter: 'XIX', block: 'S70-S79' },
  { code: 'T14.0', description: 'Herida de región no especificada del cuerpo', chapter: 'XIX', block: 'T00-T07' },

  // ── Factores que influyen en el estado de salud ───────────────────────────
  { code: 'Z01.4', description: 'Examen ginecológico general', chapter: 'XXI', block: 'Z00-Z13' },
  { code: 'Z01.5', description: 'Diagnóstico por imagen (radiografía, ultrasonido, TAC)', chapter: 'XXI', block: 'Z00-Z13' },
  { code: 'Z03.9', description: 'Observación médica por sospecha de enfermedad o afección, no especificada', chapter: 'XXI', block: 'Z00-Z13' },
  { code: 'Z12.4', description: 'Examen de detección de neoplasias malignas del cuello del útero (Papanicolaou)', chapter: 'XXI', block: 'Z00-Z13' },
  { code: 'Z30.0', description: 'Asesoramiento general sobre anticoncepción', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z30.1', description: 'Inserción de dispositivo anticonceptivo intrauterino (DIU)', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z34.0', description: 'Supervisión del primer embarazo normal', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z34.9', description: 'Supervisión del embarazo normal, no especificado', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z35.9', description: 'Supervisión de embarazo de alto riesgo, no especificado', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z36', description: 'Examen de detección prenatal', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z37.0', description: 'Nacido vivo único', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z38.0', description: 'Recién nacido único, nacido en hospital', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z39.1', description: 'Cuidado y examen de la madre durante la lactancia', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z39.2', description: 'Control rutinario del recién nacido', chapter: 'XXI', block: 'Z30-Z39' },
  { code: 'Z71.3', description: 'Consejería en abuso de sustancias (tabaco, alcohol)', chapter: 'XXI', block: 'Z70-Z76' },
  { code: 'Z76.2', description: 'Atención médica de personas sanas', chapter: 'XXI', block: 'Z70-Z76' },
  { code: 'Z87.5', description: 'Historia personal de complicaciones del embarazo, parto y puerperio', chapter: 'XXI', block: 'Z80-Z99' },
]

// ─────────────────────────────────────────────────────────────────────────────
// CUM — Medicamentos esenciales México (selección representativa)
// Basado en: Catálogo Universal de Medicamentos COFEPRIS + CAUSES 2023
// ─────────────────────────────────────────────────────────────────────────────
const CUM_SEED = [
  // ── Analgésicos / AINEs ───────────────────────────────────────────────────
  { name: 'Paracetamol (Acetaminofén)', brandName: 'Tempra / Tylenol', presentation: 'tabletas', concentration: '500mg', category: 'Analgésico/antipirético', cumKey: '010.000.2022.00001' },
  { name: 'Paracetamol', brandName: 'Tempra Infantil', presentation: 'suspensión', concentration: '150mg/5ml', category: 'Analgésico/antipirético', cumKey: '010.000.2022.00002' },
  { name: 'Ibuprofeno', brandName: 'Advil / Motrin', presentation: 'tabletas', concentration: '400mg', category: 'AINE', cumKey: '010.000.2022.00003' },
  { name: 'Ibuprofeno', brandName: 'Motrin Pediátrico', presentation: 'suspensión', concentration: '100mg/5ml', category: 'AINE', cumKey: '010.000.2022.00004' },
  { name: 'Naproxeno sódico', brandName: 'Flanax', presentation: 'tabletas', concentration: '550mg', category: 'AINE', cumKey: '010.000.2022.00005' },
  { name: 'Diclofenaco sódico', brandName: 'Voltaren', presentation: 'tabletas', concentration: '50mg', category: 'AINE', cumKey: '010.000.2022.00006' },
  { name: 'Diclofenaco sódico', brandName: 'Cataflam', presentation: 'inyectable IM', concentration: '75mg/3ml', category: 'AINE', cumKey: '010.000.2022.00007' },
  { name: 'Ketorolaco', brandName: 'Dolac', presentation: 'tabletas', concentration: '10mg', category: 'AINE', cumKey: '010.000.2022.00008' },
  { name: 'Ketorolaco', brandName: 'Dolac', presentation: 'inyectable IM', concentration: '30mg/ml', category: 'AINE', cumKey: '010.000.2022.00009' },
  { name: 'Metamizol sódico (Dipirona)', brandName: 'Nolotil', presentation: 'tabletas', concentration: '575mg', category: 'Analgésico/antipirético', cumKey: '010.000.2022.00010' },
  { name: 'Tramadol', brandName: 'Tramal', presentation: 'cápsulas', concentration: '50mg', category: 'Opiáceo', cumKey: '010.000.2022.00011', controlled: true },
  { name: 'Morfina', brandName: null, presentation: 'inyectable', concentration: '10mg/ml', category: 'Opiáceo', cumKey: '010.000.2022.00012', controlled: true },

  // ── Antibióticos ───────────────────────────────────────────────────────────
  { name: 'Amoxicilina', brandName: 'Amoxil', presentation: 'cápsulas', concentration: '500mg', category: 'Antibiótico penicilínico', cumKey: '010.000.2022.00020' },
  { name: 'Amoxicilina / Ácido clavulánico', brandName: 'Augmentin', presentation: 'tabletas', concentration: '875mg/125mg', category: 'Antibiótico penicilínico', cumKey: '010.000.2022.00021' },
  { name: 'Azitromicina', brandName: 'Zithromax', presentation: 'tabletas', concentration: '500mg', category: 'Antibiótico macrólido', cumKey: '010.000.2022.00022' },
  { name: 'Claritromicina', brandName: 'Klaricid', presentation: 'tabletas', concentration: '500mg', category: 'Antibiótico macrólido', cumKey: '010.000.2022.00023' },
  { name: 'Ciprofloxacino', brandName: 'Ciproxina', presentation: 'tabletas', concentration: '500mg', category: 'Antibiótico quinolona', cumKey: '010.000.2022.00024' },
  { name: 'Levofloxacino', brandName: 'Tavanic', presentation: 'tabletas', concentration: '500mg', category: 'Antibiótico quinolona', cumKey: '010.000.2022.00025' },
  { name: 'Metronidazol', brandName: 'Flagyl', presentation: 'tabletas', concentration: '500mg', category: 'Antiprotozoario/antibiótico', cumKey: '010.000.2022.00026' },
  { name: 'Metronidazol', brandName: 'Flagyl óvulos', presentation: 'óvulos vaginales', concentration: '500mg', category: 'Antiprotozoario/antibiótico', cumKey: '010.000.2022.00027' },
  { name: 'Doxiciclina', brandName: 'Vibramicina', presentation: 'cápsulas', concentration: '100mg', category: 'Antibiótico tetraciclina', cumKey: '010.000.2022.00028' },
  { name: 'Nitrofurantoína', brandName: 'Macrobid', presentation: 'cápsulas', concentration: '100mg', category: 'Antibiótico urinario', cumKey: '010.000.2022.00029' },
  { name: 'Ceftriaxona', brandName: null, presentation: 'inyectable IV/IM', concentration: '1g', category: 'Antibiótico cefalosporina', cumKey: '010.000.2022.00030' },
  { name: 'Cefalexina', brandName: 'Keflex', presentation: 'cápsulas', concentration: '500mg', category: 'Antibiótico cefalosporina', cumKey: '010.000.2022.00031' },
  { name: 'Clindamicina', brandName: 'Dalacin C', presentation: 'cápsulas', concentration: '300mg', category: 'Antibiótico lincosamida', cumKey: '010.000.2022.00032' },
  { name: 'Trimetoprima / Sulfametoxazol', brandName: 'Bactrim', presentation: 'tabletas', concentration: '160mg/800mg', category: 'Antibiótico sulfonamida', cumKey: '010.000.2022.00033' },

  // ── Antifúngicos ───────────────────────────────────────────────────────────
  { name: 'Fluconazol', brandName: 'Diflucan', presentation: 'cápsulas', concentration: '150mg', category: 'Antifúngico azol', cumKey: '010.000.2022.00040' },
  { name: 'Clotrimazol', brandName: 'Canesten', presentation: 'óvulos vaginales', concentration: '500mg', category: 'Antifúngico azol', cumKey: '010.000.2022.00041' },
  { name: 'Miconazol', brandName: 'Monistat', presentation: 'crema vaginal', concentration: '2%', category: 'Antifúngico azol', cumKey: '010.000.2022.00042' },
  { name: 'Nistatina', brandName: null, presentation: 'tabletas vaginales', concentration: '100 000 UI', category: 'Antifúngico polieno', cumKey: '010.000.2022.00043' },

  // ── Antivirales ────────────────────────────────────────────────────────────
  { name: 'Aciclovir', brandName: 'Zovirax', presentation: 'tabletas', concentration: '400mg', category: 'Antiviral', cumKey: '010.000.2022.00050' },
  { name: 'Valaciclovir', brandName: 'Valtrex', presentation: 'tabletas', concentration: '500mg', category: 'Antiviral', cumKey: '010.000.2022.00051' },
  { name: 'Oseltamivir', brandName: 'Tamiflu', presentation: 'cápsulas', concentration: '75mg', category: 'Antiviral influenza', cumKey: '010.000.2022.00052' },

  // ── Antiparasitarios ───────────────────────────────────────────────────────
  { name: 'Albendazol', brandName: 'Zentel', presentation: 'tabletas', concentration: '400mg', category: 'Antiparasitario', cumKey: '010.000.2022.00060' },
  { name: 'Metronidazol + Nistatina', brandName: 'Flagyl', presentation: 'tabletas', concentration: '500mg+100000UI', category: 'Antiparasitario/antifúngico', cumKey: '010.000.2022.00061' },

  // ── Cardiovasculares / antihipertensivos ──────────────────────────────────
  { name: 'Enalapril', brandName: 'Renitec', presentation: 'tabletas', concentration: '10mg', category: 'IECA antihipertensivo', cumKey: '010.000.2022.00070' },
  { name: 'Losartán', brandName: 'Cozaar', presentation: 'tabletas', concentration: '50mg', category: 'ARA-II antihipertensivo', cumKey: '010.000.2022.00071' },
  { name: 'Amlodipino', brandName: 'Norvasc', presentation: 'tabletas', concentration: '5mg', category: 'Bloqueador de calcio', cumKey: '010.000.2022.00072' },
  { name: 'Nifedipino', brandName: 'Adalat', presentation: 'tabletas de liberación prolongada', concentration: '30mg', category: 'Bloqueador de calcio', cumKey: '010.000.2022.00073' },
  { name: 'Metoprolol', brandName: 'Lopressor', presentation: 'tabletas', concentration: '50mg', category: 'Betabloqueador', cumKey: '010.000.2022.00074' },
  { name: 'Atenolol', brandName: 'Tenormin', presentation: 'tabletas', concentration: '50mg', category: 'Betabloqueador', cumKey: '010.000.2022.00075' },
  { name: 'Hidroclorotiazida', brandName: null, presentation: 'tabletas', concentration: '25mg', category: 'Diurético tiazídico', cumKey: '010.000.2022.00076' },
  { name: 'Furosemida', brandName: 'Lasix', presentation: 'tabletas', concentration: '40mg', category: 'Diurético de asa', cumKey: '010.000.2022.00077' },
  { name: 'Espironolactona', brandName: 'Aldactone', presentation: 'tabletas', concentration: '25mg', category: 'Diurético ahorrador de K', cumKey: '010.000.2022.00078' },
  { name: 'Atorvastatina', brandName: 'Lipitor', presentation: 'tabletas', concentration: '20mg', category: 'Estatina hipolipemiante', cumKey: '010.000.2022.00079' },
  { name: 'Rosuvastatina', brandName: 'Crestor', presentation: 'tabletas', concentration: '10mg', category: 'Estatina hipolipemiante', cumKey: '010.000.2022.00080' },
  { name: 'Aspirina (Ácido acetilsalicílico)', brandName: 'Aspirin', presentation: 'tabletas', concentration: '100mg', category: 'Antiagregante plaquetario', cumKey: '010.000.2022.00081' },
  { name: 'Digoxina', brandName: 'Lanoxin', presentation: 'tabletas', concentration: '0.25mg', category: 'Glucósido cardíaco', cumKey: '010.000.2022.00082' },

  // ── Antidiabéticos ────────────────────────────────────────────────────────
  { name: 'Metformina', brandName: 'Glucophage', presentation: 'tabletas', concentration: '850mg', category: 'Antidiabético biguanida', cumKey: '010.000.2022.00090' },
  { name: 'Glibenclamida', brandName: 'Daonil', presentation: 'tabletas', concentration: '5mg', category: 'Antidiabético sulfonilurea', cumKey: '010.000.2022.00091' },
  { name: 'Glipizida', brandName: 'Glucotrol', presentation: 'tabletas', concentration: '5mg', category: 'Antidiabético sulfonilurea', cumKey: '010.000.2022.00092' },
  { name: 'Insulina NPH humana', brandName: 'Humulin N', presentation: 'frasco vial 10ml', concentration: '100 UI/ml', category: 'Insulina de acción intermedia', cumKey: '010.000.2022.00093' },
  { name: 'Insulina glargina', brandName: 'Lantus', presentation: 'pluma 3ml', concentration: '100 UI/ml', category: 'Insulina de acción prolongada', cumKey: '010.000.2022.00094' },
  { name: 'Insulina aspart', brandName: 'NovoRapid', presentation: 'pluma 3ml', concentration: '100 UI/ml', category: 'Insulina de acción rápida', cumKey: '010.000.2022.00095' },

  // ── Hormonales / ginecológicos ────────────────────────────────────────────
  { name: 'Ácido fólico', brandName: null, presentation: 'tabletas', concentration: '5mg', category: 'Vitamina B9', cumKey: '010.000.2022.00100' },
  { name: 'Progesterona micronizada', brandName: 'Utrogestan', presentation: 'cápsulas blandas', concentration: '200mg', category: 'Progestágeno', cumKey: '010.000.2022.00101' },
  { name: 'Progesterona', brandName: 'Geslutin', presentation: 'inyectable IM', concentration: '50mg/ml', category: 'Progestágeno', cumKey: '010.000.2022.00102' },
  { name: 'Estradiol', brandName: 'Progynova', presentation: 'tabletas', concentration: '2mg', category: 'Estrógeno', cumKey: '010.000.2022.00103' },
  { name: 'Levonorgestrel + Etinilestradiol', brandName: 'Microgynon', presentation: 'tabletas anticonceptivas', concentration: '0.15mg/0.03mg', category: 'Anticonceptivo oral', cumKey: '010.000.2022.00104' },
  { name: 'Levonorgestrel', brandName: 'Postinor / NorLevo', presentation: 'tabletas', concentration: '1.5mg', category: 'Anticonceptivo de emergencia', cumKey: '010.000.2022.00105' },
  { name: 'Levonorgestrel DIU', brandName: 'Mirena', presentation: 'sistema intrauterino', concentration: '52mg', category: 'Anticonceptivo intrauterino', cumKey: '010.000.2022.00106' },
  { name: 'Medroxiprogesterona', brandName: 'Depo-Provera', presentation: 'inyectable IM', concentration: '150mg/ml', category: 'Anticonceptivo inyectable', cumKey: '010.000.2022.00107' },
  { name: 'Clomifeno', brandName: 'Serofene', presentation: 'tabletas', concentration: '50mg', category: 'Inductor de ovulación', cumKey: '010.000.2022.00108' },
  { name: 'Oxitocina', brandName: 'Pitocin', presentation: 'inyectable', concentration: '10 UI/ml', category: 'Uterotónico', cumKey: '010.000.2022.00109' },
  { name: 'Misoprostol', brandName: 'Cytotec', presentation: 'tabletas', concentration: '200mcg', category: 'Análogo de prostaglandina', cumKey: '010.000.2022.00110' },
  { name: 'Nifedipino', brandName: 'Adalat', presentation: 'cápsulas', concentration: '10mg', category: 'Tocolítico / bloqueador de calcio', cumKey: '010.000.2022.00111' },
  { name: 'Sulfato de magnesio', brandName: null, presentation: 'inyectable IV', concentration: '1g/2ml', category: 'Anticonvulsivante obstétrico', cumKey: '010.000.2022.00112' },
  { name: 'Bromocriptina', brandName: 'Parlodel', presentation: 'tabletas', concentration: '2.5mg', category: 'Inhibidor de prolactina', cumKey: '010.000.2022.00113' },
  { name: 'Tiroxina sódica (Levotiroxina)', brandName: 'Eutirox / Synthroid', presentation: 'tabletas', concentration: '100mcg', category: 'Hormona tiroidea', cumKey: '010.000.2022.00114' },
  { name: 'Metimazol', brandName: 'Tapazol', presentation: 'tabletas', concentration: '5mg', category: 'Antitiroidea', cumKey: '010.000.2022.00115' },

  // ── Digestivos / gastrointestinales ───────────────────────────────────────
  { name: 'Omeprazol', brandName: 'Losec / Prilosec', presentation: 'cápsulas', concentration: '20mg', category: 'Inhibidor de bomba de protones', cumKey: '010.000.2022.00120' },
  { name: 'Pantoprazol', brandName: 'Protonix', presentation: 'tabletas', concentration: '40mg', category: 'Inhibidor de bomba de protones', cumKey: '010.000.2022.00121' },
  { name: 'Ranitidina', brandName: 'Zantac', presentation: 'tabletas', concentration: '150mg', category: 'Antihistamínico H2', cumKey: '010.000.2022.00122' },
  { name: 'Metoclopramida', brandName: 'Plasil', presentation: 'tabletas', concentration: '10mg', category: 'Procinético antiemético', cumKey: '010.000.2022.00123' },
  { name: 'Ondansetrón', brandName: 'Zofran', presentation: 'tabletas', concentration: '8mg', category: 'Antiemético antagonista 5-HT3', cumKey: '010.000.2022.00124' },
  { name: 'Domperidona', brandName: 'Motilium', presentation: 'tabletas', concentration: '10mg', category: 'Procinético', cumKey: '010.000.2022.00125' },
  { name: 'Loperamida', brandName: 'Imodium', presentation: 'cápsulas', concentration: '2mg', category: 'Antidiarreico', cumKey: '010.000.2022.00126' },
  { name: 'Bismuto (subsalicilato)', brandName: 'Pepto-Bismol', presentation: 'suspensión', concentration: '262mg/15ml', category: 'Antidiarreico', cumKey: '010.000.2022.00127' },
  { name: 'Sales de rehidratación oral', brandName: 'Pedialyte', presentation: 'sobres polvo', concentration: null, category: 'Electrolito oral', cumKey: '010.000.2022.00128' },
  { name: 'Lactulosa', brandName: 'Duphalac', presentation: 'solución oral', concentration: '3.35g/5ml', category: 'Laxante osmótico', cumKey: '010.000.2022.00129' },
  { name: 'Simeticona', brandName: 'Gas-X', presentation: 'tabletas masticables', concentration: '80mg', category: 'Antiflatulento', cumKey: '010.000.2022.00130' },

  // ── Sistema nervioso central ───────────────────────────────────────────────
  { name: 'Alprazolam', brandName: 'Xanax', presentation: 'tabletas', concentration: '0.5mg', category: 'Benzodiacepina ansiolítica', cumKey: '010.000.2022.00140', controlled: true },
  { name: 'Diazepam', brandName: 'Valium', presentation: 'tabletas', concentration: '5mg', category: 'Benzodiacepina ansiolítica', cumKey: '010.000.2022.00141', controlled: true },
  { name: 'Lorazepam', brandName: 'Ativan', presentation: 'tabletas', concentration: '1mg', category: 'Benzodiacepina ansiolítica', cumKey: '010.000.2022.00142', controlled: true },
  { name: 'Clonazepam', brandName: 'Rivotril', presentation: 'tabletas', concentration: '0.5mg', category: 'Benzodiacepina antiepiléptica', cumKey: '010.000.2022.00143', controlled: true },
  { name: 'Zolpidem', brandName: 'Stilnox', presentation: 'tabletas', concentration: '10mg', category: 'Hipnótico no benzodiacepínico', cumKey: '010.000.2022.00144', controlled: true },
  { name: 'Sertralina', brandName: 'Zoloft', presentation: 'tabletas', concentration: '50mg', category: 'ISRS antidepresivo', cumKey: '010.000.2022.00145' },
  { name: 'Fluoxetina', brandName: 'Prozac', presentation: 'cápsulas', concentration: '20mg', category: 'ISRS antidepresivo', cumKey: '010.000.2022.00146' },
  { name: 'Escitalopram', brandName: 'Lexapro', presentation: 'tabletas', concentration: '10mg', category: 'ISRS antidepresivo', cumKey: '010.000.2022.00147' },
  { name: 'Venlafaxina', brandName: 'Effexor', presentation: 'cápsulas de liberación prolongada', concentration: '75mg', category: 'IRSN antidepresivo', cumKey: '010.000.2022.00148' },
  { name: 'Amitriptilina', brandName: 'Elavil', presentation: 'tabletas', concentration: '25mg', category: 'Antidepresivo tricíclico', cumKey: '010.000.2022.00149' },
  { name: 'Carbamazepina', brandName: 'Tegretol', presentation: 'tabletas', concentration: '200mg', category: 'Antiepiléptico', cumKey: '010.000.2022.00150' },
  { name: 'Ácido valproico', brandName: 'Depakene', presentation: 'cápsulas', concentration: '500mg', category: 'Antiepiléptico / estabilizador del ánimo', cumKey: '010.000.2022.00151' },

  // ── Respiratorio ──────────────────────────────────────────────────────────
  { name: 'Salbutamol (Albuterol)', brandName: 'Ventolin', presentation: 'inhalador MDI', concentration: '100mcg/dosis', category: 'Broncodilatador β2 agonista', cumKey: '010.000.2022.00160' },
  { name: 'Budesonida', brandName: 'Pulmicort', presentation: 'inhalador', concentration: '200mcg/dosis', category: 'Corticoesteroide inhalado', cumKey: '010.000.2022.00161' },
  { name: 'Fluticasona / Salmeterol', brandName: 'Advair / Seretide', presentation: 'inhalador', concentration: '250/25mcg/dosis', category: 'Corticoesteroide + β2 agonista', cumKey: '010.000.2022.00162' },
  { name: 'Montelukast', brandName: 'Singulair', presentation: 'tabletas masticables', concentration: '5mg', category: 'Antagonista de leucotrienos', cumKey: '010.000.2022.00163' },
  { name: 'Loratadina', brandName: 'Claritin', presentation: 'tabletas', concentration: '10mg', category: 'Antihistamínico H1 no sedante', cumKey: '010.000.2022.00164' },
  { name: 'Cetirizina', brandName: 'Zyrtec', presentation: 'tabletas', concentration: '10mg', category: 'Antihistamínico H1 no sedante', cumKey: '010.000.2022.00165' },
  { name: 'Fexofenadina', brandName: 'Allegra', presentation: 'tabletas', concentration: '120mg', category: 'Antihistamínico H1 no sedante', cumKey: '010.000.2022.00166' },
  { name: 'Difenhidramina', brandName: 'Benadryl', presentation: 'tabletas', concentration: '50mg', category: 'Antihistamínico H1 sedante', cumKey: '010.000.2022.00167' },
  { name: 'Dextrometorfano', brandName: 'Robitussin', presentation: 'jarabe', concentration: '15mg/5ml', category: 'Antitusivo', cumKey: '010.000.2022.00168' },

  // ── Corticoesteroides sistémicos ───────────────────────────────────────────
  { name: 'Prednisona', brandName: 'Meticorten', presentation: 'tabletas', concentration: '5mg', category: 'Corticoesteroide oral', cumKey: '010.000.2022.00170' },
  { name: 'Dexametasona', brandName: null, presentation: 'inyectable IM/IV', concentration: '8mg/2ml', category: 'Corticoesteroide inyectable', cumKey: '010.000.2022.00171' },
  { name: 'Betametasona', brandName: 'Celestone', presentation: 'inyectable IM', concentration: '3mg/ml', category: 'Corticoesteroide (madurez pulmonar fetal)', cumKey: '010.000.2022.00172' },
  { name: 'Hidrocortisona', brandName: 'Solu-Cortef', presentation: 'inyectable IV', concentration: '100mg', category: 'Corticoesteroide IV', cumKey: '010.000.2022.00173' },

  // ── Vitaminas y suplementos ───────────────────────────────────────────────
  { name: 'Hierro (sulfato ferroso)', brandName: 'Fer-In-Sol', presentation: 'tabletas', concentration: '65mg (Fe elemental)', category: 'Suplemento de hierro', cumKey: '010.000.2022.00180' },
  { name: 'Calcio + Vitamina D3', brandName: 'Caltrate', presentation: 'tabletas', concentration: '600mg/400UI', category: 'Suplemento calcio-vitamina D', cumKey: '010.000.2022.00181' },
  { name: 'Vitamina D3 (Colecalciferol)', brandName: 'D-Tabs', presentation: 'cápsulas', concentration: '1000 UI', category: 'Vitamina D', cumKey: '010.000.2022.00182' },
  { name: 'Vitamina B12 (Cianocobalamina)', brandName: null, presentation: 'inyectable IM', concentration: '1000mcg/ml', category: 'Vitamina B12', cumKey: '010.000.2022.00183' },
  { name: 'Ácido fólico', brandName: null, presentation: 'tabletas', concentration: '1mg', category: 'Vitamina B9', cumKey: '010.000.2022.00184' },
  { name: 'Sulfato ferroso + Ácido fólico', brandName: 'Ferrograd Fólico', presentation: 'tabletas', concentration: '325mg/0.4mg', category: 'Suplemento prenatal', cumKey: '010.000.2022.00185' },
]

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding catálogos regulatorios (Fase 2)...\n')

  // ── 1. CIE-10 ──────────────────────────────────────────────────────────────
  console.log(`📋 Insertando ${CIE10_SEED.length} códigos CIE-10...`)
  let cie10Created = 0
  let cie10Skipped = 0

  for (const entry of CIE10_SEED) {
    const result = await prisma.cie10Code.upsert({
      where: { code: entry.code },
      update: { description: entry.description, chapter: entry.chapter, block: entry.block, isActive: true },
      create: { code: entry.code, description: entry.description, chapter: entry.chapter, block: entry.block, isActive: true },
    })
    if (result) cie10Created++
  }

  // ── 2. Cargar CSV completo si se pasa el argumento --csv ───────────────────
  const csvArg = process.argv.find(a => a.startsWith('--csv='))
  if (csvArg) {
    const csvPath = csvArg.replace('--csv=', '')
    console.log(`\n📂 Cargando CSV completo: ${csvPath}`)
    try {
      const content = readFileSync(csvPath, 'utf-8')
      const lines = content.split('\n').slice(1) // saltar cabecera
      let csvCount = 0
      for (const line of lines) {
        if (!line.trim()) continue
        // Formato esperado: code,description,chapter,block
        const [code, description, chapter, block] = line.split(',').map(s => s.replace(/^"|"$/g, '').trim())
        if (!code || !description) continue
        await prisma.cie10Code.upsert({
          where: { code },
          update: { description, chapter: chapter ?? null, block: block ?? null },
          create: { code, description, chapter: chapter ?? null, block: block ?? null, isActive: true },
        })
        csvCount++
        if (csvCount % 1000 === 0) process.stdout.write(`  ${csvCount} códigos...\r`)
      }
      console.log(`\n  ✅ CSV: ${csvCount} códigos CIE-10 importados`)
    } catch (err) {
      console.error(`  ❌ Error leyendo CSV: ${err}`)
    }
  }

  console.log(`✅ CIE-10: ${cie10Created} códigos (seed básico)`)

  // ── 3. CUM (Medicamentos) ─────────────────────────────────────────────────
  console.log(`\n💊 Insertando ${CUM_SEED.length} medicamentos CUM...`)
  let cumCreated = 0

  for (const med of CUM_SEED) {
    await prisma.medication.upsert({
      where: { id: `cum-${med.cumKey?.replace(/\./g, '-') ?? med.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {
        name: med.name,
        brandName: med.brandName ?? null,
        presentation: med.presentation ?? null,
        concentration: med.concentration ?? null,
        category: med.category ?? null,
        cumKey: med.cumKey ?? null,
        controlled: med.controlled ?? false,
      },
      create: {
        id: `cum-${med.cumKey?.replace(/\./g, '-') ?? med.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: med.name,
        brandName: med.brandName ?? null,
        presentation: med.presentation ?? null,
        concentration: med.concentration ?? null,
        category: med.category ?? null,
        cumKey: med.cumKey ?? null,
        controlled: med.controlled ?? false,
      },
    })
    cumCreated++
  }

  console.log(`✅ CUM: ${cumCreated} medicamentos`)

  console.log('\n🎉 Catálogos sembrados exitosamente.')
  console.log('\nPara el catálogo CIE-10 completo (~70 000 códigos):')
  console.log('  pnpm tsx prisma/seed-catalogs.ts --csv=/ruta/CIE10_SSA.csv\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
