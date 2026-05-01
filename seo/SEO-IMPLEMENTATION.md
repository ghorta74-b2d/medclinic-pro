# SEO Implementation Handoff — Mediaclinic

**Sprint:** Fase 1 — Landing única  
**URL objetivo:** `mediaclinic.mx` (root `/`, preview en `/landing2`)  
**Fecha:** 2026-05-01

---

## Resumen ejecutivo

Se implementó la infraestructura SEO técnica completa y la nueva landing page optimizada en `/landing2`. La landing actual en `/` no fue modificada y sirve como respaldo.

### Qué se implementó

| Área | Archivo(s) | Estado |
|---|---|---|
| Metadata SEO global | `app/layout.tsx` | ✅ Completo |
| Metadata por página | `app/landing2/page.tsx` | ✅ Completo |
| Landing SEO `/landing2` | `app/landing2/landing2-client.tsx` | ✅ Completo |
| JSON-LD schemas | `components/seo/JsonLd.tsx` | ✅ Completo |
| Sitemap | `app/sitemap.ts` | ✅ Completo |
| Robots.txt | `app/robots.ts` | ✅ Completo |
| Web App Manifest | `app/manifest.ts` | ✅ Completo |
| Favicon / App Icon | `app/icon.tsx` | ✅ ImageResponse |
| Apple Touch Icon | `app/apple-icon.tsx` | ✅ ImageResponse |
| OG Image (1200×630) | `app/opengraph-image.tsx` | ✅ ImageResponse |
| Twitter Card (1200×600) | `app/twitter-image.tsx` | ✅ ImageResponse |
| Keyword strategy | `seo/keyword-strategy.md` | ✅ Completo |

### Schemas JSON-LD implementados (en `/landing2`)

- `Organization` — nombre, URL, logo, área de servicio México
- `SoftwareApplication` — categoría MedicalApplication, oferta MXN
- `WebSite` — nombre, URL, idioma es-MX
- `FAQPage` — 8 preguntas con respuestas completas

### Copy SEO implementado

- **H1 único:** "La clínica del futuro, disponible hoy."
- **10 secciones** con H2/H3 correctamente jerarquizados
- **8 FAQ** con acordeón accesible (aria-expanded) + JSON-LD
- Keyword principal y variantes distribuidas en body, H2, H3, FAQ, cierre
- Alt text descriptivo en todas las imágenes/logos

---

## Checklist de tareas pendientes (requieren acción humana)

### Urgentes (antes de apuntar `/` a la nueva landing)

- [ ] **Google Search Console:** verificar el sitio con TXT en DNS o meta tag.
  - Reemplazar `PLACEHOLDER_GOOGLE_SEARCH_CONSOLE` en `app/layout.tsx` con el token real.
  - URL de GSC: https://search.google.com/search-console
- [ ] **Enviar sitemap desde GSC:** Settings → Sitemaps → `https://mediaclinic.mx/sitemap.xml`
- [ ] **GA4 Measurement ID:** descomentar el script en `app/layout.tsx` y reemplazar `G-XXXXXXXXXX` con el ID real.
- [ ] **Bing Webmaster Tools:** reemplazar `PLACEHOLDER_BING` en `app/layout.tsx`.
  - URL: https://www.bing.com/webmasters
- [ ] **Validar JSON-LD:** https://search.google.com/test/rich-results
  - Probar con la URL de producción una vez desplegada.
- [ ] **Validar OG image:** https://opengraph.xyz — pegar `https://mediaclinic.mx/landing2`
- [ ] **favicon.ico estático (legacy):** generar con https://favicon.io a partir del PNG del `icon.tsx`.
  - Colocar en `apps/web/public/favicon.ico`

### Post-validación

- [ ] **Intercambiar landing:** cuando `/landing2` esté aprobada, cambiar `apps/web/src/app/page.tsx` para que exporte `landing2-client` en lugar de `landing/page`.
- [ ] **Actualizar canonical** en `landing2/page.tsx` de `/landing2` a `/` al hacer el swap.
- [ ] **PWA icons (192×512):** para uso en manifest como iconos de app instalable, generar PNGs con script sharp y agregarlos a `public/icons/`.

---

## Scores objetivo Lighthouse

| Métrica | Objetivo | Notas |
|---|---|---|
| Performance | ≥ 95 | Video autoplay no bloquea LCP; lazy-load below-fold |
| Accessibility | ≥ 95 | aria-labels en botones icono, aria-expanded en FAQ |
| Best Practices | ≥ 95 | HTTPS, no mixed content |
| SEO | 100 | Meta completo, canonical, hreflang, robots |

> Para correr Lighthouse: Chrome DevTools → Lighthouse → Mobile → Analizar.

---

## Roadmap SEO Post-Launch

### Mes 1 — Indexación y baseline
- Verificar indexación en GSC: `site:mediaclinic.mx`
- Monitorear posición promedio para keyword principal
- Configurar alertas de CTR en GSC
- **KPI objetivo:** primera aparición en TOP 20 para "software para clínicas médicas México"

### Mes 3 — Autoridad y contenido
- Crear 3 artículos de blog: "Qué es el expediente clínico electrónico NOM-004", "Cómo cumplir con LFPDPPP en tu clínica", "Software médico con IA: cómo funciona"
- Iniciar link-building: directorios médicos MX (Doctoralia, Medscape MX), cámaras de salud
- Landing pages de especialidad: `/ginecologia`, `/pediatria`, `/dermatologia`
- **KPI objetivo:** TOP 10 keyword principal, 500+ sesiones orgánicas/mes

### Mes 6 — Expansión geográfica y conversión
- City pages: `/cdmx`, `/monterrey`, `/guadalajara`, `/puebla`
- Página de comparativa: `/vs-medesk`, `/vs-doctoralia`
- Optimización CRO: A/B test en CTAs hero
- **KPI objetivo:** TOP 5 keyword principal, 2,000+ sesiones orgánicas/mes, CR ≥ 2%

---

## Competidores monitoreados

| Competidor | Dominio | Debilidad principal |
|---|---|---|
| Doctoralia | doctoralia.mx | Directorio, no software |
| Medesk | medesk.net | Poca presencia MX |
| Clinic Cloud | cliniccloud.com | Mercado español |
| MediNet | medinet.com.mx | Sitio desactualizado |
| Ecaresoft | ecaresoft.com | Solo enterprise |
| Klivi | klivi.com | Solo telemedicina |
| Nubimed | nubimed.com | Poca autoridad |

---

## Archivos creados/modificados

```
apps/web/src/
├── app/
│   ├── layout.tsx                    ← MODIFICADO: metadata SEO completo
│   ├── sitemap.ts                    ← NUEVO
│   ├── robots.ts                     ← NUEVO
│   ├── manifest.ts                   ← NUEVO
│   ├── icon.tsx                      ← NUEVO (32×32 favicon)
│   ├── apple-icon.tsx                ← NUEVO (180×180)
│   ├── opengraph-image.tsx           ← NUEVO (1200×630)
│   ├── twitter-image.tsx             ← NUEVO (1200×600)
│   └── landing2/
│       ├── page.tsx                  ← NUEVO (Server Component + metadata)
│       └── landing2-client.tsx       ← NUEVO (landing SEO completa)
└── components/
    └── seo/
        └── JsonLd.tsx                ← NUEVO (schemas reutilizables)

seo/
├── keyword-strategy.md               ← NUEVO
└── SEO-IMPLEMENTATION.md             ← NUEVO (este archivo)

NO MODIFICADOS:
├── app/page.tsx                      ← sin cambios
└── app/landing/page.tsx              ← sin cambios
```
