/**
 * HoverGist — Express API Server
 *
 * Endpoints:
 *   POST /api/gist          — Generate a gist for text (requires x-api-key)
 *   GET  /api/gist/history  — Last 20 gists for a key (requires x-api-key)
 *   GET  /api/keys/generate — Generate a new developer API key
 *   GET  /api/usage         — Get usage stats for an API key
 *   GET  /api/health        — Health check
 *   GET  /                  — Serves the demo site
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { AzureOpenAI } = require('openai');

const { validateKey, generateKey, listKeys, DEMO_KEY } = require('./middleware/auth');
const { rateLimit, getUsageStats } = require('./middleware/rateLimit');

const app  = express();
const PORT = process.env.PORT || 3001;
const GIST_MAX_TOKENS = parseInt(process.env.GIST_MAX_TOKENS || '200', 10);

// ─── Gist History Store ───────────────────────────────────────────────────────
// apiKey → array of { gist, elementTag, charCount, tokensUsed, latencyMs, ts }
const historyStore = new Map();
const HISTORY_LIMIT = 20;

function addToHistory(apiKey, entry) {
  if (!historyStore.has(apiKey)) historyStore.set(apiKey, []);
  const arr = historyStore.get(apiKey);
  arr.unshift(entry); // newest first
  if (arr.length > HISTORY_LIMIT) arr.pop();
}

// ─── Azure OpenAI Client ──────────────────────────────────────────────────────
if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_DEPLOYMENT) {
  console.error('\n❌ CRITICAL: Missing Azure OpenAI environment variables!');
  console.error('Make sure AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT are set in backend/.env\n');
  process.exit(1);
}

const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
});

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: Origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-RateLimit-Used'],
}));

app.use(express.json({ limit: '50kb' }));

// ─── Serve Demo Site ──────────────────────────────────────────────────────────
// Serves demo/index.html at / so it works with proper http:// (no CORS issues)
const DEMO_DIR = path.join(__dirname, '..', 'demo');
const SDK_DIR  = path.join(__dirname, '..', 'sdk');

app.use('/sdk', express.static(SDK_DIR));
app.use(express.static(DEMO_DIR));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  if (!req.path.startsWith('/api')) return next(); // skip static file logs
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'HoverGist API (Azure)',
    version: '1.0.0',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    timestamp: new Date().toISOString(),
    azureConfigured: !!process.env.AZURE_OPENAI_API_KEY,
  });
});

// ─── Generate API Key ─────────────────────────────────────────────────────────
app.get('/api/keys/generate', (req, res) => {
  const label  = req.query.label || 'My App';
  const result = generateKey(label);
  res.json({
    success: true,
    ...result,
    usage: {
      limit:  parseInt(process.env.RATE_LIMIT || '200', 10),
      window: '24 hours',
    },
    instructions: {
      sdkInit: `HoverGist.init({ apiKey: '${result.apiKey}', backendUrl: 'http://localhost:${PORT}' })`,
      header:  `x-api-key: ${result.apiKey}`,
    },
  });
});

// ─── List Keys (dev/admin) ────────────────────────────────────────────────────
app.get('/api/keys', (_req, res) => {
  res.json({ keys: listKeys() });
});

// ─── Usage Stats ──────────────────────────────────────────────────────────────
app.get('/api/usage', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing x-api-key header.' });
  }
  const stats = getUsageStats(apiKey);
  res.json({ apiKey, ...stats });
});

// ─── Gist History ─────────────────────────────────────────────────────────────
app.get('/api/gist/history', validateKey, (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const history = historyStore.get(apiKey) || [];
  res.json({ success: true, count: history.length, history });
});

// ─── Core Gist Endpoint ───────────────────────────────────────────────────────
app.post('/api/gist', validateKey, rateLimit, async (req, res) => {
  const { text, context, elementTag, maxWords } = req.body;
  const apiKey = req.headers['x-api-key'];

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid "text" field in request body.',
    });
  }

  const trimmedText = text.trim().slice(0, 4000); // Safety cap at 4k chars

  if (trimmedText.length < 20) {
    return res.status(400).json({
      error: 'Text is too short to summarize (minimum 20 characters).',
    });
  }

  const wordLimit = Math.min(maxWords || 120, 150);

  const systemPrompt = `You are HoverGist, an AI that creates ultra-concise summaries of web page sections. 
Given a piece of text from a webpage section, return a clear, plain-language gist in ${wordLimit} words or fewer.
- Start directly with the key insight, no preamble
- Use simple, accessible language
- If the text is a list, summarize the collective point
- If it's a heading + paragraph, lead with the main claim
- Never say "This section..." or "The text says..."`;

  const userPrompt = `Summarize this ${elementTag || 'section'} from a webpage${context ? ` (context: ${context})` : ''}:\n\n${trimmedText}`;

  try {
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:  GIST_MAX_TOKENS,
      temperature: 0.4,
    });

    const gist       = completion.choices[0]?.message?.content?.trim() || '';
    const latencyMs  = Date.now() - startTime;
    const tokensUsed = completion.usage?.total_tokens || 0;

    console.log(`[GIST] ${tokensUsed} tokens | ${latencyMs}ms | key: ${apiKey.slice(0, 12)}...`);

    // Save to history
    addToHistory(apiKey, {
      gist,
      elementTag: elementTag || 'section',
      charCount:  trimmedText.length,
      tokensUsed,
      latencyMs,
      context:    (context || '').slice(0, 100),
      ts:         new Date().toISOString(),
    });

    // Add used count header
    const stats = getUsageStats(apiKey);
    res.setHeader('X-RateLimit-Used', stats.used);

    res.json({
      success: true,
      gist,
      meta: {
        tokensUsed,
        latencyMs,
        model:     process.env.AZURE_OPENAI_DEPLOYMENT,
        charCount: trimmedText.length,
      },
    });
  } catch (err) {
    console.error('[GIST ERROR]', err.message);

    if (err.status === 429) {
      return res.status(503).json({
        error: 'Azure OpenAI rate limit reached. Please try again shortly.',
      });
    }

    if (err.status === 401) {
      return res.status(500).json({
        error: 'Azure OpenAI API key or Endpoint is invalid. Check server .env.',
      });
    }

    res.status(500).json({
      error:   'Failed to generate gist.',
      details: err.message,
    });
  }
});

// ─── 404 API Fallback ─────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: [
      'GET  /api/health',
      'GET  /api/keys/generate?label=MyApp',
      'GET  /api/usage',
      'GET  /api/gist/history',
      'POST /api/gist',
    ],
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const hasAzureKey = !!process.env.AZURE_OPENAI_API_KEY;
  console.log(`
╔══════════════════════════════════════════════╗
║     HoverGist API (Azure Edition) v1.0.0     ║
╠══════════════════════════════════════════════╣
║  Demo site   : http://localhost:${PORT}          ║
║  API base    : http://localhost:${PORT}/api      ║
║  Deployment  : ${process.env.AZURE_OPENAI_DEPLOYMENT?.padEnd(28) || 'Unknown'.padEnd(28)}║
║  Rate Limit  : ${(process.env.RATE_LIMIT || '200').padEnd(3)} calls / 24 hours           ║
╠══════════════════════════════════════════════╣
║  Demo Key    : ${DEMO_KEY.padEnd(28)}║
║  Azure Key   : ${hasAzureKey ? '✅ Set'.padEnd(28) : '⚠️  NOT SET — check .env     '.padEnd(28)}║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
