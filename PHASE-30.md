# Phase 30 — Host failover (initial implementation)

- After the host disconnects, a 30-second server timer promotes the earliest connected seated player to temporary host.
- Temporary host can use existing start-game, deal-round, pause-table and select-game controls.
- Original host can reclaim using their private host resume token; it is never emitted in public state.
- Host status is signalled by public `hostId` and `hostIsDelegate` only.
- No new socket events.
- Delegate disconnection marks their seat disconnected and preserves the 60-second player recovery logic.

## Known limitations
- Host failover timers do not survive server restart (existing persisted host token still permits reclaim).
- Live multi-socket failover tests require installed npm dependencies and have not been run here.
- This phase does not implement persistent hosting or paid Render infrastructure.
