import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Isotipo */}
        <svg width="120" height="108" viewBox="0 0 1181 1057" fill="none" style={{ marginBottom: 32 }}>
          <path
            d="M204 601H344L407 456L503 858L624 211L727 608L817 391L906 582H1028"
            stroke="#438EE8"
            strokeWidth="63"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-2px',
            marginBottom: 20,
          }}
        >
          Mediaclinic
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#6e6e73',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Software para Clínicas Médicas en México
        </div>

        {/* Pill badges */}
        <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
          {['NOM-004', 'LFPDPPP', 'IA Nativa', 'CFDI 4.0'].map((badge) => (
            <div
              key={badge}
              style={{
                background: '#f5f5f7',
                color: '#1d1d1f',
                fontSize: 20,
                fontWeight: 600,
                padding: '10px 22px',
                borderRadius: 100,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  )
}
