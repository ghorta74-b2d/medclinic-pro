'use client'

import { Copy, Download, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  receiptId: string
  publicUrl: string
  pdfUrl: string | null
  expired: boolean
}

export function RxActions({ receiptId, publicUrl, pdfUrl, expired }: Props) {
  function handleCopy() {
    navigator.clipboard?.writeText(receiptId).catch(() => {})
  }

  function handleShare() {
    navigator.share?.({ title: 'Mi receta médica', url: publicUrl }).catch(() => {})
  }

  return (
    <>
      <div className="flex gap-2 pt-1 flex-wrap">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copiar ID
        </button>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar PDF
          </a>
        )}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Compartir
        </button>
      </div>

      {!expired && (
        <div className="flex flex-col items-center pt-2 border-t border-border">
          <QRCodeSVG value={publicUrl} size={120} level="M" className="rounded" />
          <p className="text-[10px] text-muted-foreground mt-2">Escanea para compartir esta receta</p>
        </div>
      )}
    </>
  )
}
