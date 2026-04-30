'use client'

/**
 * HoverGistProvider
 *
 * Safely loads the HoverGist vanilla-JS SDK in a Next.js app.
 *
 * Why a dynamic <script> tag instead of a static import?
 *   The SDK is an IIFE that calls document / window / localStorage immediately
 *   at evaluation time.  Next.js evaluates modules on the server where those
 *   globals don't exist, which would crash the SSR render.  By injecting a
 *   <script> tag inside useEffect we guarantee the code only runs on the
 *   client, after hydration is complete.
 *
 * Usage (in layout.tsx):
 *   <HoverGistProvider
 *     apiKey={process.env.NEXT_PUBLIC_HOVERGIST_API_KEY}
 *     backendUrl={process.env.NEXT_PUBLIC_HOVERGIST_BACKEND_URL}
 *     showOnboarding={true}
 *   />
 */

import { useEffect } from 'react'

/* ── Types ──────────────────────────────────────────────────────────────── */

interface HoverGistConfig {
  apiKey?: string
  backendUrl?: string
  showOnboarding?: boolean
  triggerKey?: string
  highlightColor?: string
  theme?: 'dark' | 'light' | 'auto'
  maxWords?: number
  tooltipMaxWidth?: number
}

// Extend Window so TypeScript knows about the SDK globals
declare global {
  interface Window {
    HoverGist?: {
      init: (cfg: HoverGistConfig) => Window['HoverGist']
      destroy: () => void
      showOnboarding: (opts?: Partial<HoverGistConfig>) => void
      hideOnboarding: () => void
      activate: () => Window['HoverGist']
      deactivate: () => Window['HoverGist']
    }
    __hoverGistLoaded?: boolean
  }
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function HoverGistProvider({
  apiKey = 'hg_demo_key_00000000',
  backendUrl = 'http://localhost:3001',
  showOnboarding = true,
  triggerKey = 'Alt',
  highlightColor = '#6366f1',
  theme = 'dark',
  maxWords = 120,
  tooltipMaxWidth = 360,
}: HoverGistConfig) {

  useEffect(() => {
    const cfg: HoverGistConfig = {
      apiKey,
      backendUrl,
      showOnboarding,
      triggerKey,
      highlightColor,
      theme,
      maxWords,
      tooltipMaxWidth,
    }

    /**
     * If the script was already injected (e.g. React Strict Mode double-mount),
     * just call init() directly — no need to re-inject the <script> tag.
     */
    if (window.__hoverGistLoaded) {
      window.HoverGist?.init(cfg)
      return
    }

    // Inject the SDK as a regular browser <script> so it runs client-only.
    const script = document.createElement('script')
    script.src = '/hovergist.sdk.js'
    script.async = true
    script.id = 'hovergist-sdk-script'

    script.onload = () => {
      window.__hoverGistLoaded = true
      window.HoverGist?.init(cfg)
    }

    script.onerror = () => {
      console.error(
        '[HoverGistProvider] Failed to load /hovergist.sdk.js. ' +
        'Make sure the file exists in your public/ directory.'
      )
    }

    document.head.appendChild(script)

    // Cleanup: destroy the SDK when the component unmounts (e.g. page change)
    return () => {
      window.HoverGist?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // Run once on mount — config values are read at init time

  // This component renders nothing into the DOM
  return null
}
