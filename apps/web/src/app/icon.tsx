import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="26" height="24" viewBox="0 0 1181 1057" fill="none">
          <path
            d="M204 601H344L407 456L503 858L624 211L727 608L817 391L906 582H1028"
            stroke="#438EE8"
            strokeWidth="63"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
