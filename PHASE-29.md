# Phase 29 — Table flow

## Changes
- Added server-authoritative 10-second next-hand countdown with public `nextHandDeadline` (epoch milliseconds).
- Added `deal-now` socket event `{roomCode}` (ack `{ok,error?}`) for connected seated players and host.
- Added `set-sit-out` socket event `{roomCode,sittingOut:boolean}` (ack `{ok,sitOutNext?}`) and persisted seat identity during sit-outs.
- Added `pause-table` socket event `{roomCode,paused:boolean}` (ack `{ok,paused?}`), host-only.
- Countdown is cancelled by a manual deal or pause and rescheduled on sit-out changes and rebuys.
- Added TV countdown, host pause control and phone Deal now / Sit out controls.
- Added five deterministic fake-timer tests for countdown, cancellation, eligibility and Blackjack.

## Verification
- `node --check server.js`: passed.
- Inline client JavaScript syntax check: passed.
- `npm test`: 92 tests, 90 passed, 0 failed, 2 skipped (Socket.IO tests need runtime dependencies).
- ZIP integrity: verified.

## Known limitations
- Not deployed or uploaded to GitHub.
- Host transfer/reclaim and full live Socket.IO acceptance testing remain outstanding.
- The current test environment lacks installed runtime dependencies, so the two integration tests were skipped.
