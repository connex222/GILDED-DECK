'use strict';
const DEFAULT_MAX_HTTP_BUFFER = 32 * 1024;
function parseAllowedOrigins(value = '', {production = false} = {}) {
  const origins = String(value).split(',').map(x => x.trim()).filter(Boolean);
  const result = new Set(origins);
  if (!production) {
    result.add('http://localhost:3000');
    result.add('http://127.0.0.1:3000');
  }
  for (const origin of result) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error(`Invalid ALLOWED_ORIGINS entry: ${origin}`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || parsed.username || parsed.password)
      throw new Error(`Invalid ALLOWED_ORIGINS entry: ${origin}`);
    if (production && parsed.protocol !== 'https:') throw new Error('Production origins must use HTTPS');
  }
  return result;
}
function isAllowedOrigin(origin, allowed) { return !origin || allowed.has(origin); }
function safePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  return port;
}
module.exports = {parseAllowedOrigins, isAllowedOrigin, safePort, DEFAULT_MAX_HTTP_BUFFER};
