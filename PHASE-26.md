# Phase 26 — Security and showdown foundation

Based on GILDED-DECK-REVIEW(1).md, starting the requested first delivery stage.

## Implemented
- Removed `dealerToken` from `roomPublic()` (the token remains in server-only snapshots for dealer tracking).
- Added completed-hand-only `showdown` public payload. Reveals non-folded contestants' hole cards and hand names when a contested hand completes; uncontested wins expose no hole cards.
- Added TV display of showdown cards, hand descriptions and awarded chips beside player seats.
- Cleared stale showdown data when starting another hand or changing games.
- Added five regression checks for public token exposure, reveal gating, folded-card secrecy, uncontested wins and TV display.

## Not yet implemented
- Full cinematic staggered reveal, winning-five highlighting, ordered side-pot reveal, show/muck choice, Blackjack-specific results, comprehensive full-hand payload tests, shot clock, rebuys, rate limiting, local QR/CSS, persistent paid Render configuration and modular architecture.
- Real Socket.IO integration tests are skipped because dependencies are not installed in this runtime. No claim of full production readiness.

## Verification
Run `npm install && npm test` on a machine with npm registry access to execute the full integration suite. `node --check server.js` checks syntax.
