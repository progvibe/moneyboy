"use client"

import { useState } from "react"
import type { MouseEvent } from "react"

type TickerQuickLookProps = {
  ticker: string
}

export function TickerQuickLook({ ticker }: TickerQuickLookProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const normalizedTicker = ticker.trim().toUpperCase()

  const handleOpen = async (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    event?.stopPropagation()
    setOpen(true)
    if (summary) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/ticker-summary?ticker=${encodeURIComponent(normalizedTicker)}`,
      )
      const data = (await res.json()) as { summary?: string }
      setSummary(data.summary ?? "Summary unavailable.")
    } catch (error) {
      console.error(error)
      setSummary("Failed to load summary.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-[10px] rounded-full border border-[#414868] bg-[#1a1b26] px-2 py-0.5 text-[#7aa2f7] hover:border-[#7aa2f7]"
      >
        {normalizedTicker}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#414868] bg-[#1f2335] p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#c0caf5]">
                {normalizedTicker} · Last 7 days
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-[#a9b1d6]/70 hover:text-[#c0caf5]"
              >
                Close
              </button>
            </div>
            <div className="text-xs text-[#a9b1d6] whitespace-pre-wrap">
              {loading ? "Loading summary..." : summary}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
