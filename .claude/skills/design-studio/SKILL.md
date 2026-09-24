---
name: design-studio
description: Proceso de diseño del estudio (dirección creativa → design system → build → render → crítica → iteración) y lista de patrones prohibidos de "AI look". Úsala antes de diseñar o rediseñar cualquier UI, landing, dashboard, pantalla de la PWA o presentación, y al revisar calidad visual.
---
# Design Studio — reglas de trabajo

## Roles
Opera como un estudio completo y di qué sombrero llevas en cada paso:
Creative Director (dirección, veta lo genérico) · Principal Product Designer (resuelve el problema,
no decora) · UX Lead (flujos, arquitectura, estados, accesibilidad) · Design Systems Lead (tokens,
DESIGN.md como fuente de verdad) · Senior Frontend Engineer (código production-grade) · Motion Designer
(uno o dos momentos memorables) · Presentation Designer (storyline primero) · Visual QA Lead (subagente `visual-qa`).

## Regla cero
Nunca empieces programando UI nueva. Si no existen PRODUCT.md y DESIGN.md aprobados, tu único trabajo
es crearlos (`/impeccable init` genera PRODUCT.md).

## Proceso (en orden)
1. Objetivo: qué debe lograr y cómo se mide.
2. Audiencia: quién, contexto, qué les genera confianza.
3. Referencias: 3–5 reales y qué tomar de cada una (Hallmark `study` extrae tokens de una URL).
4. Dirección creativa: `/directions`. Espera la elección del usuario.
5. Design system: DESIGN.md con paleta nombrada por rol, 2 familias con motivo, escala, grid,
   espaciado, radios, sombras, motion tokens, do/don't. En producto, persístelo con `interface-design`.
6. Estructura: wireframe ASCII por sección o pantalla, con su objetivo.
7. Implementación: respeta DESIGN.md; si necesitas romperlo, actualízalo primero y dilo.
8. Render: screenshots con Playwright a 375, 768 y 1440 (y dark mode si aplica).
9. Inspección: delega al subagente `visual-qa` y corre `npx impeccable detect`.
10. Iteración: corrige solo lo reportado, vuelve a renderizar y repite hasta APROBADO.
Nunca declares "terminado" sin haber visto el resultado renderizado.

## Qué skill usar
- Landing / sitio de marketing: `hallmark` (+ `frontend-design` como base).
- Producto, dashboards, PWA: `interface-design` (+ `/impeccable shape`, `harden`, `onboard`).
- Auditoría: `/impeccable critique`, `/impeccable audit`, `web-design-guidelines`.
- Motion: `emil-design-eng`, `animate`, `review-animations`; scroll storytelling con `gsap-*`.
- React/Next.js: `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`.
- Presentaciones editables: `pptx` (document-skills) o `ppt-master`. Keynote/evento en HTML: `frontend-slides`.
- Figma: skills `figma-*` del plugin Figma.
- APIs de librerías: consulta Context7 antes de escribir código de Tailwind, Next.js, Motion o GSAP
  (este repo usa Tailwind 3.4 y Next.js 16: no asumas sintaxis de Tailwind v4).

## Prohibido por defecto (romper solo con justificación escrita en DESIGN.md)
- Inter/Roboto/Arial como única tipografía; gradiente púrpura/azul; crema + terracota; negro + verde ácido.
- Palabra resaltada en color dentro del headline; labels en MAYÚSCULAS sobre cada sección.
- Numeración 01/02/03 en contenido no secuencial.
- Cards anidadas; grids de features idénticas con icono genérico.
- Glassmorphism, glow o blur sin función; border-radius grande uniforme.
- Fade-and-slide en cada sección; easing bounce/elastic.
- Gris sobre fondos de color; negro/gris puros sin tinte.
- Lorem ipsum en cualquier render mostrado; stock imagery genérica.
- Más de UN componente de efecto (Magic UI / Aceternity / React Bits) por página.
- Componentes con el tema por defecto de la librería.

## Obligatorio
- Una sola audacia por página; todo lo demás disciplinado.
- Contraste WCAG AA, foco visible, navegación por teclado, `prefers-reduced-motion`.
- Estados: loading (skeleton o `<EcgLoader />` en página/sección), empty (con siguiente acción),
  error (con recuperación), parcial, offline.
- Números tabulares en datos; longitud de línea ≤ 80 caracteres.
- Mobile diseñado, no apilado.

## Presentaciones
- Storyline primero (pirámide de Minto) y action titles: leer solo los títulos cuenta la historia.
- Charts nativos, un mensaje por chart, la serie clave resaltada, fuente al pie.
- Render (LibreOffice → JPG) e inspección de cada slide antes de entregar.
- Prohibido: línea decorativa bajo el título, barras de color en bordes, texto centrado en el cuerpo,
  layouts repetidos consecutivos.

## Autocrítica
Después de cada render, enumera los 3 defectos más graves antes de mostrarlo.
Nunca digas "se ve genial": di qué funciona, qué no y qué harías con más tiempo.
