/**
 * HoverGist Demo — app.js
 * Initializes the SDK and wires up the developer config panel.
 */

// ── Default config ──────────────────────────────────────────────────────────
let currentConfig = {
  apiKey: 'hg_demo_key_00000000',
  backendUrl: 'http://localhost:3001',
  theme: 'dark',
  highlightColor: '#6366f1',
  maxWords: 120,
};

// ── Initialize HoverGist SDK ────────────────────────────────────────────────
HoverGist.init({
  ...currentConfig,
  onGist: (gist, el) => {
    console.log('[HoverGist] Gist received:', gist);
    updateUsageDisplay();
    fetchAndRenderHistory();
  },
  onError: (err, el) => {
    console.warn('[HoverGist] Error:', err.message);
  },
  onActivate: () => {
    sdkToggle.classList.add('on');
    sdkToggle.setAttribute('aria-checked', 'true');
  },
  onDeactivate: () => {
    sdkToggle.classList.remove('on');
    sdkToggle.setAttribute('aria-checked', 'false');
  },
});

// ── DOM refs ────────────────────────────────────────────────────────────────
const configPanel    = document.getElementById('config-panel');
const configTrigger  = document.getElementById('config-trigger');
const panelClose     = document.getElementById('panel-close');
const applyBtn       = document.getElementById('apply-config');
const activateBtn    = document.getElementById('activate-btn');
const heroActivateBtn= document.getElementById('hero-activate-btn');
const sdkToggle      = document.getElementById('sdk-toggle');
const genKeyBtn      = document.getElementById('gen-key-btn');
const genKeyResult   = document.getElementById('gen-key-result');

const inputApiKey    = document.getElementById('input-api-key');
const inputBackend   = document.getElementById('input-backend');
const inputTheme     = document.getElementById('input-theme');
const inputColor     = document.getElementById('input-color');
const inputColorText = document.getElementById('input-color-text');
const colorPreview   = document.getElementById('color-preview');
const inputWords     = document.getElementById('input-words');
const wordsDisplay   = document.getElementById('words-display');
const usageCount     = document.getElementById('usage-count');
const usageBar       = document.getElementById('usage-bar');
const usageResetText = document.getElementById('usage-reset-text');
const copySnippetBtn = document.getElementById('copy-snippet');
const tabConfig      = document.getElementById('tab-config');
const tabHistory     = document.getElementById('tab-history');
const panelBodyCfg   = document.querySelector('#config-panel .panel-body');
const panelBodyHist  = document.getElementById('panel-history');
const historyList    = document.getElementById('history-list');
const historyBadge   = document.getElementById('history-badge');
const refreshHistBtn = document.getElementById('refresh-history-btn');

// ── Panel Tabs ──────────────────────────────────────────────────────────────
function switchTab(tabName) {
  const isCfg = tabName === 'config';
  tabConfig.classList.toggle('active', isCfg);
  tabHistory.classList.toggle('active', !isCfg);
  panelBodyCfg.style.display  = isCfg ? '' : 'none';
  panelBodyHist.style.display = isCfg ? 'none' : '';
  if (!isCfg) fetchAndRenderHistory();
}

tabConfig .addEventListener('click', () => switchTab('config'));
tabHistory.addEventListener('click', () => switchTab('history'));

// ── Config Panel open/close ─────────────────────────────────────────────────
configTrigger.addEventListener('click', () => {
  configPanel.classList.toggle('open');
  updateUsageDisplay();
});

panelClose.addEventListener('click', () => {
  configPanel.classList.remove('open');
});

// Close panel on outside click
document.addEventListener('click', (e) => {
  if (
    configPanel.classList.contains('open') &&
    !configPanel.contains(e.target) &&
    e.target !== configTrigger
  ) {
    configPanel.classList.remove('open');
  }
});

// ── Activate buttons ────────────────────────────────────────────────────────
[activateBtn, heroActivateBtn].forEach(btn => {
  btn.addEventListener('click', () => {
    if (HoverGist.isActive()) {
      HoverGist.deactivate();
      btn.innerHTML = '<span>⚡</span> Activate Demo';
    } else {
      HoverGist.activate();
      btn.innerHTML = '<span>✕</span> Deactivate';
    }
  });
});

// Sync both activate buttons text with state
function syncActivateBtns() {
  const label = HoverGist.isActive()
    ? '<span>✕</span> Deactivate'
    : '<span>⚡</span> Activate Demo';
  activateBtn.innerHTML = label;
  heroActivateBtn.innerHTML = HoverGist.isActive()
    ? '<span>✕</span> Deactivate'
    : '<span>⚡</span> Activate Demo';
}

document.addEventListener('keydown', () => setTimeout(syncActivateBtns, 50));

// ── SDK Toggle in panel ─────────────────────────────────────────────────────
sdkToggle.addEventListener('click', () => {
  if (HoverGist.isActive()) {
    HoverGist.deactivate();
  } else {
    HoverGist.activate();
  }
  syncActivateBtns();
});

sdkToggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    sdkToggle.click();
  }
});

// ── Color picker sync ───────────────────────────────────────────────────────
inputColor.addEventListener('input', () => {
  const val = inputColor.value;
  inputColorText.value = val;
  colorPreview.style.background = val;
});

inputColorText.addEventListener('input', () => {
  const val = inputColorText.value;
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    inputColor.value = val;
    colorPreview.style.background = val;
  }
});

// ── Range slider ────────────────────────────────────────────────────────────
inputWords.addEventListener('input', () => {
  wordsDisplay.textContent = inputWords.value;
});

// ── Apply Configuration ─────────────────────────────────────────────────────
applyBtn.addEventListener('click', () => {
  const newConfig = {
    apiKey: inputApiKey.value.trim() || 'hg_demo_key_00000000',
    backendUrl: inputBackend.value.trim() || 'http://localhost:3001',
    theme: inputTheme.value,
    highlightColor: inputColor.value,
    maxWords: parseInt(inputWords.value, 10),
  };

  currentConfig = newConfig;

  // Reconfigure live SDK
  HoverGist.configure({
    apiKey: newConfig.apiKey,
    backendUrl: newConfig.backendUrl,
    theme: newConfig.theme,
    highlightColor: newConfig.highlightColor,
    maxWords: newConfig.maxWords,
  });

  // Update code snippet preview
  updateCodeSnippet(newConfig);

  // Visual feedback
  applyBtn.textContent = '✓ Applied!';
  applyBtn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
  setTimeout(() => {
    applyBtn.innerHTML = '✓ Apply Configuration';
    applyBtn.style.background = '';
  }, 1800);

  console.log('[HoverGist] Config updated:', newConfig);
});

// ── Generate API Key ────────────────────────────────────────────────────────
genKeyBtn.addEventListener('click', async () => {
  const backendUrl = inputBackend.value.trim() || 'http://localhost:3001';
  genKeyBtn.textContent = 'Generating...';
  genKeyResult.style.display = 'none';

  try {
    const res = await fetch(`${backendUrl}/api/keys/generate?label=DemoSite`);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();

    genKeyResult.style.display = 'block';
    genKeyResult.innerHTML = `
      <strong style="color:#a5b4fc">New API Key Generated ✓</strong><br/>
      <span style="color:#86efac">${data.apiKey}</span><br/><br/>
      <span style="color:var(--text-3)">Limit: ${data.usage.limit} calls / ${data.usage.window}</span>
    `;

    // Auto-fill the key field
    inputApiKey.value = data.apiKey;
  } catch (err) {
    genKeyResult.style.display = 'block';
    genKeyResult.innerHTML = `
      <span style="color:#f87171">⚠ Could not reach backend: ${err.message}</span><br/>
      <span style="color:var(--text-3)">Make sure the backend is running on ${backendUrl}</span>
    `;
  } finally {
    genKeyBtn.textContent = 'Generate new API key →';
  }
});

// ── Usage Display ───────────────────────────────────────────────────────────
function updateUsageDisplay() {
  const stats = HoverGist.getUsage();
  // 'used' is now accurate from X-RateLimit-Used header; fallback to limit-remaining
  const used = stats.used || (stats.limit - stats.remaining);
  const pct  = Math.min(100, (used / stats.limit) * 100);

  usageCount.innerHTML = `${used} <span>/ ${stats.limit}</span>`;
  usageBar.style.width = `${pct}%`;

  // Color the bar based on usage
  if (pct > 85) {
    usageBar.style.background = 'linear-gradient(90deg,#f59e0b,#f43f5e)';
  } else if (pct > 60) {
    usageBar.style.background = 'linear-gradient(90deg,#6366f1,#f59e0b)';
  } else {
    usageBar.style.background = 'linear-gradient(90deg,#6366f1,#8b5cf6)';
  }

  // Fetch usage from server for accurate display
  const backendUrl = inputBackend.value.trim() || 'http://localhost:3001';
  const apiKey = inputApiKey.value.trim() || 'hg_demo_key_00000000';

  fetch(`${backendUrl}/api/usage`, {
    headers: { 'x-api-key': apiKey }
  })
  .then(r => r.ok ? r.json() : null)
  .then(data => {
    if (!data) return;
    const serverUsed = data.used;
    const serverPct = Math.min(100, (serverUsed / data.limit) * 100);
    usageCount.innerHTML = `${serverUsed} <span>/ ${data.limit}</span>`;
    usageBar.style.width = `${serverPct}%`;
    usageResetText.textContent = `Resets at ${new Date(data.resetAt).toLocaleTimeString()}`;
  })
  .catch(() => {
    usageResetText.textContent = 'Backend offline — stats unavailable';
  });
}

// ── Update Code Snippet Preview ─────────────────────────────────────────────
function updateCodeSnippet(cfg) {
  const snippet = document.getElementById('code-snippet');
  if (!snippet) return;

  snippet.innerHTML = `<span class="tok-comment">&lt;!-- 1. Include the SDK --&gt;</span>
<span class="tok-keyword">&lt;script</span> <span class="tok-obj">src</span>=<span class="tok-string">"https://your-cdn.com/hovergist.sdk.js"</span><span class="tok-keyword">&gt;&lt;/script&gt;</span>

<span class="tok-comment">&lt;!-- 2. Initialize --&gt;</span>
<span class="tok-keyword">&lt;script&gt;</span>
  <span class="tok-obj">HoverGist</span>.<span class="tok-func">init</span>({
    apiKey:         <span class="tok-string">'${escapeHTML(cfg.apiKey)}'</span>,
    backendUrl:     <span class="tok-string">'${escapeHTML(cfg.backendUrl)}'</span>,
    theme:          <span class="tok-string">'${cfg.theme}'</span>,
    triggerKey:     <span class="tok-string">'Alt'</span>,
    highlightColor: <span class="tok-string">'${cfg.highlightColor}'</span>,
    maxWords:       <span class="tok-number">${cfg.maxWords}</span>,
  });
<span class="tok-keyword">&lt;/script&gt;</span>`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Copy Snippet ────────────────────────────────────────────────────────────
copySnippetBtn.addEventListener('click', () => {
  const plain = `<!-- 1. Include the SDK -->
<script src="https://your-cdn.com/hovergist.sdk.js"><\/script>

<!-- 2. Initialize -->
<script>
  HoverGist.init({
    apiKey:         '${currentConfig.apiKey}',
    backendUrl:     '${currentConfig.backendUrl}',
    theme:          '${currentConfig.theme}',
    triggerKey:     'Alt',
    highlightColor: '${currentConfig.highlightColor}',
    maxWords:       ${currentConfig.maxWords},
  });
<\/script>`;

  navigator.clipboard.writeText(plain).then(() => {
    copySnippetBtn.textContent = 'Copied ✓';
    copySnippetBtn.classList.add('copied');
    setTimeout(() => {
      copySnippetBtn.textContent = 'Copy';
      copySnippetBtn.classList.remove('copied');
    }, 2000);
  });
});

// ── FAQ Accordion ────────────────────────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── Initial usage fetch on load ─────────────────────────────────────────────
window.addEventListener('load', () => {
  updateUsageDisplay();
});

// ── Gist History ─────────────────────────────────────────────────────────────
async function fetchAndRenderHistory() {
  const backendUrl = inputBackend.value.trim() || 'http://localhost:3001';
  const apiKey     = inputApiKey.value.trim()   || 'hg_demo_key_00000000';

  try {
    const res  = await fetch(`${backendUrl}/api/gist/history`, {
      headers: { 'x-api-key': apiKey }
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();

    historyBadge.textContent = data.count;

    if (data.count === 0) {
      historyList.innerHTML = `
        <div style="color:var(--text-3);font-size:13px;text-align:center;padding:24px 0">
          No gists yet — activate HoverGist and click a section!
        </div>`;
      return;
    }

    historyList.innerHTML = data.history.map(item => {
      const timeAgo = formatTimeAgo(new Date(item.ts));
      return `
        <div class="history-item">
          <div class="history-item-meta">
            <span class="history-item-tag">${escapeHTML(item.elementTag)}</span>
            <span class="history-item-ts">${timeAgo}</span>
          </div>
          <div class="history-item-gist">${escapeHTML(item.gist)}</div>
          <div class="history-item-stats">
            ${item.tokensUsed} tokens · ${item.latencyMs}ms · ${item.charCount} chars input
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    historyList.innerHTML = `
      <div style="color:var(--text-3);font-size:13px;text-align:center;padding:24px 0">
        Could not load history — is the backend running?
      </div>`;
  }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60)  return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

refreshHistBtn && refreshHistBtn.addEventListener('click', fetchAndRenderHistory);
