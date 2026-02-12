const buckets = new Map();

const ENABLED = process.env.RATE_LIMIT_ENABLED !== "false";
const DEFAULT_LIMIT = Number(process.env.RATE_LIMIT_LIMIT || 1000);
const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

function getClientId(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimit(req, options = {}) {
  if (!ENABLED) {
    return { ok: true };
  }
  const limit = Number(options.limit || DEFAULT_LIMIT);
  const windowMs = Number(options.windowMs || DEFAULT_WINDOW_MS);
  const keyPrefix = options.keyPrefix ? `${options.keyPrefix}:` : "";
  const key = `${keyPrefix}${getClientId(req)}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now - current.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { ok: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  current.count += 1;
  if (current.count > limit) {
    return { ok: false, limit, remaining: 0, reset: current.start + windowMs };
  }

  return { ok: true, limit, remaining: limit - current.count, reset: current.start + windowMs };
}

function applyRateLimitHeaders(res, info) {
  if (!ENABLED || !info || info.limit == null) return res;
  res.headers.set("X-RateLimit-Limit", String(info.limit));
  res.headers.set("X-RateLimit-Remaining", String(info.remaining ?? 0));
  res.headers.set("X-RateLimit-Reset", new Date(info.reset).toISOString());
  return res;
}

function rateLimitResponse(info) {
  const retryAfter = Math.max(1, Math.ceil((info.reset - Date.now()) / 1000));
  const res = new Response(
    JSON.stringify({ error: "rate limit exceeded", retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter)
      }
    }
  );
  return applyRateLimitHeaders(res, info);
}

module.exports = {
  rateLimit,
  applyRateLimitHeaders,
  rateLimitResponse
};
