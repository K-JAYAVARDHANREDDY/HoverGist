/**
 * HoverGist — Rate Limiting Middleware
 * Enforces 200 API calls per API key per 24-hour window (in-memory).
 */

const rateLimitStore = new Map(); // apiKey -> { count, windowStart }

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '200', 10);
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || '86400000', 10);

function getRateLimitRecord(apiKey) {
  const now = Date.now();
  let record = rateLimitStore.get(apiKey);

  if (!record || now - record.windowStart >= RATE_WINDOW_MS) {
    // New window
    record = { count: 0, windowStart: now };
    rateLimitStore.set(apiKey, record);
  }

  return record;
}

function rateLimit(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key. Include x-api-key header.',
    });
  }

  const record = getRateLimitRecord(apiKey);
  const remaining = RATE_LIMIT - record.count;
  const resetAt = new Date(record.windowStart + RATE_WINDOW_MS).toISOString();

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining - 1));
  res.setHeader('X-RateLimit-Reset', resetAt);

  if (record.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded.',
      limit: RATE_LIMIT,
      remaining: 0,
      resetAt,
      message: `You have used all ${RATE_LIMIT} calls for today. Your quota resets at ${resetAt}.`,
    });
  }

  record.count += 1;
  next();
}

/**
 * Returns current usage stats for an API key.
 */
function getUsageStats(apiKey) {
  const record = getRateLimitRecord(apiKey);
  const resetAt = new Date(record.windowStart + RATE_WINDOW_MS).toISOString();
  return {
    used: record.count,
    remaining: Math.max(0, RATE_LIMIT - record.count),
    limit: RATE_LIMIT,
    resetAt,
    windowStart: new Date(record.windowStart).toISOString(),
  };
}

module.exports = { rateLimit, getUsageStats };
