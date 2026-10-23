# Phase 27 — Turn clock foundation

## Changes
- Introduced a server-owned 30-second turn deadline for normal poker, Brag and Blackjack turns.
- Timeout automatically checks when free, otherwise folds; Brag folds and Blackjack stands.
- Repeated state broadcasts do not restart the clock; switching street/turn starts a fresh deadline.
- Public and private state carry `turnDeadline`; TV seats and the active phone display seconds remaining.
- Preserved existing 60-second disconnect grace handling; this independent 30-second action clock may expire first, so reconnection timing needs harmonising before release.

## Verification
- `node --check server.js` passed.
- `node --test test/*.test.js`: 80 passed, 2 skipped, 0 failed. The skipped Socket.IO tests prevent a production sign-off.

## Known limitations / next steps
- The turn timer has not been verified with live Socket.IO clients or injectable fake timers.
- Five-Card Draw exchange has no dedicated shot clock yet.
- Reconnect grace and turn clock need a unified policy.
- Configurable shot-clock durations, phone vibration warnings and gold progress rings remain to be implemented.
- No GitHub push or Render deployment was performed.
