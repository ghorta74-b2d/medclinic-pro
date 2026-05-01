import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 600 }
export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 600,
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Isotipo */}
        <svg width="100" height="90" viewBox="0 0 1181 1057" fill="none" style={{ marginBottom: 28 }}>
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
            fontSize: 68,
            fontWeight: 700,
            color: '#1d1d1f',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          Mediaclinic
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: '#6e6e73',
            textAlign: 'center',
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          Software para Clínicas Médicas en México
        </div>
      </div>
    ),
    { ...size },
  )
}
