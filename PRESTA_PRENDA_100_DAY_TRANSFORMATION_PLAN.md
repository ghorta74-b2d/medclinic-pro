# PRESTA PRENDA — PLAN DE TRANSFORMACIÓN DE 100 DÍAS
## Negocio de Oro y Joyería

> **Documento ejecutivo para el Consejo de Administración**
> Fecha: 2026-07-10 · Versión 1.0
> Fuente primaria: `PRESTA_PRENDA_2026_MASTER_KNOWLEDGE_BASE.md` (v0.1) + benchmark de industria
>
> ⚠️ **Nota metodológica:** la base de conocimiento disponible es preliminar (v0.1, sin datos de Excel).
> Todas las cifras económicas de este plan son **estimaciones modeladas con supuestos explícitos**
> (ver §10 Business Case) y se validan en la Fase 1 del roadmap (Día 1–30). Lo que el documento
> afirma como hecho proviene de la base de conocimiento o de fuentes públicas de industria.

---

# 1. Executive Brief para CEO

## Situación actual

Presta Prenda opera uno de los negocios prendarios más relevantes de México, con el oro y la joyería
como colateral estratégico. El negocio es estructuralmente rentable —intereses, renovaciones y venta
de inventario adjudicado— pero opera con un modelo **artesanal en su núcleo: la valuación depende del
criterio individual del valuador**, con variabilidad de criterios entre sucursales, procesos manuales
y datos fragmentados (la propia base de conocimiento lo reconoce como fricción principal).

El contexto de mercado es excepcionalmente favorable: **el oro cotiza en máximos históricos**
(~US$4,000/oz a inicios de 2026, +~50% vs. 2024). Cada gramo de colateral en bóveda y cada gramo que
entra por la puerta vale más que nunca. Esta ventana no durará indefinidamente: es el momento de
capturar colocación, corregir el pricing y blindar la valuación.

## Dónde se destruye valor hoy

1. **Dispersión de valuación.** Dos valuadores frente a la misma pieza producen avalúos distintos.
   La subvaluación regala margen al competidor de enfrente (el cliente compara ofertas en minutos);
   la sobrevaluación convierte préstamos en pérdidas al adjudicar.
2. **Pricing estático frente a un subyacente volátil.** Si las tablas de avalúo no siguen el precio
   spot del oro con frecuencia diaria, en un mercado que subió ~50% en 18 meses el negocio presta
   sistemáticamente por debajo del valor real del colateral (pierde clientes) o vende inventario
   adjudicado a precios viejos (pierde margen).
3. **Fraude y error humano.** Piezas bañadas, aleaciones adulteradas, piedras sintéticas: cada error
   de autenticación es pérdida directa del 100% del capital prestado.
4. **Renovaciones reactivas.** La renovación es el ingreso más barato del negocio (cliente ya
   adquirido, colateral ya en bóveda) y hoy depende de que el cliente se acuerde de venir.
5. **Datos ciegos.** Sin lago de datos ni KPIs gobernados (pregunta abierta explícita en la KB:
   "¿qué KPIs gobiernan la operación?"), la dirección administra por retrovisor.

## Qué puede cambiarse en 100 días

No se puede reescribir el core ni desplegar visión computacional a escala nacional en 100 días.
**Sí se puede:** (a) centralizar y gobernar el pricing de oro con actualización diaria; (b) capturar
digitalmente cada valuación (foto + peso + kilataje + decisión) para crear el activo de datos que
habilita toda la IA posterior; (c) pilotar el asistente de valuación con IA en 10–20 sucursales;
(d) automatizar el recordatorio de renovación por WhatsApp; (e) instalar el tablero de KPIs y el
gobierno operativo que hace visible todo lo anterior.

## Impacto económico estimado (escenario base, ver §10)

Por cada **$1,000 M MXN de cartera prendaria de oro**, el plan modela un beneficio anualizado de
**~$68–95 M MXN** (mejor pricing +1.5–2.5 pp de margen, renovaciones +4–6 pp, merma por fraude/error
−30–40%), con inversión de 100 días de **$18–28 M MXN** y payback < 6 meses.

## 10 hallazgos críticos

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | La valuación es el proceso más crítico y el menos estandarizado | KB §5–6: "dependencia humana, variabilidad de criterios" |
| 2 | No existe motor centralizado de pricing; es insight P0 de la propia organización | KB §12: "Motor centralizado de valuación / Gobierno de pricing" como P0 |
| 3 | El dato de cada valuación se pierde: no hay captura digital estructurada | KB §12: "Captura digital" como P0 |
| 4 | Fraude y sobre/subvaluación son riesgos Alto/Alto simultáneamente | KB §10, matriz de riesgos |
| 5 | El precio del oro en máximos históricos amplifica cada error de pricing (a favor y en contra) | Mercado: XAU ~US$4,000/oz |
| 6 | No hay KPIs gobernados: la pregunta "¿qué KPIs gobiernan la operación?" sigue abierta | KB §14 |
| 7 | El conocimiento de valuación vive en un PDF de capacitación ("El Imbatible") y en cabezas, no en sistemas | KB §1: DOC-006 |
| 8 | La renovación —el ingreso de mayor margen— no está automatizada | KB §12: P1 "Automatización de renovaciones" |
| 9 | Riesgo regulatorio activo (UIF/AML/SAT): el empeño de oro es actividad vulnerable ante la UIF | KB §11 |
| 10 | La competencia (FirstCash, Monte de Piedad) invierte en digital; la ventaja de escala no protege sola | Benchmark §8 |

## 10 quick wins (ejecutables en < 60 días)

1. **Precio spot diario en tabla de avalúos** — feed XAU/MXN → tabla de préstamo por kilataje publicada cada mañana a toda la red.
2. **Piso y techo de avalúo por gramo-kilataje** — bandas duras en el sistema; fuera de banda requiere autorización.
3. **Foto obligatoria de cada prenda al capturar** — inicia el dataset de visión computacional desde el día 1.
4. **Recordatorio de renovación por WhatsApp (T-7, T-3, T-0)** — plantillas aprobadas, sin desarrollo pesado.
5. **Tablero diario de colocación/renovación/adjudicación por sucursal** — aunque sea sobre extractos, visibilidad inmediata.
6. **Doble verificación aleatoria de avalúos (muestreo 5%)** — control antifraude inmediato con reporte semanal.
7. **Re-precio del inventario adjudicado a spot actual** — el oro en vitrina comprado a precios 2024 está subvaluado hoy.
8. **Guía rápida de autenticación estandarizada** (destilada de "El Imbatible") en cada mostrador + checklist digital.
9. **Alerta de desviación de valuación** — reporte que compara avalúo/gramo de cada valuador vs. mediana de la red.
10. **Campaña "tu oro vale más que nunca"** — marketing que capitaliza el máximo histórico del oro para atraer colocación.

## 5 apuestas estratégicas

1. **Motor de Valuación Centralizado (MVC):** una sola fuente de verdad de pricing —spot, kilataje, condición, demanda— consumida por todas las sucursales vía API. *La* palanca estructural.
2. **Captura Digital Universal + Data Lake prendario:** cada operación genera foto(s), peso, kilataje medido, decisión y resultado (desempeño/renovación/adjudicación/venta). Es el activo que ninguna casa de empeño mexicana tiene hoy.
3. **Copiloto del Valuador (IA):** asistente en sucursal (visión + RAG sobre manuales) que sugiere kilataje probable, detecta señales de fraude y estima valor comercial. Aumenta al valuador, no lo reemplaza.
4. **Cotizador digital para clientes:** "sube una foto, te decimos cuánto te prestamos" — captación de demanda digital con cita en sucursal. Nadie lo hace bien en México.
5. **Pricing dinámico de inventario y préstamo:** margen y LTV ajustados por pieza, demanda local y ciclo del oro, en lugar de tablas únicas nacionales.

---

# 2. Diagnóstico Estratégico

## 2.1 Mercado

**Tamaño y estructura (México).**
- El mercado prendario mexicano es masivo y fragmentado: miles de casas de empeño registradas ante
  PROFECO, con dos anclas de escala —Nacional Monte de Piedad (institución de asistencia privada,
  cientos de sucursales) y FirstCash (líder comercial, >1,000 puntos en México)— y una larga cola de
  operadores regionales.
- El empeño es crédito de primera necesidad para hogares sin acceso bancario pleno; el oro es el
  colateral dominante (alta densidad de valor, liquidez inmediata, mercado secundario profundo).
- **Estimación a validar en Fase 1:** colocación anual del segmento oro/joyería en decenas de miles
  de millones de MXN; ticket promedio $2,000–5,000 MXN; tasa de desempeño (recuperación de la prenda)
  75–85%.

**Tendencias.**
- Oro en máximos históricos → más valor por gramo, clientes con más capacidad de préstamo, pero
  también más incentivo al fraude (falsificaciones más rentables) y más sensibilidad competitiva al
  avalúo ofrecido.
- Digitalización incipiente del sector: cotizadores en línea básicos, pero ninguna experiencia
  end-to-end digital consolidada en México → espacio abierto.
- Presión regulatoria creciente: el mutuo con garantía prendaria de metales es actividad vulnerable
  (Ley Antilavado/UIF), con obligaciones de identificación y avisos.

**Competencia y disrupciones.**
- FirstCash: escala, disciplina operativa, sistemas propietarios de pricing de inventario.
- Nacional Monte de Piedad: confianza de marca centenaria, tasas bajas, proceso de modernización.
- Fintechs de crédito digital: no compiten por el colateral pero sí por el cliente y su necesidad
  de liquidez inmediata.
- Compradores de oro (scrap) y luxury resale: compiten por la misma pieza con propuesta de venta
  en lugar de empeño.

## 2.2 Producto

**Fortalezas:** colateral líquido y en apreciación; ingreso recurrente por renovaciones; journey
conocido por el cliente; red física como barrera de entrada.

**Debilidades y fricciones (KB §5–6):**
- Valuación dependiente del humano, con variabilidad de criterios entre sucursales.
- Proceso presencial de principio a fin: el cliente no sabe cuánto le prestarán hasta viajar a la
  sucursal → fricción de descubrimiento que pierde demanda.
- Sin diferenciación de precio por calidad de pieza (manufactura, marca, demanda comercial): un
  gramo de 14k "vale lo mismo" sea cadena rota o pieza de marca vendible con prima.

## 2.3 Operación

**Cuellos de botella (síntoma → causa raíz):**

| Síntoma | Causa raíz |
|---|---|
| Avalúos inconsistentes entre sucursales | No hay tabla central viva ni bandas obligatorias; capacitación estática en PDF |
| Tiempo de valuación alto en horas pico | Proceso 100% secuencial en una persona; sin pre-cotización digital |
| Merma por fraude detectada tarde | Autenticación depende de pericia individual; sin doble verificación sistemática ni analítica de desviaciones |
| Renovaciones perdidas | Proceso reactivo; el sistema no dispara contacto proactivo |
| Inventario adjudicado rota lento | Precio de venta fijado al adjudicar, no re-preciado a mercado; sin visibilidad de demanda por plaza |

## 2.4 Tecnología

- Sistemas legacy de punto de venta prendario; integraciones limitadas (KB §7 lista "integraciones,
  analítica, gobierno de datos, automatización" como *necesidades*, es decir, hoy no existen).
- **Implicación de diseño:** toda iniciativa de los primeros 100 días debe ser *sidecar* —convivir
  con el core vía API/exportaciones— y no requerir cirugía del sistema central. Reemplazar el core
  no es alcanzable ni deseable en 100 días.

## 2.5 Datos

- No hay lago de datos (es P0 en el propio backlog de la KB). Los datos existen en silos: sistema
  prendario, Excel de seguimiento (excluidos de la KB), PDFs de inventario y proyecciones.
- **El dato más valioso no se captura:** imagen de la pieza + medición objetiva + resultado del
  contrato. Sin él, no hay visión computacional ni pricing predictivo posibles. Por eso la captura
  digital es prerequisito, no iniciativa opcional.

## 2.6 Organización

- Conocimiento crítico concentrado en valuadores expertos → riesgo de rotación y cuello de botella
  de capacitación (el programa "El Imbatible" existe precisamente porque el conocimiento es escaso).
- Riesgo cultural: los valuadores pueden percibir la IA y las bandas de pricing como desconfianza o
  amenaza. **Mitigación de diseño:** todo se comunica y construye como *asistencia* (copiloto,
  protección contra fraude, bono por precisión), nunca como sustitución ni vigilancia punitiva.
- Capacidades faltantes: ingeniería de datos, producto digital, ciencia de datos aplicada. Se
  resuelven con un equipo pequeño y senior (ver §9), no con contrataciones masivas.

---

# 3. North Star del Producto

## Visión a 3 años

> **"Cualquier persona en México puede saber en minutos —desde su teléfono o en cualquier
> sucursal— cuánto vale su oro y recibir el préstamo justo, con la valuación más precisa,
> rápida y confiable del mercado, respaldada por la mayor base de datos de joyería del país."**

## North Star Metric

**Margen bruto prendario por gramo de oro gestionado** (MXN/g/año).

Integra todo: precisión de valuación (menos merma), pricing (más margen), renovaciones (más ingreso
por el mismo gramo), velocidad (más gramos por sucursal) y recuperación de inventario. Es difícil de
inflar con volumen no rentable.

## KPIs principales

| KPI | Fórmula | Frecuencia | Dueño | Objetivo 100 días |
|---|---|---|---|---|
| Margen bruto por gramo (NSM) | (Intereses + utilidad venta − merma − costo fondeo) / gramos promedio en cartera | Mensual | CFO | Línea base + plan de mejora |
| Precisión de valuación | 1 − \|avalúo sucursal − avalúo verificado\| / avalúo verificado (muestreo 5%) | Semanal | Dir. Operaciones | ≥ 95% dentro de ±5% |
| Dispersión de avalúo | Desv. estándar del avalúo/gramo-kilataje entre valuadores | Semanal | Dir. Operaciones | −50% vs. línea base |
| Tiempo de valuación | Minutos puerta-a-oferta (mediana) | Semanal | Dir. Operaciones | −30% |
| Tasa de renovación | Contratos renovados / contratos elegibles | Mensual | Dir. Comercial | +4 pp |
| Tasa de desempeño (recuperación) | Contratos liquidados / contratos vencidos | Mensual | Dir. Riesgo | Estable o + |
| Merma por fraude/error | Pérdida por piezas falsas o sobrevaluadas / colocación | Mensual | Dir. Riesgo | −30% |
| Rotación de inventario adjudicado | Días promedio en vitrina hasta venta | Mensual | Dir. Comercial | −20% |
| Conversión cotización→contrato | Contratos / cotizaciones (digital y sucursal) | Semanal | CPO | Línea base (nuevo) |
| Ticket promedio | Colocación / # contratos | Mensual | Dir. Comercial | +5–8% (efecto pricing spot) |
| NPS transaccional | Encuesta post-operación | Mensual | CPO | Línea base + 10 pts a 6 meses |
| Cobertura de captura digital | Operaciones con foto+peso+kilataje estructurados / total | Semanal | CTO | ≥ 90% en sucursales piloto |

---

# 4. Oportunidades Estratégicas Prioritarias

Leyenda: Impacto/Complejidad/Riesgo = Alto·Medio·Bajo. ROI = estimado anualizado por cada $1,000 M MXN
de cartera de oro (los supuestos, en §10). Tiempos en días naturales dentro del plan de 100 días
(las que exceden 100 días se marcan como "inicia").

## 4.1 Pricing (la palanca más rápida)

| # | Iniciativa | Problema | Solución | Impacto | Complejidad | Dependencias | Tiempo | Riesgo | Equipo | ROI est. |
|---|---|---|---|---|---|---|---|---|---|---|
| P-1 | Tabla de avalúo indexada a spot diario | Tablas estáticas frente a oro +50% en 18 meses | Feed XAU/MXN (proveedor de datos de mercado) → tabla MXN/g por kilataje publicada 7:00 am a toda la red | Alto | Baja | Feed de precios; canal de publicación | 15 | Bajo | Pricing + TI | $15–25 M |
| P-2 | Bandas duras de avalúo (piso/techo) | Sub/sobrevaluación individual | Límite ±X% sobre tabla por kilataje en el sistema; excepción requiere autorización de segundo nivel | Alto | Media | P-1; cambio menor en POS o proceso paralelo | 30 | Medio (fricción con valuadores) | Pricing + Ops | $8–15 M |
| P-3 | Re-precio dinámico de inventario adjudicado | Vitrina a precios de adjudicación viejos | Regla semanal: precio venta = max(costo, spot×factor, precio comercial estimado); rebajas programadas por antigüedad | Alto | Baja | P-1; inventario digitalizado | 30 | Bajo | Comercial | $10–18 M |
| P-4 | LTV diferenciado por segmento de pieza | Mismo % de préstamo para chatarra y pieza de marca | Matriz LTV: chatarra (valor fundición) vs. pieza comercial (valor reventa con prima) vs. marca/lujo | Medio | Media | Captura digital (D-1); catálogo de categorías | 60 | Medio | Pricing + Riesgo | $8–12 M |
| P-5 | Cobertura del riesgo oro (análisis) | Exposición direccional de cartera+inventario al precio del oro | Análisis de sensibilidad y política de cobertura parcial (futuros/forwards) para el inventario en venta | Medio | Media | CFO; línea con contraparte | 90 (inicia) | Medio | CFO + Riesgo | Protección, no ROI directo |

## 4.2 Datos y captura digital (el prerequisito de todo)

| # | Iniciativa | Problema | Solución | Impacto | Complejidad | Dependencias | Tiempo | Riesgo | Equipo | ROI est. |
|---|---|---|---|---|---|---|---|---|---|---|
| D-1 | Captura digital universal de valuación | El dato de cada pieza se pierde | App sidecar (tablet/teléfono de sucursal): 2–4 fotos guiadas + peso + kilataje medido + categoría + avalúo + folio del contrato. No toca el core: enlaza por folio | Alto | Media | Hardware básico ($3–5 mil MXN/sucursal); conectividad | 45 (piloto), 100 (rollout parcial) | Medio (adopción) | Producto + TI | Habilitador (ROI vía IA-1..4, P-4) |
| D-2 | Data lake prendario | Silos: core, Excel, PDFs | Lago en nube (p. ej. BigQuery/Snowflake): ingesta diaria de extractos del core + captura D-1 + precios de mercado. Modelo de datos: contrato, pieza, cliente, sucursal, evento | Alto | Media | Extractos del core (batch basta) | 60 | Bajo | Ing. de datos | Habilitador |
| D-3 | Tablero ejecutivo y operativo | Dirección administra por retrovisor | Dashboards: colocación, renovación, adjudicación, merma, dispersión de avalúo por sucursal/valuador; diario | Alto | Baja | D-2 (o extractos directos como interino) | 30 (interino), 60 (sobre lago) | Bajo | Analítica | $3–5 M (decisiones) + control |
| D-4 | Registro de resultado por pieza | No se sabe qué piezas terminan bien o mal | Cerrar el ciclo del dato: cada pieza etiquetada con su desenlace (desempeño/renovación/adjudicación/venta/precio final) | Alto | Baja | D-1, D-2 | 60 | Bajo | Ing. de datos | Habilitador de pricing predictivo |
| D-5 | Calidad y gobierno de datos | Datos sin dueño ni estándar | Diccionario de datos, dueños por dominio, validaciones en ingesta, política de retención (LFPDPPP) | Medio | Baja | D-2 | 60 | Bajo | CTO + Legal | Evita retrabajo |

## 4.3 Inteligencia Artificial

| # | Iniciativa | Problema | Solución | Impacto | Complejidad | Dependencias | Tiempo | Riesgo | Equipo | ROI est. |
|---|---|---|---|---|---|---|---|---|---|---|
| IA-1 | Copiloto del Valuador v1 (RAG) | Conocimiento en PDF y en cabezas | Asistente LLM con RAG sobre "El Imbatible", manuales, tablas vivas y casos: responde dudas de autenticación, kilataje, procedimiento. Web app simple en el dispositivo de D-1 | Alto | Baja–Media | Corpus documental; LLM vía API | 45 (piloto) | Bajo | IA + Ops | $4–8 M (menos errores de novatos, onboarding −50%) |
| IA-2 | Alerta de desviación de valuación (ML clásico) | Fraude/colusión/error se detecta tarde | Modelo de anomalías (Isolation Forest / reglas + z-scores) sobre avalúo/gramo-kilataje por valuador vs. red; cola de revisión diaria | Alto | Baja | D-3 (datos de avalúos) | 45 | Bajo | Analítica + Riesgo | $6–12 M (merma −20–30%) |
| IA-3 | Visión: clasificación de pieza y pre-kilataje | Valuación lenta e inconsistente | Fine-tune de modelo de visión (ViT/EfficientNet o API multimodal) sobre fotos de D-1 etiquetadas con kilataje medido (ground truth de la propia operación): sugiere categoría, kilataje probable, señales de alerta. Piloto en 60–90 días con datos propios + dataset semilla | Alto | Alta | D-1 con ≥10–20 mil piezas etiquetadas | 90 (piloto), escala post-100 | Medio (precisión inicial) | IA | $10–20 M a 12 meses |
| IA-4 | Cotizador digital por foto (cliente) | El cliente no sabe cuánto le prestarán sin ir | Web/WhatsApp: cliente sube fotos y peso aproximado → rango de préstamo preliminar + cita. Motor: IA-3 en modo conservador + tabla P-1. Sin compromiso vinculante (el avalúo final es presencial) | Alto | Media | IA-3 (v. mínima) o reglas+humano en el back en v0 | 90 (v0 con revisión humana) | Medio | Producto + IA | $12–20 M (captación) |
| IA-5 | Agente de renovaciones (WhatsApp) | Renovación reactiva | Recordatorios T-7/T-3/T-0 + agente conversacional (LLM con guardrails y handoff humano) que resuelve dudas, calcula el refrendo y agenda pago | Alto | Media | Plantillas WhatsApp aprobadas; datos de vencimientos | 30 (recordatorios), 75 (agente) | Bajo | Producto + IA | $15–25 M (renovación +4–6 pp) |
| IA-6 | Forecast de demanda y flujo por sucursal | Staffing y efectivo a ciegas | Modelo de series de tiempo (Prophet/XGBoost) sobre histórico: colocación, desempeños y necesidades de efectivo por sucursal/día | Medio | Media | D-2 con 12+ meses de historia | 90 (inicia) | Bajo | Analítica | $3–6 M (eficiencia) |
| IA-7 | OCR de identificaciones (KYC) | Captura manual de INE, errores AML | OCR (API de documentos de identidad) + validación contra listas; precarga el expediente | Medio | Baja | Proveedor KYC | 60 | Bajo | TI + Cumplimiento | $2–4 M + riesgo regulatorio ↓ |

## 4.4 Producto y experiencia de cliente

| # | Iniciativa | Problema | Solución | Impacto | Complejidad | Dependencias | Tiempo | Riesgo | Equipo | ROI est. |
|---|---|---|---|---|---|---|---|---|---|---|
| C-1 | Recordatorios de renovación multicanal | Cliente pierde su prenda por olvido | WhatsApp/SMS T-7/T-3/T-0 con monto exacto de refrendo y CTA | Alto | Baja | Datos de vencimiento; proveedor WhatsApp | 30 | Bajo | Comercial | Incluido en IA-5 |
| C-2 | Pago de refrendo sin ir a sucursal | Renovar exige viajar | Liga de pago (SPEI/tarjeta/corresponsales) para refrendos; conciliación batch con el core | Alto | Media | Pasarela; conciliación | 75 | Medio | Producto + Finanzas | $8–15 M |
| C-3 | Cotizador web de oro (calculadora) | Cero presencia en el momento de intención | Calculadora pública: peso × kilataje × tabla del día = rango de préstamo; captura lead y agenda cita | Alto | Baja | P-1 | 30 | Bajo | Marketing + Producto | $5–10 M (captación) |
| C-4 | NPS transaccional + cierre de ciclo | No se mide la experiencia | Encuesta post-operación (WhatsApp), alertas de detractores a gerente de sucursal | Medio | Baja | Datos de contacto | 30 | Bajo | CX | Indirecto |
| C-5 | Certificado digital de prenda | Desconfianza sobre custodia | Comprobante digital con fotos de la pieza (de D-1), peso y condiciones; verificable por folio | Medio | Baja | D-1 | 60 | Bajo | Producto | Diferenciación + disputas ↓ |
| C-6 | Canal de venta digital de inventario | Vitrina limitada a tráfico local | Publicación del inventario adjudicado curado en marketplace propio/terceros (ML Libre) con fotos de D-1 | Medio | Media | D-1, P-3; logística | 90 (piloto) | Medio | Comercial | $6–12 M (rotación +) |

## 4.5 Operación y riesgo

| # | Iniciativa | Problema | Solución | Impacto | Complejidad | Dependencias | Tiempo | Riesgo | Equipo | ROI est. |
|---|---|---|---|---|---|---|---|---|---|---|
| O-1 | Kit de medición estandarizado | Autenticación dispar | Báscula certificada + kit ácidos/piedra + medidor electrónico (y XRF portátil en hubs de alto volumen); calibración mensual | Alto | Baja | Presupuesto capex ligero | 45 | Bajo | Ops | Merma ↓ (con IA-2) |
| O-2 | Doble verificación por muestreo | Sin control de calidad de avalúos | 5% de operaciones re-valuadas por valuador senior itinerante/remoto (con fotos de D-1); resultado alimenta IA-2 y bonos | Alto | Baja | D-1 deseable | 30 | Bajo | Ops + Riesgo | Merma ↓, dato de precisión |
| O-3 | Certificación y bono por precisión | Incentivos premian volumen, no calidad | Score de valuador (precisión + fraude evitado + NPS) ligado a bono trimestral; ruta de certificación (aprovecha "El Imbatible") | Alto | Media | O-2, D-3; RH | 60 | Medio (sindical/cultural) | Alinea toda la operación |
| O-4 | Expediente AML/UIF digital | Avisos manuales, riesgo de multa | Flujo digital de identificación + umbrales UIF + generación de avisos; auditoría trimestral | Alto | Media | IA-7; Cumplimiento | 75 | Bajo | Cumplimiento + TI | Evita sanciones (riesgo Alto en KB) |
| O-5 | Playbook de horas pico | Colas en quincenas | Pre-cotización en fila (tablet), citas de C-3/IA-4, staffing por forecast IA-6 | Medio | Baja | C-3 | 60 | Bajo | Ops | Conversión ↑ en pico |

**Total: 26 iniciativas.** Las P0 del plan (ver §12) son: P-1, P-2, P-3, D-1, D-2, D-3, IA-2, IA-5/C-1, O-2, O-4.

---

# 5. Roadmap de 100 Días

## Fase 1 — Diagnóstico y alineación (Día 1–30)

**Objetivo:** línea base cuantificada, gobierno instalado, primeros quick wins en producción.

| Frente | Acciones | Entregable concreto (Día 30) |
|---|---|---|
| Gobierno | Nombrar equipo de transformación (§9), comité semanal, war room | Acta de gobierno + cadencia operando |
| Datos/diagnóstico | Auditoría de datos del core y Excel operativos; medir línea base de los 12 KPIs (§3); análisis de dispersión de avalúos con datos históricos | **Baseline book**: KPIs con cifras reales; mapa de sistemas y datos |
| Pricing | P-1 en producción (tabla spot diaria); diseño de bandas P-2; re-precio de inventario P-3 iniciado | Tabla diaria operando en 100% de la red |
| Renovaciones | C-1: recordatorios WhatsApp T-7/T-3/T-0 | Recordatorios activos; tasa de renovación instrumentada |
| Control | O-2: doble verificación 5% iniciada; guía rápida de autenticación (quick win 8) distribuida | Primer reporte semanal de precisión por valuador |
| Visibilidad | D-3 interino: tablero diario sobre extractos | Tablero diario en manos del comité |
| Descubrimiento | Shadowing en 8–10 sucursales (3 perfiles: alto/medio/bajo desempeño); entrevistas a valuadores; benchmark de ofertas de competidores (mystery shopping con piezas patrón) | Informe de descubrimiento + mapa de fricciones validado |

## Fase 2 — Diseño y validación (Día 31–60)

**Objetivo:** pilotos vivos de las apuestas estratégicas; decisiones de arquitectura tomadas.

| Frente | Acciones | Entregable concreto (Día 60) |
|---|---|---|
| Captura digital | D-1: app de captura en piloto en 10–20 sucursales (hardware instalado, flujo de 2–4 fotos + mediciones) | ≥ 90% de operaciones del piloto capturadas; primeras ~5–10 mil piezas en dataset |
| Data lake | D-2: ingesta batch del core + captura + precios; modelo de datos v1 | Lago con 3 fuentes vivas; D-3 migrado al lago |
| Pricing | P-2 bandas duras en piloto (mismas sucursales que D-1); P-4 matriz LTV diseñada | Bandas activas en piloto; dispersión de avalúo del piloto −30% |
| IA | IA-1 copiloto RAG en piloto (corpus: "El Imbatible" + tablas + procedimientos); IA-2 modelo de anomalías v1 sobre históricos | Copiloto usado por ≥ 70% de valuadores del piloto; cola de revisión de anomalías operando |
| Cliente | C-3 cotizador web público; diseño de IA-4 (cotización por foto v0 con revisión humana) y C-2 (pago remoto) | Cotizador en producción; specs aprobadas de IA-4 y C-2 |
| Operación | O-1 kits de medición en piloto; O-3 esquema de bono diseñado con RH | Kits instalados; propuesta de incentivos aprobada |
| Cumplimiento | O-4: diagnóstico AML/UIF y diseño del expediente digital; IA-7 proveedor OCR seleccionado | Gap analysis regulatorio + plan de remediación |

## Fase 3 — Implementación inicial (Día 61–90)

**Objetivo:** desplegar lo probado; encender las palancas de ingreso.

| Frente | Acciones | Entregable concreto (Día 90) |
|---|---|---|
| Rollout | D-1 + P-2 + IA-1 + O-1 a 50–100 sucursales (ola 2), con capacitación en cascada (train-the-trainer sobre red "El Imbatible") | Ola 2 operando; cobertura de captura ≥ 85% |
| Renovaciones | IA-5 agente conversacional de renovación (con handoff humano); C-2 pago de refrendo remoto en piloto | Agente atendiendo ≥ 50% de conversaciones; primeros refrendos pagados en remoto |
| IA visión | IA-3: primer modelo entrenado con dataset propio (clasificación de categoría + pre-kilataje); evaluación ciega vs. valuadores | Reporte de precisión del modelo (gate: ¿listo para asistir en sucursal?) |
| Cotización digital | IA-4 v0: cotización por foto con revisión humana en back office (SLA < 2 h) | Canal vivo; conversión cotización→visita medida |
| Comercial | P-3 re-precio total del inventario; C-6 piloto de venta digital del inventario curado | Inventario 100% re-preciado; primeras ventas digitales |
| Incentivos | O-3 bono por precisión en vigor para sucursales de olas 1–2 | Primer ciclo de score de valuadores comunicado |
| Cumplimiento | O-4 expediente digital + IA-7 OCR en piloto | Avisos UIF generados desde el flujo digital |

## Fase 4 — Consolidación (Día 91–100)

**Objetivo:** demostrar impacto, decidir escala, asegurar el plan anual.

| Frente | Acciones | Entregable concreto (Día 100) |
|---|---|---|
| Resultados | Cierre de KPIs vs. baseline del Día 30 (dispersión, renovación, merma, tiempos, captación digital) | **Informe de impacto de 100 días** para el Consejo |
| Ajustes | Post-mortems de pilotos; ajustar bandas, prompts del copiloto, flujos de captura | Backlog priorizado v2 |
| Escala | Plan de rollout nacional (olas 3–6), presupuesto y business case actualizado con datos reales | Plan anual aprobado por el Consejo, con presupuesto |
| Organización | Formalizar squads permanentes (§9); plan de contratación de las 3–4 capacidades faltantes | Organigrama objetivo + ofertas en curso |
| Riesgo | Revisión de riesgos de ejecución (§11) con estado real | Matriz de riesgos actualizada |

---

# 6. Estrategia Específica para Oro y Joyería

## El negocio ideal en 2030

En 2030, Presta Prenda opera un **sistema de valuación híbrido humano+IA** donde:

- El cliente inicia en digital: fotografía su pieza, recibe un rango de préstamo en minutos y llega
  a la sucursal con oferta precalificada y cita. La sucursal confirma con medición objetiva en < 10
  minutos.
- Cada pieza que ha pasado por la red —millones— vive en el **catálogo prendario más grande de
  México**: imagen, medición, desenlace y precio de venta final. Ese dataset propietario es la
  ventaja competitiva imposible de copiar sin operar la red.
- El precio de préstamo y de venta es **dinámico por pieza**: fundición para chatarra, prima
  comercial para piezas vendibles, prima de marca para lujo autenticado.
- El fraude se detecta en tres capas: física (medición), visual (modelo de imagen) y estadística
  (patrones de comportamiento), con tasas de pérdida por debajo de la mitad del promedio de industria.
- El inventario adjudicado se vende en 30 días o menos, omnicanal, con fotografía profesional
  automatizada tomada en la propia valuación.

## Componentes de diseño

**Cotización digital (IA-4 + C-3).**
Embudo: calculadora pública (peso+kilataje declarado) → cotización por foto (rango con IA + revisión
humana) → cita → avalúo presencial vinculante. Regla de oro: la oferta digital siempre es *rango
conservador*, nunca compromiso, para proteger la unidad económica y las expectativas.

**Evaluación por fotografía e identificación de piezas (IA-3).**
- *Datos:* 2–4 fotos guiadas por pieza (encima, reverso, sellos/hallmarks en macro, en báscula),
  etiquetadas con la medición real del valuador (peso, kilataje por ácido/electrónico/XRF) y el
  desenlace del contrato. La operación diaria genera el dataset — miles de piezas etiquetadas por
  semana una vez desplegado D-1.
- *Modelos:* clasificador de categoría (cadena/anillo/esclava/moneda/reloj…), detector de sellos con
  OCR de hallmarks ("14k", "585", ".750", marcas), regresor de pre-kilataje (señales visuales: color,
  desgaste, contraste de aleación). Arquitectura: fine-tune de backbone de visión (ViT/EfficientNet)
  o API multimodal comercial en fase temprana → modelo propio cuando el dataset supere ~50 mil piezas.
- *Integración:* el modelo corre como servicio; la app de captura (D-1) muestra la sugerencia al
  valuador **antes** de su medición, y la medición confirma o corrige (cada corrección re-entrena).

**Estimación automática de peso, kilataje, pureza y valores.**
- Peso: no se estima por foto en piezas sueltas — se mide (báscula conectada por Bluetooth a la app
  elimina el error de dedo). La foto en báscula valida el registro.
- Kilataje/pureza: sugerencia visual (IA-3) + confirmación física (ácidos/electrónico; XRF en hubs).
  El XRF es el ground truth de mayor calidad para entrenar.
- Valor comercial: modelo de pricing (gradient boosting) con features de pieza (categoría, kilataje,
  peso, condición, marca) + históricos de venta propios + comparables de marketplaces → estima precio
  de reventa esperado y días-a-venta.
- Valor prendario: `min(LTV_fundición × spot × pureza × peso, LTV_comercial × valor_reventa_estimado)`
  con matriz de LTV por segmento (P-4) y ajuste por riesgo del cliente/plaza.

**Detección de fraude (3 capas).**
1. Física: kit estandarizado (O-1), doble verificación (O-2).
2. Visual: modelo de anomalía de imagen (pieza "no parece" el kilataje declarado; sellos inconsistentes
   con aleación aparente; patrones de piezas bañadas).
3. Estadística (IA-2): desviaciones por valuador/sucursal/cliente (clientes recurrentes con piezas
   límite, horarios anómalos, avalúos sistemáticamente en el techo de banda).

**Pricing dinámico.** Tabla base diaria (P-1) → bandas (P-2) → matriz LTV por segmento (P-4) →
(post-100 días) ajuste por plaza y demanda local con elasticidad medida en el propio embudo digital.

**Motor de recomendaciones.** Para el cliente: "tu pieza califica para X; con desempeño puntual tu
LTV sube". Para la vitrina: qué inventario mover a qué plaza/canal según demanda local (datos C-6).

**Asistente para valuadores (IA-1→IA-3).** Evolución: v1 responde dudas (RAG sobre "El Imbatible" y
manuales) → v2 ve la pieza (sugerencia de IA-3 embebida) → v3 propone el avalúo completo con
explicación, y el humano confirma. El valuador senior se convierte en supervisor de calidad de la red.

**Customer journey digital objetivo.**
Descubre (calculadora/campaña "tu oro vale más que nunca") → cotiza por foto → agenda → valúa en
sucursal en < 10 min → contrata (expediente digital O-4) → recibe certificado digital (C-5) →
recordatorios y refrendo remoto (IA-5, C-2) → desempeña o, si adjudica, la pieza entra al canal de
venta omnicanal (C-6) el mismo día con las fotos ya tomadas.

---

# 7. Estrategia de Inteligencia Artificial

Principio rector: **primero el dato, luego el modelo; primero asistir, luego automatizar.**
Ningún modelo decide solo en los primeros 12 meses: todo pasa por confirmación humana.

## Quick wins (< 90 días)

| Caso | Valor | Complejidad | Datos requeridos | ROI |
|---|---|---|---|---|
| IA-2 Detección de anomalías de valuación (ML clásico: Isolation Forest + reglas z-score por valuador/sucursal) | Merma −20–30%; disuasión de colusión | Baja | Históricos de avalúos del core (ya existen) | Muy alto, semanas |
| IA-1 Copiloto RAG del valuador (LLM comercial vía API + embeddings sobre "El Imbatible", tablas y procedimientos) | Onboarding −50%; menos errores de novatos; conocimiento institucionalizado | Baja–Media | Corpus documental existente (DOC-006, manuales, tablas P-1) | Alto |
| IA-5 Recordatorios + agente de renovación (plantillas WhatsApp; LLM con guardrails y handoff) | Renovación +4–6 pp = el ROI más grande del plan | Media | Vencimientos y montos del core; plantillas aprobadas por WhatsApp | Muy alto |
| IA-7 OCR de KYC (API comercial de verificación de identidad) | Alta velocidad, expediente AML limpio | Baja | INE/pasaporte del flujo actual | Medio + riesgo ↓ |

## Medium-term bets (3–9 meses)

| Caso | Valor | Complejidad | Datos requeridos | ROI |
|---|---|---|---|---|
| IA-3 Visión para clasificación + pre-kilataje (fine-tune ViT/EfficientNet; OCR de hallmarks; ground truth = mediciones de D-1) | Valuación −30% de tiempo; consistencia; base del cotizador | Alta | ≥ 10–20 mil piezas fotografiadas y medidas (D-1 lo genera en ~6–10 semanas de piloto ampliado) | Alto a 12 meses |
| IA-4 Cotizador por foto para clientes (IA-3 en modo conservador + revisión humana v0) | Captación digital nueva; diferenciación visible | Media | IA-3 + tabla P-1 | Alto |
| Pricing predictivo de reventa (gradient boosting sobre ventas propias + comparables de marketplaces) | Rotación de inventario −20% días; margen de venta + | Media | Historial de ventas por pieza (D-4) + scraping de comparables | Alto |
| IA-6 Forecast de demanda/efectivo por sucursal (Prophet/XGBoost) | Staffing y tesorería eficientes | Media | 12+ meses de operación diaria por sucursal (core) | Medio |

## Moonshots (9–24 meses)

| Caso | Valor | Complejidad | Datos requeridos | ROI |
|---|---|---|---|---|
| Valuación autónoma end-to-end (visión + báscula conectada + XRF integrado): el humano solo confirma | Costo por operación −40%; expansión a formatos ligeros (kiosco, corresponsal) | Muy alta | Cientos de miles de piezas con desenlace (2+ años de D-1/D-4) | Transformacional |
| Autenticación de lujo (relojes/marcas) con CV especializado o alianza tipo Entrupy | Abre segmento premium de ticket 10–50× | Alta | Dataset de lujo (propio + partner) | Alto en segmento nuevo |
| Agente integral del cliente (estado de prenda, refrendo, ofertas, educación financiera) | LTV de cliente +; canal propio | Media–Alta | Historial unificado de cliente (D-2) | Medio–alto |
| Red de pricing en tiempo real entre sucursales (subastas internas de inventario a la plaza con mayor demanda) | Margen de venta +; inventario óptimo | Alta | C-6 + pricing predictivo maduros | Medio |

**Arquitectura común:** lago de datos (D-2) como fuente única → servicios de ML desacoplados del core
(API sidecar) → la app de captura (D-1) como superficie de entrega en sucursal → evaluación continua
con las correcciones del valuador como señal de re-entrenamiento. LLMs comerciales vía API para
lenguaje (no se entrena LLM propio); modelos de visión y tabulares sí son propios porque el dataset
es propietario y es donde vive la ventaja.

---

# 8. Benchmark Internacional

| Empresa | Capacidades | Diferenciadores | Lecciones para Presta Prenda |
|---|---|---|---|
| FirstCash (EUA/México/LatAm) | >2,800 tiendas; pricing y gestión de inventario centralizados; disciplina de rotación | Escala binacional; motor interno de precios de reventa; adquisiciones | El pricing centralizado de inventario es el estándar del líder; la rotación se gestiona como retail, no como bóveda |
| EZCorp (EUA/LatAm) | Pawn operating system propio; apps de cliente para pagos de refrendo | Digitalización del refrendo (pago remoto) con adopción real | El pago remoto de renovaciones (C-2) está probado en la industria: prioridad, no experimento |
| H&T Group (Reino Unido) | Empeño + retail de joyería + compra de oro + FX; valuación estandarizada | Integración empeño↔retail: la pieza adjudicada entra a un canal de venta pulido y omnicanal | El inventario adjudicado es un negocio de retail de joyería por derecho propio (C-6, P-3) |
| Cash Converters (Australia) | Franquicia global; préstamos en línea; marketplace propio de segunda mano | Canal digital de venta consolidado | Marketplace propio da margen y datos de demanda que terceros no comparten |
| Nacional Monte de Piedad (México) | Marca de confianza centenaria; tasas bajas; modernización tecnológica en curso | Confianza institucional como moat | La confianza se construye con transparencia verificable (certificado digital C-5, valuación explicada) |
| Entrupy (EUA, CV startup) | Autenticación de lujo por microscopía + CV con garantía financiera | Dataset propietario de millones de imágenes; el hardware captura el dato estandarizado | El dataset propietario ES el negocio; la captura estandarizada (D-1) es la condición para tenerlo |
| The RealReal / Rebag (luxury resale) | Valuación experta a escala; Rebag "Clair": precio instantáneo por modelo | Pricing instantáneo publicado genera confianza y volumen | Un cotizador público y confiable (IA-4) convierte incertidumbre en tráfico |
| StockX / marketplaces de joyería | Precios de mercado en vivo por artículo | Transparencia radical de precios | Los comparables de mercado deben alimentar el pricing de reventa (no solo el spot del metal) |
| Fintechs de crédito digital (México) | Originación 100% digital, decisión en minutos | UX y velocidad como estándar de expectativa del cliente | El cliente prendario ya fue educado por las fintechs: esperará lo mismo de Presta Prenda |

---

# 9. Operating Model Objetivo

## Estructura para los 100 días (y semilla del modelo permanente)

**Comité Ejecutivo de Transformación** — CEO (sponsor), CFO, CPO/Dir. Transformación (líder),
Dir. Operaciones, Dir. Riesgo/Cumplimiento, CTO. Sesión semanal de 60 min sobre el tablero D-3:
decisiones, desbloqueos, go/no-go de pilotos.

**Squads (equipos pequeños, dedicados, con dueño único):**

| Squad | Misión | Composición | KPIs que posee |
|---|---|---|---|
| Pricing & Riesgo | P-1..P-5, IA-2, O-2 | Líder de pricing, analista de riesgo, 1 dev | Margen/gramo, dispersión, merma |
| Captura & Datos | D-1..D-5 | PM, 2 devs, 1 ing. de datos | Cobertura de captura, KPIs vivos |
| IA Aplicada | IA-1, IA-3, IA-4 | 1 ML engineer, 1 dev, apoyo de valuadores senior | Precisión de modelos, adopción del copiloto |
| Cliente & Renovación | C-1..C-6, IA-5 | PM, 1 dev, marketing, comercial | Tasa de renovación, conversión digital, NPS |
| Operación & Cambio | O-1, O-3, O-5, capacitación, adopción | Líder de ops, capacitador ("El Imbatible"), RH | Adopción por ola, score de valuadores |

**Cadencia:** daily de 15 min por squad · weekly de comité · retro mensual · gate de fase (Días
30/60/90) con criterios go/no-go definidos por adelantado.

## RACI (iniciativas P0)

| Iniciativa | R (ejecuta) | A (responde) | C (consultado) | I (informado) |
|---|---|---|---|---|
| P-1/P-2 Pricing spot + bandas | Squad Pricing | CFO | Dir. Ops, valuadores senior | Red de sucursales |
| D-1 Captura digital | Squad Captura | CPO | Dir. Ops, Legal (datos personales) | Comité |
| D-2/D-3 Lago + tableros | Squad Captura | CTO | CFO | Comité |
| IA-2 Anomalías | Squad Pricing | Dir. Riesgo | Auditoría interna | RH (consecuencias) |
| IA-5/C-1 Renovaciones | Squad Cliente | Dir. Comercial | Legal (LFPDPPP, publicidad) | Sucursales |
| O-2/O-3 Verificación + incentivos | Squad Operación | Dir. Ops | RH, sindicato si aplica | Valuadores |
| O-4 AML/UIF digital | Squad Operación | Dir. Cumplimiento | Asesor externo AML | CEO/Consejo |

**Capacidades a contratar (3–4 personas, no más en 100 días):** 1 ingeniero de datos senior,
1 ML engineer con experiencia en visión, 1 product manager digital. El resto se cubre con talento
interno reasignado + 1 firma implementadora acotada (app de captura) con transferencia de conocimiento
obligatoria.

---

# 10. Business Case

## Supuestos base (a validar en Fase 1 — declarados, no verificados)

| Supuesto | Valor base |
|---|---|
| Cartera prendaria de oro (unidad de modelado) | $1,000 M MXN (los resultados escalan linealmente) |
| Rendimiento bruto anual de cartera (intereses+comisiones) | ~48% (≈ 4% mensual efectivo cobrado) |
| Tasa de renovación actual | 55% de contratos elegibles |
| Merma anual por fraude + sobrevaluación | 1.2% de la colocación |
| Margen de venta de inventario adjudicado | 15% sobre costo |
| Colocación anual sobre cartera promedio | ~2.4× (rotación de contratos ~4 meses) |

## Escenarios (beneficio anualizado por $1,000 M de cartera)

| Palanca | Conservador | Base | Agresivo |
|---|---|---|---|
| Pricing a spot + bandas (P-1..P-3): margen +1.0/1.8/2.5 pp sobre colocación y venta | $24 M | $43 M | $60 M |
| Renovaciones (IA-5, C-1, C-2): +2/+4/+6 pp de tasa | $10 M | $19 M | $29 M |
| Merma (IA-2, O-1, O-2): −20%/−30%/−40% | $6 M | $9 M | $12 M |
| Rotación y margen de inventario (P-3, C-6) | $4 M | $8 M | $14 M |
| Captación digital (C-3, IA-4): +1%/+2.5%/+4% de colocación incremental a margen estándar | $5 M | $12 M | $19 M |
| **Beneficio anualizado** | **$49 M** | **$91 M** | **$134 M** |

## Inversión (100 días, red piloto de ~100 sucursales)

| Concepto | Rango |
|---|---|
| Equipo (3–4 contrataciones + implementadora acotada) | $8–12 M |
| Hardware de captura y medición (tablets, básculas, kits, 2–3 XRF de hub) | $4–7 M |
| Software/nube/APIs (lago, LLM, WhatsApp, feed de precios, OCR-KYC) | $3–5 M |
| Capacitación y gestión del cambio | $2–3 M |
| Contingencia (15%) | $1–1.5 M |
| **Total 100 días** | **$18–28 M** |

**Payback (escenario base):** la inversión de $18–28 M contra ~$91 M anualizados (que en los
primeros meses se captura parcialmente, digamos 40–60% de run-rate al Día 100 en la red piloto)
implica **payback de 4–7 meses**. EBITDA incremental año 1 (escenario base, rollout progresivo):
**$45–65 M por cada $1,000 M de cartera.**

## Variables críticas y sensibilidades

- **Precio del oro:** el modelo asume estabilidad. Una caída de −15% del spot comprime los LTV y el
  valor del inventario → la palanca de pricing protege (bandas se ajustan a diario), pero el
  beneficio de P-3 se reduce ~40%. Mitigación: P-5 (cobertura parcial del inventario).
- **Adopción de captura (D-1):** si la cobertura cae < 70%, IA-3/IA-4 se retrasan un trimestre.
  Es la variable operativa más sensible → por eso O-3 liga incentivos a la captura.
- **Tasa de renovación:** cada punto porcentual ≈ $4.8 M por $1,000 M de cartera. Es la sensibilidad
  de ingreso más fuerte y la de menor riesgo técnico.
- **Regulatorio:** cambios en topes de tasas o requisitos prendarios alterarían la unidad económica;
  el plan no depende de arbitraje regulatorio.

---

# 11. Riesgos de Ejecución

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Resistencia de valuadores a bandas/captura (percepción de vigilancia) | Alto | Alta | Narrativa de asistencia + bono por precisión (O-3) + valuadores senior co-diseñan; piloto en sucursales con gerentes aliados |
| Datos del core inaccesibles o de mala calidad | Alto | Media | Estrategia sidecar: extractos batch bastan para Fase 1–2; D-5 gobierno desde el día 1; no se requiere API en tiempo real hasta post-100 |
| Precisión insuficiente de IA-3 en piloto | Medio | Media | Gate del Día 90: el modelo solo asiste (nunca decide); si no alcanza umbral, se retrasa IA-4 sin afectar el resto del plan |
| Incumplimiento AML/UIF detectado al digitalizar | Alto | Media | O-4 con asesor externo desde Fase 2; remediar antes de escalar; el flujo digital *reduce* el riesgo vs. statu quo |
| Fraude interno reacciona al control (desplaza, no desaparece) | Medio | Media | IA-2 se recalibra mensual; muestreo O-2 aleatorio y no anunciado; rotación de verificadores |
| Proveedor único (WhatsApp/LLM/feed de precios) falla o encarece | Medio | Baja | Abstracción por API propia; segundo proveedor identificado por servicio; los datos siempre en el lago propio |
| Caída del precio del oro durante el plan | Medio | Media | P-1 ajusta LTV a diario (el riesgo es del statu quo, no del plan); P-5 análisis de cobertura |
| Fatiga organizacional / dispersión de foco | Alto | Media | Solo 10 iniciativas P0; gates de fase con permiso explícito de matar iniciativas; comité protege el foco |
| Fuga de datos personales/imágenes de clientes | Alto | Baja | LFPDPPP by design: cifrado, minimización, avisos de privacidad actualizados, acceso por rol, retención definida (D-5) |
| Dependencia de la implementadora externa | Medio | Media | Contrato con transferencia de conocimiento y código propiedad de Presta Prenda; equipo interno pareado desde el día 1 |

---

# 12. Plan Ejecutivo Final

| Prioridad | Iniciativa | Impacto | Tiempo | Responsable |
|---|---|---|---|---|
| **P0** | P-1 Tabla de avalúo indexada a spot diario | Margen +, competitividad inmediata | Día 15 | CFO / Squad Pricing |
| **P0** | C-1/IA-5 Recordatorios y agente de renovación | Renovación +4–6 pp (mayor ROI del plan) | Día 30 (rec.) / 75 (agente) | Dir. Comercial |
| **P0** | D-1 Captura digital universal (piloto→ola 2) | Habilita toda la IA; certificado digital | Día 45 piloto / 90 ola 2 | CPO |
| **P0** | D-2/D-3 Data lake + tableros | Dirección con datos diarios | Día 30 interino / 60 lago | CTO |
| **P0** | IA-2 Alertas de desviación de valuación | Merma −20–30% | Día 45 | Dir. Riesgo |
| **P0** | P-2 Bandas duras de avalúo | Dispersión −50% | Día 60 (piloto→ola 2) | CFO |
| **P0** | P-3 Re-precio de inventario adjudicado | Margen de venta inmediato | Día 30–90 | Dir. Comercial |
| **P0** | O-2 Doble verificación por muestreo | Control + dato de precisión | Día 30 | Dir. Operaciones |
| **P0** | O-4 Expediente AML/UIF digital | Riesgo regulatorio Alto → controlado | Día 75 | Dir. Cumplimiento |
| **P1** | IA-1 Copiloto RAG del valuador | Onboarding −50%, consistencia | Día 45 piloto | Squad IA |
| **P1** | C-3 Cotizador web (calculadora) | Captación digital inicial | Día 30 | Marketing |
| **P1** | O-1 Kit de medición estandarizado | Base física antifraude | Día 45 | Dir. Operaciones |
| **P1** | O-3 Certificación y bono por precisión | Alinea incentivos con calidad | Día 60 diseño / 90 vigor | RH + Dir. Ops |
| **P1** | IA-3 Visión: clasificación y pre-kilataje | Núcleo de la ventaja 2030 | Día 90 gate | Squad IA |
| **P1** | C-2 Pago de refrendo remoto | Renovación sin fricción | Día 75 piloto | CPO + Finanzas |
| **P2** | IA-4 Cotizador por foto (v0 con humano) | Diferenciación visible al mercado | Día 90 | CPO |
| **P2** | P-4 Matriz LTV por segmento de pieza | Margen fino por calidad | Día 60 diseño | Squad Pricing |
| **P2** | IA-7 OCR de KYC | Velocidad + expediente limpio | Día 60 | Cumplimiento + TI |
| **P2** | C-6 Venta digital de inventario (piloto) | Rotación +, datos de demanda | Día 90 | Dir. Comercial |
| **P2** | C-4 NPS transaccional | Voz de cliente instrumentada | Día 30 | CX |
| **P2** | C-5 Certificado digital de prenda | Confianza diferenciada | Día 60 | CPO |
| **P3** | IA-6 Forecast de demanda/efectivo | Eficiencia operativa | Inicia Día 90 | Analítica |
| **P3** | P-5 Análisis de cobertura del oro | Protección de balance | Inicia Día 90 | CFO |
| **P3** | O-5 Playbook de horas pico | Conversión en quincena | Día 60 | Dir. Operaciones |
| **P3** | D-5 Gobierno de datos formal | Sostenibilidad del activo de datos | Día 60 | CTO |
| **P3** | C-6+ Marketplace propio / lujo (Entrupy-like) | Apuestas post-100 días | Plan anual | Comité |

---

## Cierre

El plan no pide fe en la IA: pide **90 días de disciplina en tres cosas medibles** —pricing vivo,
captura del dato y renovaciones proactivas— que pagan la transformación por sí solas, mientras
construyen el activo (el dataset prendario de oro más grande de México) que ninguna palanca
tradicional de la competencia puede replicar. Al Día 100 el Consejo tendrá cifras reales contra
línea base, una red piloto operando el nuevo modelo y un plan anual costeado para escalarlo.

*Preparado para el Consejo de Administración de Presta Prenda · 2026*
