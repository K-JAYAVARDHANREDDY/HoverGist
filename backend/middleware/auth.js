/**
 * HoverGist — API Key Auth & Management Middleware
 * Generates and validates developer API keys.
 */

const { v4: uuidv4 } = require('uuid');

// In-memory key store: apiKey -> { createdAt, label, enabled }
const keyStore = new Map();

// Pre-seed a demo key so the demo site works immediately
const DEMO_KEY = 'hg_demo_key_00000000';
keyStore.set(DEMO_KEY, {
  createdAt: new Date().toISOString(),
  label: 'Demo Key',
  enabled: true,
});

/**
 * Generates a new HoverGist API key.
 */
function generateKey(label = 'Unnamed Key') {
  const apiKey = `hg_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
  keyStore.set(apiKey, {
    createdAt: new Date().toISOString(),
    label,
    enabled: true,
  });
  return { apiKey, label, createdAt: keyStore.get(apiKey).createdAt };
}

/**
 * Middleware: validates the x-api-key header.
 * Must run BEFORE rateLimit so only valid keys are rate-limited.
 */
function validateKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing x-api-key header.' });
  }

  const record = keyStore.get(apiKey);
  if (!record) {
    return res.status(403).json({
      error: 'Invalid API key.',
      hint: 'Generate a key at GET /api/keys/generate',
    });
  }

  if (!record.enabled) {
    return res.status(403).json({ error: 'This API key has been disabled.' });
  }

  req.apiKeyRecord = record;
  next();
}

/**
 * Returns all keys (admin only — for demo purposes, no auth here).
 */
function listKeys() {
  return Array.from(keyStore.entries()).map(([key, meta]) => ({
    apiKey: key,
    ...meta,
  }));
}

module.exports = { validateKey, generateKey, listKeys, DEMO_KEY };
