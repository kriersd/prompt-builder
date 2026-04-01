export function errorHandler(err, req, res, _next) {
  const status = err.status ?? err.statusCode ?? 500
  const isServerError = status >= 500
  const message = isServerError
    ? 'Internal server error'
    : (err.message ?? 'Request failed')

  if (isServerError) {
    console.error(`[error] ${req.method} ${req.path} →`, err)
  }

  res.status(status).json({ error: message })
}
