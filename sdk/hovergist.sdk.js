/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║              HoverGist SDK  v1.1.0                       ║
 * ║  Embed AI-powered section summarization on any website   ║
 * ║                                                          ║
 * ║  Usage:                                                  ║
 * ║    <script src="hovergist.sdk.js"></script>              ║
 * ║    <script>                                              ║
 * ║      HoverGist.init({                                    ║
 * ║        apiKey: 'hg_your_key',                            ║
 * ║        backendUrl: 'http://localhost:3001',              ║
 * ║      });                                                 ║
 * ║    </script>                                             ║
 * ╚══════════════════════════════════════════════════════════╝
 */

(function (global) {
  'use strict';

  // ── Default Configuration ──────────────────────────────────────────────────
  const DEFAULTS = {
    apiKey: '',
    backendUrl: 'http://localhost:3001',
    triggerKey: 'Alt',
    theme: 'dark',            // 'dark' | 'light' | 'auto'
    highlightColor: '#6366f1',
    maxWords: 120,
    minChars: 20,
    tooltipMaxWidth: 360,
    animationDuration: 220,   // ms
    onGist: null,             // callback(gist, element)
    onError: null,            // callback(error, element)
    onActivate: null,         // callback()
    onDeactivate: null,       // callback()
    targetSelector: null,     // CSS selector to limit hovered elements (null = all)
    excludeSelector: 'script,style,noscript,meta,head,br,hr',
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let config = {};
  let isActive = false;
  let isLoading = false;
  let currentElement = null;
  let tooltipEl = null;
  let overlayEl = null;
  let activeBadgeEl = null;
  let abortController = null;
  let usageStats = { used: 0, remaining: 200, limit: 200, resetAt: null };

  // ── Inject Styles ──────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('hovergist-styles')) return;

    const css = `
      /* ── HoverGist Core Styles ── */
      .hg-highlight {
        outline: 2px solid var(--hg-color) !important;
        outline-offset: 3px !important;
        border-radius: 4px !important;
        cursor: crosshair !important;
        transition: outline 0.15s ease, background 0.15s ease !important;
        background: color-mix(in srgb, var(--hg-color) 8%, transparent) !important;
      }

      .hg-active-hover {
        outline: 2.5px solid var(--hg-color) !important;
        background: color-mix(in srgb, var(--hg-color) 14%, transparent) !important;
      }

      /* ── Tooltip ── */
      #hg-tooltip {
        position: fixed;
        z-index: 2147483647;
        max-width: var(--hg-tooltip-width, 360px);
        min-width: 220px;
        border-radius: 14px;
        padding: 0;
        pointer-events: none;
        opacity: 0;
        transform: translateY(8px) scale(0.97);
        transition: opacity var(--hg-anim)ms cubic-bezier(.4,0,.2,1),
                    transform var(--hg-anim)ms cubic-bezier(.4,0,.2,1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }

      #hg-tooltip.hg-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      /* Dark theme */
      #hg-tooltip.hg-dark {
        background: rgba(15, 15, 25, 0.96);
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4),
                    inset 0 1px 0 rgba(255,255,255,0.06);
        color: #e8e8f0;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
      }

      /* Light theme */
      #hg-tooltip.hg-light {
        background: rgba(255,255,255,0.97);
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
        color: #1a1a2e;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
      }

      /* Header bar */
      #hg-tooltip .hg-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px 8px;
        border-bottom: 1px solid rgba(128,128,128,0.15);
      }

      #hg-tooltip .hg-logo {
        width: 18px;
        height: 18px;
        border-radius: 5px;
        background: var(--hg-color);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 10px;
      }

      #hg-tooltip .hg-title {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        opacity: 0.6;
        flex: 1;
      }

      #hg-tooltip .hg-usage {
        font-size: 10px;
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
      }

      /* Body */
      #hg-tooltip .hg-body {
        padding: 12px 14px 14px;
        font-size: 13.5px;
        line-height: 1.65;
      }

      /* Loading shimmer */
      #hg-tooltip .hg-loading {
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 12px 14px 14px;
      }

      #hg-tooltip .hg-shimmer {
        height: 12px;
        border-radius: 6px;
        background: linear-gradient(90deg, rgba(128,128,128,0.15) 25%,
                    rgba(128,128,128,0.3) 50%, rgba(128,128,128,0.15) 75%);
        background-size: 200% 100%;
        animation: hg-shimmer 1.4s infinite;
      }
      #hg-tooltip .hg-shimmer:nth-child(2) { width: 85%; }
      #hg-tooltip .hg-shimmer:nth-child(3) { width: 70%; }

      @keyframes hg-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Error state */
      #hg-tooltip .hg-error {
        padding: 12px 14px 14px;
        font-size: 13px;
        color: #f87171;
      }

      /* ── Active Badge ── */
      #hg-active-badge {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483646;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px 9px 12px;
        border-radius: 100px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        user-select: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        animation: hg-badge-in 0.3s cubic-bezier(.34,1.56,.64,1);
      }

      #hg-active-badge.hg-dark {
        background: rgba(15,15,25,0.95);
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        backdrop-filter: blur(16px);
      }

      #hg-active-badge.hg-light {
        background: rgba(255,255,255,0.97);
        border: 1px solid rgba(0,0,0,0.1);
        color: #1a1a2e;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        backdrop-filter: blur(16px);
      }

      #hg-active-badge:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(0,0,0,0.35);
      }

      #hg-active-badge .hg-pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--hg-color);
        position: relative;
      }

      #hg-active-badge .hg-pulse::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        background: var(--hg-color);
        opacity: 0.35;
        animation: hg-pulse 1.5s ease infinite;
      }

      @keyframes hg-pulse {
        0%, 100% { transform: scale(1); opacity: 0.35; }
        50% { transform: scale(1.6); opacity: 0; }
      }

      @keyframes hg-badge-in {
        from { transform: translateY(20px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      /* ── Cursor override when active ── */
      body.hg-mode * {
        cursor: crosshair !important;
      }
    `;

    const style = document.createElement('style');
    style.id = 'hovergist-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Resolve Theme ──────────────────────────────────────────────────────────
  function resolveTheme() {
    if (config.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return config.theme || 'dark';
  }

  // ── Create Tooltip ─────────────────────────────────────────────────────────
  function createTooltip() {
    if (tooltipEl) return;

    tooltipEl = document.createElement('div');
    tooltipEl.id = 'hg-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(tooltipEl);
  }

  // ── Position Tooltip ───────────────────────────────────────────────────────
  function positionTooltip(targetEl) {
    if (!tooltipEl) return;

    const rect = targetEl.getBoundingClientRect();
    const gap = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tipW = config.tooltipMaxWidth;
    const tipH = tooltipEl.offsetHeight || 120;

    let top, left;

    // Try below
    if (rect.bottom + gap + tipH < vh) {
      top = rect.bottom + gap;
    } else {
      // Try above
      top = rect.top - gap - tipH;
    }

    // Horizontal: align with element, clamp to viewport
    left = rect.left;
    if (left + tipW > vw - 16) left = vw - tipW - 16;
    if (left < 16) left = 16;

    tooltipEl.style.top = `${Math.max(8, top)}px`;
    tooltipEl.style.left = `${left}px`;
  }

  // ── Show Tooltip ───────────────────────────────────────────────────────────
  function showTooltip(state, content) {
    if (!tooltipEl) createTooltip();

    const theme = resolveTheme();
    tooltipEl.className = `hg-${theme}`;

    const usageText = `${usageStats.remaining}/${usageStats.limit} left`;

    const header = `
      <div class="hg-header">
        <div class="hg-logo">✦</div>
        <span class="hg-title">HoverGist</span>
        <span class="hg-usage">${usageText}</span>
      </div>`;

    if (state === 'loading') {
      tooltipEl.innerHTML = `${header}
        <div class="hg-loading">
          <div class="hg-shimmer"></div>
          <div class="hg-shimmer"></div>
          <div class="hg-shimmer"></div>
        </div>`;
    } else if (state === 'result') {
      tooltipEl.innerHTML = `${header}
        <div class="hg-body">${escapeHTML(content)}</div>`;
    } else if (state === 'error') {
      tooltipEl.innerHTML = `${header}
        <div class="hg-error">⚠ ${escapeHTML(content)}</div>`;
    }

    // Make visible (needs a frame to animate)
    requestAnimationFrame(() => {
      tooltipEl.classList.add('hg-visible');
    });
  }

  // ── Hide Tooltip ───────────────────────────────────────────────────────────
  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove('hg-visible');
  }

  // ── Active Badge ───────────────────────────────────────────────────────────
  function showActiveBadge() {
    if (activeBadgeEl) return;

    const theme = resolveTheme();
    activeBadgeEl = document.createElement('div');
    activeBadgeEl.id = 'hg-active-badge';
    activeBadgeEl.className = `hg-${theme}`;
    activeBadgeEl.innerHTML = `
      <div class="hg-pulse"></div>
      <span>HoverGist Active — click any section</span>`;
    activeBadgeEl.title = 'Click to deactivate HoverGist';
    activeBadgeEl.addEventListener('click', deactivate);
    document.body.appendChild(activeBadgeEl);
  }

  function hideActiveBadge() {
    if (activeBadgeEl) {
      activeBadgeEl.remove();
      activeBadgeEl = null;
    }
  }

  // ── Element Eligibility ────────────────────────────────────────────────────
  function isEligible(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (el.closest('#hg-tooltip, #hg-active-badge')) return false;
    if (el.matches(config.excludeSelector)) return false;
    if (config.targetSelector && !el.closest(config.targetSelector)) return false;

    // Needs meaningful text
    const text = extractText(el);
    return text.length >= config.minChars;
  }

  // ── Extract Text ───────────────────────────────────────────────────────────
  function extractText(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  // ── Escape HTML ────────────────────────────────────────────────────────────
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Activate ───────────────────────────────────────────────────────────────
  function activate() {
    if (isActive) return;
    isActive = true;
    document.body.classList.add('hg-mode');
    showActiveBadge();
    config.onActivate && config.onActivate();
    console.info('[HoverGist] Activated — click any section to get its gist.');
  }

  // ── Deactivate ─────────────────────────────────────────────────────────────
  function deactivate() {
    if (!isActive) return;
    isActive = false;
    isLoading = false;

    if (abortController) { abortController.abort(); abortController = null; }

    document.body.classList.remove('hg-mode');
    hideTooltip();
    hideActiveBadge();
    unhighlightAll();

    config.onDeactivate && config.onDeactivate();
    console.info('[HoverGist] Deactivated.');
  }

  // ── Highlight element ──────────────────────────────────────────────────────
  function highlightElement(el) {
    unhighlightAll();
    if (!el) return;
    el.classList.add('hg-highlight', 'hg-active-hover');
    currentElement = el;
  }

  function unhighlightAll() {
    document.querySelectorAll('.hg-highlight').forEach(el => {
      el.classList.remove('hg-highlight', 'hg-active-hover');
    });
    currentElement = null;
  }

  // ── Fetch Gist from API ────────────────────────────────────────────────────
  async function fetchGist(el) {
    if (isLoading) {
      if (abortController) abortController.abort();
    }

    const text = extractText(el);
    if (!text || text.length < config.minChars) return;

    isLoading = true;
    abortController = new AbortController();

    positionTooltip(el);
    showTooltip('loading');

    try {
      const response = await fetch(`${config.backendUrl}/api/gist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify({
          text,
          elementTag: el.tagName.toLowerCase(),
          context: document.title || '',
          maxWords: config.maxWords,
        }),
        signal: abortController.signal,
      });

      const data = await response.json();

      // Update usage stats from headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const limit     = response.headers.get('X-RateLimit-Limit');
      const used      = response.headers.get('X-RateLimit-Used');
      const resetAt   = response.headers.get('X-RateLimit-Reset');
      if (remaining !== null) usageStats.remaining = parseInt(remaining, 10);
      if (limit     !== null) usageStats.limit     = parseInt(limit, 10);
      if (used      !== null) usageStats.used      = parseInt(used, 10);
      if (resetAt   !== null) usageStats.resetAt   = resetAt;

      if (!response.ok) {
        const errMsg = data.message || data.error || `API error ${response.status}`;
        showTooltip('error', errMsg);
        config.onError && config.onError(new Error(errMsg), el);
        return;
      }

      positionTooltip(el);
      showTooltip('result', data.gist);
      config.onGist && config.onGist(data.gist, el);

    } catch (err) {
      if (err.name === 'AbortError') return;

      const msg = err.message.includes('fetch')
        ? 'Cannot reach HoverGist backend. Is the server running?'
        : err.message;

      showTooltip('error', msg);
      config.onError && config.onError(err, el);
    } finally {
      isLoading = false;
      abortController = null;
    }
  }

  // ── Event Handlers ─────────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === config.triggerKey && !e.repeat) {
      e.preventDefault();
      if (isActive) {
        deactivate();
      } else {
        activate();
      }
    }

    if (e.key === 'Escape' && isActive) {
      deactivate();
    }
  }

  function onMouseOver(e) {
    if (!isActive) return;
    const el = e.target.closest('[data-hg-target], section, article, main, aside, header, footer, p, li, div, h1, h2, h3, h4, h5, h6') || e.target;
    if (!isEligible(el)) return;
    highlightElement(el);
  }

  function onMouseOut(e) {
    if (!isActive) return;
    const el = e.target;
    if (currentElement === el || currentElement?.contains(el)) {
      // Don't remove until we move to an ineligible element
    }
  }

  function onClick(e) {
    if (!isActive) return;

    const el = e.target.closest('[data-hg-target], section, article, main, aside, header, footer, p, li, div, h1, h2, h3, h4, h5, h6') || e.target;
    if (!isEligible(el)) return;

    e.preventDefault();
    e.stopPropagation();

    highlightElement(el);
    fetchGist(el);
  }

  function onScroll() {
    if (currentElement && tooltipEl?.classList.contains('hg-visible')) {
      positionTooltip(currentElement);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  const HoverGist = {
    /**
     * Initialize HoverGist SDK.
     * @param {Object} userConfig - Configuration options
     */
    init(userConfig = {}) {
      if (!userConfig.apiKey) {
        console.warn('[HoverGist] No apiKey provided. Using demo key.');
        userConfig.apiKey = 'hg_demo_key_00000000';
      }

      config = Object.assign({}, DEFAULTS, userConfig);

      // Set CSS custom properties
      const root = document.documentElement;
      root.style.setProperty('--hg-color', config.highlightColor);
      root.style.setProperty('--hg-tooltip-width', `${config.tooltipMaxWidth}px`);
      root.style.setProperty('--hg-anim', config.animationDuration);

      injectStyles();
      createTooltip();

      // Bind events
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('mouseover', onMouseOver, { passive: true });
      document.addEventListener('mouseout', onMouseOut, { passive: true });
      document.addEventListener('click', onClick, true);
      window.addEventListener('scroll', onScroll, { passive: true });

      console.info(
        `%c HoverGist SDK v1.1.0 %c Initialized | Press ${config.triggerKey} to activate `,
        'background:#6366f1;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:600',
        'background:#1e1e2e;color:#a5b4fc;padding:2px 8px;border-radius:0 4px 4px 0'
      );

      return this;
    },

    /**
     * Programmatically activate hover mode.
     */
    activate() { activate(); return this; },

    /**
     * Programmatically deactivate hover mode.
     */
    deactivate() { deactivate(); return this; },

    /**
     * Check if hover mode is currently active.
     */
    isActive() { return isActive; },

    /**
     * Update configuration after init.
     */
    configure(partialConfig) {
      config = Object.assign(config, partialConfig);
      if (partialConfig.highlightColor) {
        document.documentElement.style.setProperty('--hg-color', partialConfig.highlightColor);
      }
      return this;
    },

    /**
     * Get current API usage stats.
     */
    getUsage() { return { ...usageStats }; },

    /**
     * Destroy the SDK and clean up all listeners.
     */
    destroy() {
      deactivate();
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll);
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
      const styles = document.getElementById('hovergist-styles');
      if (styles) styles.remove();
      console.info('[HoverGist] Destroyed.');
    },

    version: '1.1.0',
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HoverGist; // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define([], () => HoverGist); // AMD
  } else {
    global.HoverGist = HoverGist; // Browser global
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
