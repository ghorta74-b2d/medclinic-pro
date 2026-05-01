export interface AuthFeature {
  icon: React.ReactNode
  text: string
}

interface AuthSplitLayoutProps {
  headline: string
  subline?: string
  features?: AuthFeature[]
  children: React.ReactNode
}

const SF_PRO = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"

const PANEL_BG: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px),
    linear-gradient(135deg, #1e1b4b 0%, #3730a3 38%, #5b21b6 72%, #7c3aed 100%)
  `,
  backgroundSize: '40px 40px, 40px 40px, 100% 100%',
}

export function AuthSplitLayout({ headline, subline, features, children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: SF_PRO }}>

      {/* Left panel — hidden below lg */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12" style={PANEL_BG}>
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.svg" alt="Mediaclinic" className="w-auto object-contain object-left" style={{ height: '46px' }} />

        {/* Headline + subline + features */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white leading-tight max-w-sm">{headline}</h2>
            {subline && (
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">{subline}</p>
            )}
          </div>

          {features && features.length > 0 && (
            <ul className="space-y-3">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    {f.icon}
                  </div>
                  <span className="text-white/80 text-sm">{f.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <p className="text-white/35 text-xs">
          © 2026 MediaClinic · Powered by{' '}
          <span className="font-semibold text-white/55">B2D Automation</span>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white" style={{ fontFamily: SF_PRO }}>
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

    </div>
  )
}
