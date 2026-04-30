/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                  HoverGist SDK  v2.0.0                           ║
 * ║  AI-powered section summarizer + built-in onboarding popup       ║
 * ║                                                                  ║
 * ║  Quick Start:                                                    ║
 * ║    <script src="hovergist.sdk.js"></script>                      ║
 * ║    <script>                                                      ║
 * ║      HoverGist.init({                                            ║
 * ║        apiKey: 'hg_your_key',                                    ║
 * ║        backendUrl: 'http://localhost:3001',                      ║
 * ║        showOnboarding: true,   // show tutorial on first visit   ║
 * ║      });                                                         ║
 * ║    </script>                                                     ║
 * ║                                                                  ║
 * ║  Manual onboarding:                                              ║
 * ║      HoverGist.showOnboarding();                                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
(function (global) {
  'use strict';

  // ════════════════════════════════════════════════════════════════════
  //  SECTION 1 — ONBOARDING POPUP
  // ════════════════════════════════════════════════════════════════════

  const OB = (function () {

    let obConfig   = {};
    let obRootEl   = null;
    let obRunning  = false;
    let obRunId    = 0;

    // ── Font ────────────────────────────────────────────────────────
    function injectFont() {
      if (document.getElementById('hgo-font')) return;
      const l = document.createElement('link');
      l.id   = 'hgo-font';
      l.rel  = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap';
      document.head.appendChild(l);
    }

    // ── Styles ──────────────────────────────────────────────────────
    function injectStyles(c) {
      if (document.getElementById('hgo-ob-styles')) return;
      const css = `
        #hgo-ob-backdrop {
          position: fixed; inset: 0; z-index: 2147483641;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          opacity: 0; transition: opacity 0.4s ease;
        }
        #hgo-ob-backdrop.hgo-ob-in { opacity: 1; }

        #hgo-ob-modal {
          position: relative; width: 500px; max-width: calc(100vw - 32px);
          background: #0a0a18; border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset,
                      0 40px 100px rgba(0,0,0,0.85),
                      0 0 80px rgba(99,102,241,0.1);
          overflow: hidden;
          transform: translateY(32px) scale(0.94); opacity: 0;
          transition: transform 0.52s cubic-bezier(.34,1.2,.64,1), opacity 0.4s ease;
          font-family: 'Syne', system-ui, sans-serif; color: #e8e8f0;
        }
        #hgo-ob-modal.hgo-ob-in { transform: translateY(0) scale(1); opacity: 1; }
        #hgo-ob-modal::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, ${c} 40%, ${c} 60%, transparent);
          opacity: 0.8; z-index: 2;
        }
        #hgo-ob-modal::after {
          content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(99,102,241,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.025) 1px, transparent 1px);
          background-size: 32px 32px; pointer-events: none; z-index: 0;
        }
        .hgo-ob-inner { position: relative; z-index: 1; }

        /* Header */
        .hgo-ob-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 24px 0;
        }
        .hgo-ob-brand { display: flex; align-items: center; gap: 10px; }
        .hgo-ob-logo {
          width: 34px; height: 34px; border-radius: 10px; background: ${c};
          display: flex; align-items: center; justify-content: center; font-size: 16px;
          box-shadow: 0 4px 18px rgba(99,102,241,0.5); flex-shrink: 0;
          animation: hgo-ob-float 3.2s ease-in-out infinite;
        }
        @keyframes hgo-ob-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .hgo-ob-brand-name {
          font-size: 15px; font-weight: 800; letter-spacing: -0.3px;
          background: linear-gradient(135deg,#fff 20%,rgba(165,180,252,0.8));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .hgo-ob-brand-sub {
          font-family: 'DM Mono', monospace; font-size: 9px; color: ${c};
          opacity: 0.65; letter-spacing: 0.6px; margin-top: 1px;
        }
        .hgo-ob-closebtn {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.35); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; transition: all 0.2s; line-height: 1;
        }
        .hgo-ob-closebtn:hover { background: rgba(255,255,255,0.09); color: #fff; }

        /* Title */
        .hgo-ob-title { padding: 18px 24px 0; }
        .hgo-ob-title h2 {
          font-size: 20px; font-weight: 800; letter-spacing: -0.4px; line-height: 1.25; color: #fff;
        }
        .hgo-ob-title p {
          margin-top: 5px; font-family: 'DM Mono', monospace;
          font-size: 11.5px; color: rgba(255,255,255,0.38); line-height: 1.5;
        }

        /* Stage */
        .hgo-ob-stage {
          margin: 18px 24px; border-radius: 14px;
          background: rgba(255,255,255,0.018); border: 1px solid rgba(255,255,255,0.07);
          height: 192px; position: relative; overflow: hidden;
        }
        .hgo-ob-chrome {
          display: flex; align-items: center; gap: 5px; padding: 8px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);
        }
        .hgo-ob-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.1); }
        .hgo-ob-urlbar { flex: 1; height: 16px; border-radius: 4px; background: rgba(255,255,255,0.05); margin: 0 8px; }
        .hgo-ob-fakecontent { padding: 12px 14px; pointer-events: none; user-select: none; }
        .hgo-ob-fakelabel {
          font-family: 'DM Mono', monospace; font-size: 8.5px; letter-spacing: 1.5px;
          text-transform: uppercase; color: rgba(99,102,241,0.42); margin-bottom: 6px;
        }
        .hgo-ob-target {
          padding: 9px 11px; border-radius: 7px;
          transition: outline 0.28s ease, background 0.28s ease;
        }
        .hgo-ob-target.hgo-ob-hovered {
          outline: 2px solid ${c}; outline-offset: 2px; background: rgba(99,102,241,0.1);
        }
        .hgo-ob-fakeline {
          height: 9px; border-radius: 5px; background: rgba(255,255,255,0.09); margin-bottom: 7px;
        }

        /* Cursor */
        #hgo-ob-cursor {
          position: absolute; pointer-events: none; z-index: 10;
          width: 22px; height: 22px; opacity: 0;
          transition: opacity 0.3s ease, left 0.68s cubic-bezier(.4,0,.2,1), top 0.68s cubic-bezier(.4,0,.2,1);
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
        }
        #hgo-ob-cursor.hgo-ob-vis { opacity: 1; }

        /* Key visualizer */
        #hgo-ob-keyviz {
          position: absolute; bottom: 10px; right: 12px;
          display: flex; align-items: center; gap: 5px;
          opacity: 0; transition: opacity 0.3s; z-index: 10;
        }
        #hgo-ob-keyviz.hgo-ob-vis { opacity: 1; }
        .hgo-ob-keycap {
          font-family: 'DM Mono', monospace; font-size: 11.5px; font-weight: 500;
          padding: 4px 10px; border-radius: 6px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.14);
          border-bottom: 2.5px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.65);
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          transition: all 0.12s ease; white-space: nowrap;
        }
        .hgo-ob-keycap.hgo-ob-pressed {
          background: ${c}; border-color: rgba(99,102,241,0.7);
          border-bottom-color: ${c}; color: #fff;
          box-shadow: 0 0 22px rgba(99,102,241,0.6); transform: translateY(1px);
        }
        .hgo-ob-keysep { font-family: 'DM Mono', monospace; font-size: 9px; color: rgba(255,255,255,0.22); }

        /* Mini tooltip */
        #hgo-ob-tooltip {
          position: absolute; left: 12px; top: 112px; width: 212px;
          background: rgba(6,6,16,0.98); border: 1px solid rgba(99,102,241,0.32);
          border-radius: 12px; overflow: hidden;
          opacity: 0; transform: translateY(12px) scale(0.92);
          transition: opacity 0.38s cubic-bezier(.4,0,.2,1), transform 0.38s cubic-bezier(.34,1.1,.64,1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px rgba(99,102,241,0.2);
          z-index: 20; pointer-events: none;
        }
        #hgo-ob-tooltip.hgo-ob-show { opacity: 1; transform: translateY(0) scale(1); }
        .hgo-ob-tthead {
          display: flex; align-items: center; gap: 5px; padding: 6px 9px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .hgo-ob-tticon {
          width: 13px; height: 13px; background: ${c}; border-radius: 4px;
          display: flex; align-items: center; justify-content: center; font-size: 7px; flex-shrink: 0;
        }
        .hgo-ob-ttlabel {
          font-family: 'DM Mono', monospace; font-size: 8.5px; font-weight: 700;
          letter-spacing: 0.8px; text-transform: uppercase; opacity: 0.4; flex: 1;
        }
        .hgo-ob-ttusage { font-family: 'DM Mono', monospace; font-size: 8.5px; color: #34d399; opacity: 0.75; }
        .hgo-ob-ttbody { padding: 8px 9px 10px; min-height: 54px; }
        .hgo-ob-shimmerwrap { display: flex; flex-direction: column; gap: 6px; }
        .hgo-ob-shimmer {
          height: 8px; border-radius: 4px;
          background: linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.14) 50%,rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%; animation: hgo-ob-shimmer 1.4s infinite;
        }
        .hgo-ob-shimmer:nth-child(2) { width: 80%; }
        .hgo-ob-shimmer:nth-child(3) { width: 58%; }
        @keyframes hgo-ob-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        #hgo-ob-result {
          font-family: 'DM Mono', monospace; font-size: 10.5px; line-height: 1.62;
          color: rgba(232,232,240,0.85); display: none;
        }
        #hgo-ob-result.hgo-ob-vis { display: block; }

        /* Steps */
        .hgo-ob-steps { display: flex; gap: 8px; padding: 0 24px 18px; }
        .hgo-ob-step {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px;
          padding: 13px 8px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
          position: relative; overflow: hidden; transition: border-color 0.35s, box-shadow 0.35s;
        }
        .hgo-ob-step::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.1), transparent);
          opacity: 0; transition: opacity 0.35s;
        }
        .hgo-ob-step.hgo-ob-active { border-color: rgba(99,102,241,0.38); box-shadow: 0 0 20px rgba(99,102,241,0.1); }
        .hgo-ob-step.hgo-ob-active::before { opacity: 1; }
        .hgo-ob-step.hgo-ob-done { border-color: rgba(52,211,153,0.28); }
        .hgo-ob-step.hgo-ob-done::before {
          background: linear-gradient(135deg, rgba(52,211,153,0.07), transparent); opacity: 1;
        }
        .hgo-ob-stepnum {
          width: 24px; height: 24px; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.28);
          transition: all 0.35s; position: relative; z-index: 1; flex-shrink: 0;
        }
        .hgo-ob-step.hgo-ob-active .hgo-ob-stepnum { border-color:${c}; color:${c}; box-shadow:0 0 10px rgba(99,102,241,0.4); }
        .hgo-ob-step.hgo-ob-done  .hgo-ob-stepnum { background:#34d399; border-color:#34d399; color:#000; font-size:12px; }
        .hgo-ob-stepkey {
          font-family: 'DM Mono', monospace; font-size: 11px; padding: 3px 8px; border-radius: 5px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-bottom: 2px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.35);
          transition: all 0.35s; position: relative; z-index: 1; white-space: nowrap;
        }
        .hgo-ob-step.hgo-ob-active .hgo-ob-stepkey { background:rgba(99,102,241,0.18); border-color:rgba(99,102,241,0.45); color:#a5b4fc; }
        .hgo-ob-step.hgo-ob-done  .hgo-ob-stepkey { background:rgba(52,211,153,0.1); border-color:rgba(52,211,153,0.3); color:#34d399; }
        .hgo-ob-steplabel {
          font-size: 9.5px; font-weight: 600; color: rgba(255,255,255,0.25);
          text-align: center; line-height: 1.35; transition: color 0.35s; position: relative; z-index: 1;
        }
        .hgo-ob-step.hgo-ob-active .hgo-ob-steplabel { color: rgba(255,255,255,0.72); }
        .hgo-ob-step.hgo-ob-done  .hgo-ob-steplabel { color: rgba(52,211,153,0.65); }

        /* Status bar */
        .hgo-ob-statusbar {
          margin: 0 24px 16px; padding: 10px 14px; border-radius: 9px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 8px; min-height: 38px;
        }
        .hgo-ob-statusdot {
          width: 6px; height: 6px; border-radius: 50%; background: ${c};
          flex-shrink: 0; box-shadow: 0 0 6px ${c}; animation: hgo-ob-blink 1.5s ease infinite;
        }
        @keyframes hgo-ob-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .hgo-ob-statustext {
          font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.45);
        }

        /* Footer */
        .hgo-ob-footer {
          padding: 0 24px 22px; display: flex; align-items: center;
          justify-content: space-between; gap: 10px;
        }
        .hgo-ob-footerleft { display: flex; align-items: center; gap: 14px; }
        .hgo-ob-skip {
          font-family: 'Syne', sans-serif; font-size: 12px; color: rgba(255,255,255,0.28);
          cursor: pointer; border: none; background: none; padding: 0; transition: color 0.2s;
        }
        .hgo-ob-skip:hover { color: rgba(255,255,255,0.6); }
        .hgo-ob-replay {
          font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.22);
          cursor: pointer; border: none; background: none; padding: 0; transition: color 0.2s;
        }
        .hgo-ob-replay:hover { color: ${c}; }
        .hgo-ob-footerright { display: flex; align-items: center; gap: 10px; }
        .hgo-ob-progress { display: flex; align-items: center; gap: 5px; }
        .hgo-ob-pdot {
          width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.1); transition: all 0.32s;
        }
        .hgo-ob-pdot.hgo-ob-pd-active { background: ${c}; box-shadow: 0 0 6px ${c}; width: 14px; border-radius: 3px; }
        .hgo-ob-pdot.hgo-ob-pd-done   { background: #34d399; }
        .hgo-ob-cta {
          display: flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 10px;
          background: ${c}; border: none; color: #fff; font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.22s;
          box-shadow: 0 4px 20px rgba(99,102,241,0.42); letter-spacing: -0.2px;
        }
        .hgo-ob-cta:hover { background: #818cf8; transform: translateY(-1px); box-shadow: 0 6px 26px rgba(99,102,241,0.58); }
        .hgo-ob-cta:active { transform: translateY(0); }
      `;
      const el = document.createElement('style');
      el.id = 'hgo-ob-styles';
      el.textContent = css;
      document.head.appendChild(el);
    }

    // ── DOM ──────────────────────────────────────────────────────────
    function buildDOM(triggerKey) {
      const backdrop = document.createElement('div');
      backdrop.id = 'hgo-ob-backdrop';
      backdrop.innerHTML = `
        <div id="hgo-ob-modal">
          <div class="hgo-ob-inner">

            <div class="hgo-ob-header">
              <div class="hgo-ob-brand">
                <div class="hgo-ob-logo">✦</div>
                <div>
                  <div class="hgo-ob-brand-name">HoverGist</div>
                  <div class="hgo-ob-brand-sub">AI SECTION SUMMARIZER</div>
                </div>
              </div>
              <button class="hgo-ob-closebtn" id="hgo-ob-close">✕</button>
            </div>

            <div class="hgo-ob-title">
              <h2>Get the gist of anything,<br/>instantly.</h2>
              <p>Three keystrokes. Zero friction. Watch the demo.</p>
            </div>

            <div class="hgo-ob-stage" id="hgo-ob-stage">
              <div class="hgo-ob-chrome">
                <div class="hgo-ob-dot"></div>
                <div class="hgo-ob-dot"></div>
                <div class="hgo-ob-dot"></div>
                <div class="hgo-ob-urlbar"></div>
              </div>
              <div class="hgo-ob-fakecontent">
                <div class="hgo-ob-fakelabel">Article — Deep Learning</div>
                <div class="hgo-ob-target" id="hgo-ob-target">
                  <div class="hgo-ob-fakeline" style="width:100%"></div>
                  <div class="hgo-ob-fakeline" style="width:88%"></div>
                  <div class="hgo-ob-fakeline" style="width:72%"></div>
                </div>
              </div>
              <div id="hgo-ob-cursor" style="left:180px;top:28px">
                <svg viewBox="0 0 20 24" fill="none" width="22" height="22">
                  <path d="M1 1l6.5 18 3.5-6.5L18 16 1 1z" fill="white" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/>
                </svg>
              </div>
              <div id="hgo-ob-keyviz">
                <div class="hgo-ob-keycap" id="hgo-ob-key-trigger">${triggerKey}</div>
                <span class="hgo-ob-keysep">then</span>
                <div class="hgo-ob-keycap" id="hgo-ob-key-g">G</div>
              </div>
              <div id="hgo-ob-tooltip">
                <div class="hgo-ob-tthead">
                  <div class="hgo-ob-tticon">✦</div>
                  <span class="hgo-ob-ttlabel">HoverGist</span>
                  <span class="hgo-ob-ttusage">198/200</span>
                </div>
                <div class="hgo-ob-ttbody">
                  <div class="hgo-ob-shimmerwrap" id="hgo-ob-shimmer">
                    <div class="hgo-ob-shimmer"></div>
                    <div class="hgo-ob-shimmer"></div>
                    <div class="hgo-ob-shimmer"></div>
                  </div>
                  <div id="hgo-ob-result"></div>
                </div>
              </div>
            </div>

            <div class="hgo-ob-steps">
              <div class="hgo-ob-step" id="hgo-ob-s1">
                <div class="hgo-ob-stepnum" id="hgo-ob-n1">1</div>
                <div class="hgo-ob-stepkey">${triggerKey}</div>
                <div class="hgo-ob-steplabel">Activate<br/>Mode</div>
              </div>
              <div class="hgo-ob-step" id="hgo-ob-s2">
                <div class="hgo-ob-stepnum" id="hgo-ob-n2">2</div>
                <div class="hgo-ob-stepkey">Hover</div>
                <div class="hgo-ob-steplabel">Select<br/>Element</div>
              </div>
              <div class="hgo-ob-step" id="hgo-ob-s3">
                <div class="hgo-ob-stepnum" id="hgo-ob-n3">3</div>
                <div class="hgo-ob-stepkey">G</div>
                <div class="hgo-ob-steplabel">Generate<br/>Gist</div>
              </div>
            </div>

            <div class="hgo-ob-statusbar">
              <div class="hgo-ob-statusdot"></div>
              <div class="hgo-ob-statustext" id="hgo-ob-status">Initializing…</div>
            </div>

            <div class="hgo-ob-footer">
              <div class="hgo-ob-footerleft">
                <button class="hgo-ob-skip"   id="hgo-ob-skip">Skip tutorial</button>
                <button class="hgo-ob-replay" id="hgo-ob-replay">↺ Replay</button>
              </div>
              <div class="hgo-ob-footerright">
                <div class="hgo-ob-progress">
                  <div class="hgo-ob-pdot hgo-ob-pd-active" id="hgo-ob-pd1"></div>
                  <div class="hgo-ob-pdot" id="hgo-ob-pd2"></div>
                  <div class="hgo-ob-pdot" id="hgo-ob-pd3"></div>
                </div>
                <button class="hgo-ob-cta" id="hgo-ob-cta">Got it →</button>
              </div>
            </div>

          </div>
        </div>`;
      document.body.appendChild(backdrop);
      obRootEl = backdrop;
      return backdrop;
    }

    // ── Animation helpers ────────────────────────────────────────────
    function obWait(ms) { return new Promise(r => setTimeout(r, ms)); }

    function obSetStatus(text) {
      const el = document.getElementById('hgo-ob-status');
      if (el) el.textContent = text;
    }

    function obSetStep(active) {
      for (let i = 1; i <= 3; i++) {
        const s  = document.getElementById('hgo-ob-s' + i);
        const n  = document.getElementById('hgo-ob-n' + i);
        const pd = document.getElementById('hgo-ob-pd' + i);
        if (!s) continue;
        s.classList.remove('hgo-ob-active', 'hgo-ob-done');
        if (n)  n.textContent = String(i);
        if (pd) pd.classList.remove('hgo-ob-pd-active', 'hgo-ob-pd-done');
        if (i < active) {
          s.classList.add('hgo-ob-done');
          if (n)  n.textContent = '✓';
          if (pd) pd.classList.add('hgo-ob-pd-done');
        } else if (i === active) {
          s.classList.add('hgo-ob-active');
          if (pd) pd.classList.add('hgo-ob-pd-active');
        }
      }
    }

    function obMarkAllDone() {
      for (let i = 1; i <= 3; i++) {
        const s  = document.getElementById('hgo-ob-s' + i);
        const n  = document.getElementById('hgo-ob-n' + i);
        const pd = document.getElementById('hgo-ob-pd' + i);
        if (s)  { s.classList.remove('hgo-ob-active'); s.classList.add('hgo-ob-done'); }
        if (n)  n.textContent = '✓';
        if (pd) { pd.classList.remove('hgo-ob-pd-active'); pd.classList.add('hgo-ob-pd-done'); }
      }
    }

    function obPressKey(id, dur) {
      return new Promise(res => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hgo-ob-pressed');
        setTimeout(() => {
          if (el) el.classList.remove('hgo-ob-pressed');
          res();
        }, dur || 220);
      });
    }

    function obMoveCursor(x, y, ms) {
      return new Promise(res => {
        const cursor = document.getElementById('hgo-ob-cursor');
        if (!cursor) return res();
        cursor.style.left = x + 'px';
        cursor.style.top  = y + 'px';
        setTimeout(res, ms || 680);
      });
    }

    function obTypeText(text, speed, runId) {
      return new Promise(res => {
        const el = document.getElementById('hgo-ob-result');
        if (!el) return res();
        el.textContent = '';
        let i = 0;
        function tick() {
          if (runId !== obRunId || !obRunning) return res();
          if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, speed || 22); }
          else res();
        }
        tick();
      });
    }

    // ── Main animation loop ──────────────────────────────────────────
    async function obRunAnimation(triggerKey, runId) {
      if (runId !== obRunId || !obRunning) return;

      const cursor   = document.getElementById('hgo-ob-cursor');
      const target   = document.getElementById('hgo-ob-target');
      const keyviz   = document.getElementById('hgo-ob-keyviz');
      const tooltip  = document.getElementById('hgo-ob-tooltip');
      const shimmer  = document.getElementById('hgo-ob-shimmer');
      const resultEl = document.getElementById('hgo-ob-result');

      if (!cursor || !target) return;

      // Reset
      cursor.classList.remove('hgo-ob-vis');
      cursor.style.transition = 'opacity 0.3s ease';
      cursor.style.left = '180px'; cursor.style.top = '28px';
      target.classList.remove('hgo-ob-hovered');
      if (keyviz)   keyviz.classList.remove('hgo-ob-vis');
      if (tooltip)  tooltip.classList.remove('hgo-ob-show');
      if (shimmer)  shimmer.style.display = 'flex';
      if (resultEl) { resultEl.classList.remove('hgo-ob-vis'); resultEl.textContent = ''; }
      const keyT = document.getElementById('hgo-ob-key-trigger');
      const keyG = document.getElementById('hgo-ob-key-g');
      if (keyT) keyT.classList.remove('hgo-ob-pressed');
      if (keyG) keyG.classList.remove('hgo-ob-pressed');

      obSetStep(1);
      obSetStatus('Press  ' + triggerKey + '  to activate HoverGist…');
      await obWait(900);
      if (runId !== obRunId || !obRunning) return;

      // Phase 1 — activate
      if (keyviz) keyviz.classList.add('hgo-ob-vis');
      await obWait(320);
      await obPressKey('hgo-ob-key-trigger', 300);
      obSetStatus('✦ HoverGist activated — crosshair mode ON');
      await obWait(680);
      if (runId !== obRunId || !obRunning) return;

      // Phase 2 — hover
      obSetStep(2);
      obSetStatus('Hover over any section on the page…');
      await obWait(380);

      cursor.style.transition = 'opacity 0.3s ease, left 0.68s cubic-bezier(.4,0,.2,1), top 0.68s cubic-bezier(.4,0,.2,1)';
      cursor.classList.add('hgo-ob-vis');
      await obWait(180);
      await obMoveCursor(160, 28, 350);
      if (runId !== obRunId || !obRunning) return;
      await obMoveCursor(44, 88, 680);
      if (runId !== obRunId || !obRunning) return;

      target.classList.add('hgo-ob-hovered');
      obSetStatus('Element selected — outline appears');
      await obWait(860);
      if (runId !== obRunId || !obRunning) return;

      // Phase 3 — G key
      obSetStep(3);
      obSetStatus('Press  G  to generate the gist…');
      await obWait(520);
      await obPressKey('hgo-ob-key-g', 240);
      if (runId !== obRunId || !obRunning) return;

      // Phase 4 — loading
      if (tooltip) tooltip.classList.add('hgo-ob-show');
      obSetStatus('✦ Sending to AI… generating summary…');
      await obWait(1700);
      if (runId !== obRunId || !obRunning) return;

      // Phase 5 — result
      if (shimmer)  shimmer.style.display = 'none';
      if (resultEl) resultEl.classList.add('hgo-ob-vis');
      await obTypeText('Neural networks learn by adjusting weights — no rules, just pattern recognition at massive scale.', 22, runId);
      if (runId !== obRunId || !obRunning) return;

      obMarkAllDone();
      obSetStatus('🎉 That\'s the full flow — works on any webpage!');
      await obWait(3200);

      if (runId === obRunId && obRunning) obRunAnimation(triggerKey, runId);
    }

    // ── Public: show / hide ──────────────────────────────────────────
    function show(opts) {
      const defaults = { triggerKey: 'Alt', accentColor: '#6366f1', onDismiss: null };
      obConfig = Object.assign({}, defaults, opts || {});

      obRunId++;
      const currentRunId = obRunId;

      injectFont();
      injectStyles(obConfig.accentColor);

      if (obRootEl) { obRootEl.remove(); obRootEl = null; }

      const backdrop = buildDOM(obConfig.triggerKey);
      obRunning = true;

      function close() {
        obRunning = false;
        obRunId++; // Invalidate any running animations
        backdrop.classList.remove('hgo-ob-in');
        const modal = document.getElementById('hgo-ob-modal');
        if (modal) modal.classList.remove('hgo-ob-in');
        setTimeout(() => {
          if (obRootEl) { obRootEl.remove(); obRootEl = null; }
          if (typeof obConfig.onDismiss === 'function') obConfig.onDismiss();
        }, 450);
      }

      document.getElementById('hgo-ob-close').addEventListener('click', close);
      document.getElementById('hgo-ob-skip').addEventListener('click', close);
      document.getElementById('hgo-ob-cta').addEventListener('click', close);
      document.getElementById('hgo-ob-replay').addEventListener('click', function () {
        obRunId++;
        const replayRunId = obRunId;
        obRunning = false;
        setTimeout(() => { obRunning = true; obRunAnimation(obConfig.triggerKey, replayRunId); }, 60);
      });
      backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });

      requestAnimationFrame(function () {
        backdrop.classList.add('hgo-ob-in');
        const modal = document.getElementById('hgo-ob-modal');
        if (modal) modal.classList.add('hgo-ob-in');
      });

      setTimeout(function () { obRunAnimation(obConfig.triggerKey, currentRunId); }, 600);
    }

    function hide() {
      obRunning = false;
      obRunId++; // Invalidate any running animations
      if (!obRootEl) return;
      obRootEl.classList.remove('hgo-ob-in');
      const modal = document.getElementById('hgo-ob-modal');
      if (modal) modal.classList.remove('hgo-ob-in');
      setTimeout(function () {
        if (obRootEl) { obRootEl.remove(); obRootEl = null; }
      }, 450);
    }

    return { show, hide };

  })(); // end OB module


  // ════════════════════════════════════════════════════════════════════
  //  SECTION 2 — HOVERGIST CORE SDK
  // ════════════════════════════════════════════════════════════════════

  const DEFAULTS = {
    apiKey: '',
    backendUrl: 'http://localhost:3001',
    triggerKey: 'Alt',
    theme: 'dark',
    highlightColor: '#6366f1',
    maxWords: 120,
    minChars: 20,
    tooltipMaxWidth: 360,
    animationDuration: 220,
    showOnboarding: false,        // show onboarding popup on first visit
    onboardingStorageKey: 'hg_onboarded', // localStorage key to track seen state
    onGist: null,
    onError: null,
    onActivate: null,
    onDeactivate: null,
    targetSelector: null,
    excludeSelector: 'script,style,noscript,meta,head,br,hr',
  };

  let config       = {};
  let isActive     = false;
  let isLoading    = false;
  let currentEl    = null;
  let tooltipEl    = null;
  let activeBadge  = null;
  let abortCtrl    = null;
  let usageStats   = { used: 0, remaining: 200, limit: 200, resetAt: null };

  // ── Core Styles ──────────────────────────────────────────────────────
  function injectCoreStyles() {
    if (document.getElementById('hovergist-styles')) return;
    const css = `
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
        position: fixed; z-index: 2147483647;
        max-width: var(--hg-tooltip-width, 360px); min-width: 220px;
        border-radius: 14px; padding: 0; pointer-events: none;
        opacity: 0; transform: translateY(8px) scale(0.97);
        transition: opacity var(--hg-anim)ms cubic-bezier(.4,0,.2,1),
                    transform var(--hg-anim)ms cubic-bezier(.4,0,.2,1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }
      #hg-tooltip.hg-visible { opacity: 1; transform: translateY(0) scale(1); }

      #hg-tooltip.hg-dark {
        background: rgba(15,15,25,0.96); border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4),
                    inset 0 1px 0 rgba(255,255,255,0.06);
        color: #e8e8f0; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      }
      #hg-tooltip.hg-light {
        background: rgba(255,255,255,0.97); border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
        color: #1a1a2e; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      }
      #hg-tooltip .hg-header {
        display: flex; align-items: center; gap: 8px; padding: 10px 14px 8px;
        border-bottom: 1px solid rgba(128,128,128,0.15);
      }
      #hg-tooltip .hg-logo {
        width: 18px; height: 18px; border-radius: 5px; background: var(--hg-color);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 10px;
      }
      #hg-tooltip .hg-title {
        font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
        text-transform: uppercase; opacity: 0.6; flex: 1;
      }
      #hg-tooltip .hg-usage { font-size: 10px; opacity: 0.45; font-variant-numeric: tabular-nums; }
      #hg-tooltip .hg-body  { padding: 12px 14px 14px; font-size: 13.5px; line-height: 1.65; }
      #hg-tooltip .hg-loading {
        display: flex; flex-direction: column; gap: 7px; padding: 12px 14px 14px;
      }
      #hg-tooltip .hg-shimmer {
        height: 12px; border-radius: 6px;
        background: linear-gradient(90deg, rgba(128,128,128,0.15) 25%, rgba(128,128,128,0.3) 50%, rgba(128,128,128,0.15) 75%);
        background-size: 200% 100%; animation: hg-shimmer 1.4s infinite;
      }
      #hg-tooltip .hg-shimmer:nth-child(2) { width: 85%; }
      #hg-tooltip .hg-shimmer:nth-child(3) { width: 70%; }
      @keyframes hg-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      #hg-tooltip .hg-error { padding: 12px 14px 14px; font-size: 13px; color: #f87171; }

      /* ── Active Badge ── */
      #hg-active-badge {
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;
        display: flex; align-items: center; gap: 8px; padding: 9px 16px 9px 12px;
        border-radius: 100px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        font-size: 13px; font-weight: 600; cursor: pointer; user-select: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        animation: hg-badge-in 0.3s cubic-bezier(.34,1.56,.64,1);
      }
      #hg-active-badge.hg-dark {
        background: rgba(15,15,25,0.95); border: 1px solid rgba(255,255,255,0.12);
        color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.5); backdrop-filter: blur(16px);
      }
      #hg-active-badge.hg-light {
        background: rgba(255,255,255,0.97); border: 1px solid rgba(0,0,0,0.1);
        color: #1a1a2e; box-shadow: 0 4px 20px rgba(0,0,0,0.15); backdrop-filter: blur(16px);
      }
      #hg-active-badge:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
      #hg-active-badge .hg-pulse {
        width: 8px; height: 8px; border-radius: 50%; background: var(--hg-color); position: relative;
      }
      #hg-active-badge .hg-pulse::after {
        content: ''; position: absolute; inset: -3px; border-radius: 50%;
        background: var(--hg-color); opacity: 0.35; animation: hg-pulse 1.5s ease infinite;
      }
      @keyframes hg-pulse { 0%,100%{transform:scale(1);opacity:0.35} 50%{transform:scale(1.6);opacity:0} }
      @keyframes hg-badge-in { from{transform:translateY(20px) scale(0.9);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }

      body.hg-mode * { cursor: crosshair !important; }
    `;
    const s = document.createElement('style');
    s.id = 'hovergist-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Theme ────────────────────────────────────────────────────────────
  function resolveTheme() {
    if (config.theme === 'auto')
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return config.theme || 'dark';
  }

  // ── Tooltip ──────────────────────────────────────────────────────────
  function createTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'hg-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(tooltipEl);
  }

  function positionTooltip(el) {
    if (!tooltipEl) return;
    const rect = el.getBoundingClientRect();
    const gap = 12, vw = window.innerWidth, vh = window.innerHeight;
    const tipW = config.tooltipMaxWidth, tipH = tooltipEl.offsetHeight || 120;
    let top = (rect.bottom + gap + tipH < vh) ? rect.bottom + gap : rect.top - gap - tipH;
    let left = rect.left;
    if (left + tipW > vw - 16) left = vw - tipW - 16;
    if (left < 16) left = 16;
    tooltipEl.style.top  = Math.max(8, top) + 'px';
    tooltipEl.style.left = left + 'px';
  }

  function showTooltip(state, content) {
    if (!tooltipEl) createTooltip();
    const theme = resolveTheme();
    tooltipEl.className = 'hg-' + theme;
    const usageText = usageStats.remaining + '/' + usageStats.limit + ' left';
    const header = `
      <div class="hg-header">
        <div class="hg-logo">✦</div>
        <span class="hg-title">HoverGist</span>
        <span class="hg-usage">${usageText}</span>
      </div>`;
    if (state === 'loading') {
      tooltipEl.innerHTML = header + `<div class="hg-loading"><div class="hg-shimmer"></div><div class="hg-shimmer"></div><div class="hg-shimmer"></div></div>`;
    } else if (state === 'result') {
      tooltipEl.innerHTML = header + `<div class="hg-body">${escapeHTML(content)}</div>`;
    } else if (state === 'error') {
      tooltipEl.innerHTML = header + `<div class="hg-error">⚠ ${escapeHTML(content)}</div>`;
    }
    requestAnimationFrame(() => tooltipEl.classList.add('hg-visible'));
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('hg-visible');
  }

  // ── Active Badge ─────────────────────────────────────────────────────
  function showBadge() {
    if (activeBadge) return;
    const theme = resolveTheme();
    activeBadge = document.createElement('div');
    activeBadge.id = 'hg-active-badge';
    activeBadge.className = 'hg-' + theme;
    activeBadge.innerHTML = `<div class="hg-pulse"></div><span>HoverGist Active — hover a section, press G</span>`;
    activeBadge.title = 'Click to deactivate HoverGist';
    activeBadge.addEventListener('click', deactivate);
    document.body.appendChild(activeBadge);
  }

  function hideBadge() {
    if (activeBadge) { activeBadge.remove(); activeBadge = null; }
  }

  // ── Eligibility ──────────────────────────────────────────────────────
  function isEligible(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (el.closest('#hg-tooltip, #hg-active-badge, #hgo-ob-backdrop')) return false;
    if (el.matches(config.excludeSelector)) return false;
    if (config.targetSelector && !el.closest(config.targetSelector)) return false;
    return extractText(el).length >= config.minChars;
  }

  function extractText(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Activate / Deactivate ────────────────────────────────────────────
  function activate() {
    if (isActive) return;
    isActive = true;
    document.body.classList.add('hg-mode');
    showBadge();
    config.onActivate && config.onActivate();
    console.info('[HoverGist] Activated — hover any section and press G to get its gist.');
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false; isLoading = false;
    if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
    document.body.classList.remove('hg-mode');
    hideTooltip(); hideBadge(); unhighlightAll();
    config.onDeactivate && config.onDeactivate();
    console.info('[HoverGist] Deactivated.');
  }

  // ── Highlight ────────────────────────────────────────────────────────
  function highlightElement(el) {
    unhighlightAll();
    if (!el) return;
    el.classList.add('hg-highlight', 'hg-active-hover');
    currentEl = el;
  }

  function unhighlightAll() {
    document.querySelectorAll('.hg-highlight').forEach(function (el) {
      el.classList.remove('hg-highlight', 'hg-active-hover');
    });
    currentEl = null;
  }

  // ── Fetch Gist ───────────────────────────────────────────────────────
  async function fetchGist(el) {
    if (isLoading && abortCtrl) abortCtrl.abort();
    const text = extractText(el);
    if (!text || text.length < config.minChars) return;

    isLoading = true;
    abortCtrl = new AbortController();
    positionTooltip(el);
    showTooltip('loading');

    try {
      const response = await fetch(config.backendUrl + '/api/gist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
        body: JSON.stringify({
          text,
          elementTag: el.tagName.toLowerCase(),
          context: document.title || '',
          maxWords: config.maxWords,
        }),
        signal: abortCtrl.signal,
      });

      const data = await response.json();

      const h = response.headers;
      const r = h.get('X-RateLimit-Remaining'), l = h.get('X-RateLimit-Limit'),
            u = h.get('X-RateLimit-Used'),      a = h.get('X-RateLimit-Reset');
      if (r !== null) usageStats.remaining = parseInt(r, 10);
      if (l !== null) usageStats.limit     = parseInt(l, 10);
      if (u !== null) usageStats.used      = parseInt(u, 10);
      if (a !== null) usageStats.resetAt   = a;

      if (!response.ok) {
        const msg = data.message || data.error || ('API error ' + response.status);
        showTooltip('error', msg);
        config.onError && config.onError(new Error(msg), el);
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
      isLoading = false; abortCtrl = null;
    }
  }

  // ── Event Handlers ───────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === config.triggerKey && !e.repeat) {
      e.preventDefault();
      isActive ? deactivate() : activate();
      return;
    }
    if (e.key === 'Escape' && isActive) { deactivate(); return; }
    if ((e.key === 'g' || e.key === 'G') && isActive && !e.repeat) {
      if (!currentEl) return;
      e.preventDefault();
      fetchGist(currentEl);
    }
  }

  function onMouseOver(e) {
    if (!isActive) return;
    const el = e.target.closest('[data-hg-target],section,article,main,aside,header,footer,p,li,div,h1,h2,h3,h4,h5,h6') || e.target;
    if (isEligible(el)) highlightElement(el);
  }

  function onClick(e) {
    if (!isActive) return;
    const el = e.target.closest('[data-hg-target],section,article,main,aside,header,footer,p,li,div,h1,h2,h3,h4,h5,h6') || e.target;
    if (isEligible(el)) highlightElement(el);
  }

  function onScroll() {
    if (currentEl && tooltipEl && tooltipEl.classList.contains('hg-visible'))
      positionTooltip(currentEl);
  }

  // ── Public API ───────────────────────────────────────────────────────
  const HoverGist = {

    init(userConfig) {
      userConfig = userConfig || {};
      if (!userConfig.apiKey) {
        console.warn('[HoverGist] No apiKey provided. Using demo key.');
        userConfig.apiKey = 'hg_demo_key_00000000';
      }

      config = Object.assign({}, DEFAULTS, userConfig);

      const root = document.documentElement;
      root.style.setProperty('--hg-color', config.highlightColor);
      root.style.setProperty('--hg-tooltip-width', config.tooltipMaxWidth + 'px');
      root.style.setProperty('--hg-anim', config.animationDuration);

      injectCoreStyles();
      createTooltip();

      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('mouseover', onMouseOver, { passive: true });
      document.addEventListener('click', onClick, true);
      window.addEventListener('scroll', onScroll, { passive: true });

      // ── Onboarding ──────────────────────────────────────────────
      if (config.showOnboarding) {
        const key   = config.onboardingStorageKey;
        const seen  = (() => { try { return localStorage.getItem(key); } catch(e) { return null; } })();
        if (!seen) {
          OB.show({
            triggerKey:  config.triggerKey,
            accentColor: config.highlightColor,
            onDismiss: function () {
              try { localStorage.setItem(key, '1'); } catch(e) {}
            },
          });
        }
      }

      console.info(
        '%c HoverGist SDK v2.0.0 %c Initialized | Press ' + config.triggerKey + ' to activate, G to gist ',
        'background:#6366f1;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:600',
        'background:#1e1e2e;color:#a5b4fc;padding:2px 8px;border-radius:0 4px 4px 0'
      );

      return this;
    },

    activate()   { activate();   return this; },
    deactivate() { deactivate(); return this; },
    isActive()   { return isActive; },

    /** Manually open the onboarding tutorial popup */
    showOnboarding(opts) {
      OB.show(Object.assign({
        triggerKey:  config.triggerKey || DEFAULTS.triggerKey,
        accentColor: config.highlightColor || DEFAULTS.highlightColor,
      }, opts || {}));
      return this;
    },

    /** Close the onboarding tutorial popup */
    hideOnboarding() { OB.hide(); return this; },

    configure(partial) {
      config = Object.assign(config, partial);
      return this;
    },

    getUsage() { return Object.assign({}, usageStats); },
    destroy()  { 
      deactivate(); 
      document.removeEventListener('keydown', onKeyDown, true); 
      document.removeEventListener('mouseover', onMouseOver, { passive: true });
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll, { passive: true });
    },
  };

  // ── Export ───────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HoverGist;
  } else {
    global.HoverGist = HoverGist;
  }

})(typeof window !== 'undefined' ? window : this);
