# Phase 33 — Origin policy and security verification

## Implemented
- Added `ALLOWED_ORIGINS` (comma-separated full HTTP(S) origins) to configure accepted cross-origin Socket.IO browser connections. Localhost and 127.0.0.1 on port 3000 remain permitted for development.
- Socket.IO `allowRequest` now rejects browser requests with an Origin outside the allowlist, rather than using unrestricted `cors: {origin:true}`. Clients without an Origin header remain allowed (e.g. non-browser test clients); this is not authentication.
- Added regression tests asserting the origin policy and absence of recovery credentials in `roomPublic`.

## Deployment configuration
Set `ALLOWED_ORIGINS=https://YOUR-RENDER-HOST.onrender.com` to the real deployed host. Include any additional legitimate web origins, comma-separated. Do not use wildcard origins. Restart the service after updating.

## Limitations
- The existing Socket.IO integration tests still skip when runtime dependencies are unavailable. This build is NOT certified for production multiplayer.
- Socket.IO event rate limiting, six-hour idle expiry, per-player payload secrecy over complete game simulations, and timed recovery edge-case integration tests remain outstanding.
