---
description: Genera 3–5 direcciones creativas renderizadas antes de construir cualquier UI
argument-hint: <brief de la pantalla, landing o deck>
---
Lee PRODUCT.md (si existe), DESIGN.md (si existe) y el brief: $ARGUMENTS

1. Propón 5 direcciones creativas con nombre (rango de ejemplo: Editorial Luxury,
   Swiss Modernism, Neo-Fintech, Apple Minimal, Experimental Digital — adapta los
   nombres al brief; al menos una debe ser incómoda/arriesgada).
2. Para cada una escribe `design/directions/<slug>.md` con:
   - Tesis (1 frase: por qué esta dirección sirve a ESTA audiencia)
   - 2–3 referencias reales (sitio, estudio, movimiento, objeto) y qué se toma de cada una
   - Tipografía (display + texto, con motivo) y paleta (4–6 colores con nombre y rol)
   - Macro-estructura del hero y de la página (wireframe ASCII)
   - Firma: la ÚNICA cosa audaz de esta dirección
   - Riesgos y a quién NO le funcionaría
3. Construye para cada una UN archivo `design/directions/<slug>.html`: solo el hero
   (o la pantalla clave) a 1440px, con contenido real (sin lorem ipsum).
4. Con Playwright, toma screenshot de cada HTML a 1440 y 375 → `design/directions/<slug>-<ancho>.png`.
5. Autocrítica: puntúa cada una 1–10 en distintividad, adecuación a la audiencia,
   legibilidad y viabilidad técnica. Señala cuál se parece más a "una landing hecha por IA".
6. DETENTE. Muestra la tabla y las rutas de los PNG. No construyas nada más hasta que
   el usuario elija una dirección (o una mezcla explícita).
