# Phase 28 — Cash-game rebuys (first tranche)

- Added server-authoritative 1,000 play-chip rebuys only for a connected seated player with exactly zero chips, between hands.
- Added per-player `rebuys`, `totalBuyIn`, and net result in private and public state; no session token exposed.
- Added `rebuy` socket event: request `{roomCode}`; acknowledgement `{ok:true,stack,rebuys}` or `{ok:false,error}`.
- Added phone rebuy button and TV rebuy count.
- Consolidated documentation remains in `DEVELOPMENT-HISTORY.md`; this file records new changes.

## Known limitations
- Cash game only; tournament restrictions and chip accounting for historic pre-Phase-28 seats are not implemented.
- Timer fake-clock tests, reconnect multiplayer tests, and full showdown theatre are still outstanding.
- No GitHub upload or deployment is implied.
