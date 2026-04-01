const RATE_LIMITS = new Map()

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

export function createRateLimit({ bucket, windowMs, maxRequests, message }) {
  return function rateLimit(req, res, next) {
    const key = `${bucket}:${getClientKey(req)}`
    const now = Date.now()
    const entry = RATE_LIMITS.get(key)

    if (!entry || entry.resetAt <= now) {
      RATE_LIMITS.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(Math.max(retryAfter, 1)))
      return res.status(429).json({ error: message })
    }

    entry.count += 1
    next()
  }
}

function getBearerToken(req) {
  const authHeader = req.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  return req.get('x-api-token')?.trim() || ''
}

export function requireApiToken(req, res, next) {
  const configuredToken = process.env.APP_API_TOKEN?.trim()

  if (!configuredToken) {
    return next()
  }

  const providedToken = getBearerToken(req)
  if (providedToken && providedToken === configuredToken) {
    return next()
  }

  return res.status(401).json({ error: 'Unauthorized' })
}
