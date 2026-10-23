# The Gilded Deck

A **play-chip-only** multiplayer casino games night for a shared TV and private phone controllers. Built with Node.js 20+, Express, Socket.IO and pokersolver.

## Playable games

- Texas Hold’em — community-card poker.
- Omaha — exactly two hole cards and three community cards.
- Five-Card Draw — exchange up to three cards, maximum six players.
- Blackjack — dealer stands on 17; fixed 20-chip stake in the current build.
- British Three-Card Brag — prial, running flush, run, flush, pair, high card.

## Getting started

1. Install Node.js 20 or newer.
2. Run `npm install` then `npm test`.
3. Run `npm start` and open `http://localhost:3000` on the TV or host browser.
4. Create a room and share the room code or joining address.
5. Each player joins from their phone and selects an avatar. The host starts the game.

## Controls and recovery

The TV is a spectator screen; cards and actions are private to each player's phone. Players have a recoverable seat token kept on their own device. Disconnected players retain their seat for up to 60 seconds. An active disconnected player has their action timer suspended; on resuming, a fresh 30-second turn begins. After grace expiry the server folds or stands as appropriate. Five-Card Draw exchanges also time out to stand pat.

## Hosting on Render

The repository includes `render.yaml`. Use a single instance. Set `GILDED_STATE_FILE` to a writable persistent path if you want optional between-restart table recovery; an ephemeral free-tier filesystem does not provide durable recovery. Render supplies `PORT`. Avoid redeploying during a live games night.

## Architecture and privacy

- Server-authoritative shuffling, actions and chip settlement.
- Public `update-tv` state contains no resume token or unrevealed opponent cards.
- `update-player` carries only the owning player's private hand.
- Play chips only; **never use real money**.

## Verification and known limits

Run `npm test` and `node --check server.js`. Live Socket.IO tests require installed dependencies. Do not treat skipped integration tests as a release sign-off. Some advanced options remain incomplete, including configurable clocks and Blackjack split; rebuys, host transfer and basic showdown presentation were introduced in later phases. The turn timer and reconnection interaction require live multi-device acceptance testing. Client still uses external CDN and QR resources.

## Documentation

This README is the **only Markdown document** in the project. It contains current operating instructions and the complete archived development notes below. Earlier phase records are retained as historical claims, not current release verification.

## Phase 28 — Cash-game rebuys

When your play-chip stack reaches zero, the phone displays **Rebuy 1,000 play chips** between hands. Each rebuy increases your total bought-in chips and the visible rebuy tally. Rebuys are not available during a hand. These are play chips only; no payments are involved. Tournament rebuy restrictions are not yet implemented.

## Phase 29 — Between-hand table flow

After a completed hand, a 10-second server-controlled countdown starts if enough connected, funded players are available. Any seated player can press **Deal now** to skip the wait. The host can pause or resume the automatic dealing sequence. Each player can choose **Sit out next hand** and **I'm back next hand** without surrendering their seat or chips. A disconnected or underfunded player is not counted towards the next deal. Blackjack requires one eligible seat; the other games require two.

**Limitations:** The host is still a single point of failure for settings and pause controls; automatic host transfer is not implemented. Timer and socket integration tests must run with installed dependencies before production deployment.

## Phase 30 host recovery
If the TV host disconnects, after 30 seconds the longest-seated connected player temporarily gains host controls. The original host can reclaim using the saved host session token. Keep the host browser session data intact.

## Phase 31
The TV presents a paced showdown after contested hands, with hand descriptions, winning seat emphasis, and main/side pot awards. The host or viewer may skip the animation. For reduced-motion preferences the reveal is immediate. See the archived Phase 31 record below for limitations.

## Phase 32
Showdown winning-card emphasis, reveal audio cue and optional phone outcome haptics. See the archived Phase 32 record below for limitations.

## Phase 33 browser origin security
Set `ALLOWED_ORIGINS` to a comma-separated list of exact browser origins (scheme, hostname and optional port), e.g. `https://example.onrender.com`. Local development origins `http://localhost:3000` and `http://127.0.0.1:3000` are allowed automatically. A browser served from another origin will not be permitted to establish a Socket.IO connection. See the archived Phase 33 record below for limitations.

### Phase 34 — Connection and room lifecycle protection

Socket.IO connections are limited to 60 client events per 10-second window. Idle rooms without connected hosts or players expire after six hours. Set `ROOM_IDLE_MS` to a positive number of milliseconds to change the idle period. See `PHASE-34.md` for limitations and verification status.


## Phase 35 — Multiplayer verification and single-file documentation

- Added a live Socket.IO integration regression scenario for forged recovery tokens, duplicate joins and preserving distinct seats.
- Retained the existing live integration tests for game actions, chip conservation and legitimate reconnection.
- Consolidated all Phase Markdown files and `DEVELOPMENT-HISTORY.md` into this README and removed their standalone copies.
- Live Socket.IO tests still require `npm install` in an environment with registry access; skipped tests are not a production sign-off.
- No GitHub push or Render deployment is implied by this package.

## Archived development notes (historical)

These are preserved source notes from earlier releases. Some entries contain historical limitations or statements superseded by later phases.


---

### Archived source: DEVELOPMENT-HISTORY.md

# The Gilded Deck — Development History

Historical phase records consolidated verbatim from the supplied Phase 27 source. The phase records are historical and do not necessarily describe current verified behaviour.

---
## Design Phase 2

# The Gilded Deck — Phase 2
Implemented: upgraded identity and casino emblem, premium 3D-inspired felt table, enhanced seat lighting, mobile-responsive controls, keyboard focus indicators, reduced-motion support, optional synthesised ambience, optional game sound cues.
Existing playable mode: Texas Hold'em only. Other games remain labelled planned and are not yet implemented.
Audio is opt-in, synthesised in-browser, and stops when the tab is hidden. No real-money betting.
Run: npm install && npm start.
Testing: browser and multiplayer acceptance testing still required.


---
## PHASE 3

# Phase 3 — Omaha poker

Added host-selectable Omaha alongside Texas Hold’em. Omaha deals four private cards and evaluates each showdown using **exactly two** private cards and **exactly three** community cards, including side-pot comparisons. Existing shared blinds, turns and betting UI are reused. The host may switch variants only between hands; selecting a game returns the room to its lobby state. Blackjack, Draw, Brag and Stud are not implemented.

Validation: Node server syntax check. Full browser and multi-device acceptance testing is outstanding. This release is not verified production-ready.


---
## PHASE 4

# Phase 4 — Five-Card Draw

New playable mode: Five-Card Draw, selected by the host between hands. Five private cards, pre-draw betting, simultaneous private exchanges of 0–3 cards per eligible player, final betting and showdown. Uses existing play-chip pots and hand ranking. The TV does not reveal private cards. Controls are keyboard accessible.

The draw is capped at three cards (house rule). Players who folded or are all-in stand pat automatically. This is not Blackjack; Blackjack remains unimplemented.

Validation: Node server syntax and embedded client JavaScript syntax checked. Full multiplayer and game-rule acceptance testing has **not** been completed. In particular, edge cases involving side pots, disconnects and all-ins require live testing before production use.


---
## PHASE 5

# Phase 5 — Blackjack

Blackjack is now selectable by the host, alongside Texas Hold’em, Omaha and Five-Card Draw.

Rules: fixed 20-chip stake per eligible seat, dealer hole card concealed until settlement, dealer stands on soft 17, blackjack pays 3:2, ordinary wins 1:1, pushes return the stake. Players can Hit, Stand or Double (initial two cards only, sufficient stack required). No split, surrender, insurance or side bets. Play chips only.

Known limitations: no reconnection persistence; multiplayer/browser acceptance testing remains required. Existing poker game logic is not fully audited.


---
## PHASE 6

# Phase 6 — stability hardening
- Correct Blackjack settlement when the dealer has a natural 21 and a player has a non-natural 21.
- Automatically stand a disconnected Blackjack player and progress the dealer sequence.
- Fold disconnected Five-Card Draw players during exchange and finish exchange when all remaining eligible players have acted.
- No new games added in this phase.
- Node.js syntax check passed. Dependency installation timed out, so full integration and multiplayer tests remain outstanding.
- GitHub and Render have not been updated.


---
## PHASE 7

# Phase 7 — game-night hardening and lobby polish

- Natural blackjack is terminal; no additional hit/double allowed.
- Correct dealer-natural and player-natural push/win settlement logic.
- Blackjack supports one player versus the dealer (host start control).
- Draw phase skips disconnected players.
- Improved game catalogue layout, live versus planned labels and mobile responsiveness.
- No new game engine was added; Three-Card Brag remains planned.

Checks: Node server syntax, package integrity. Live multiplayer acceptance testing outstanding.
GitHub and Render are not updated.


---
## PHASE 8

# Phase 8 — Three-Card Brag (initial implementation)

Added three private cards, one poker-style betting round and server-evaluated Brag hand rankings with existing play-chip side-pot framework. Host can select the mode between hands. No community cards.

House rules: prial > running flush > run > flush > pair > high card; three threes is highest prial; A-2-3 is highest run, followed by A-K-Q. Brag conventions vary by table.

**Limitations:** This is not full traditional Brag betting. Blind/seen betting, see challenges and variants are not implemented. Existing poker-style blinds/call/raise/fold remain. Full multi-device testing pending.

Verification: server syntax and ten focused ranking tests passed. No GitHub/Render deployment.


---
## PHASE 9

# Phase 9 — Session recovery

- Added cryptographically random 48-character hexadecimal resume tokens for hosts and players.
- Client saves session in browser sessionStorage and attempts to resume on Socket.IO connection.
- Server rebinds recovered seats to current socket and prevents an active seat being claimed by another connection.
- Disconnected lobby seats remain available for recovery.
- Tokens are not sent in public room updates.

## Limitations
- Recovery lasts only while the Node server process and its in-memory rooms survive; server restarts lose sessions.
- Browser sessionStorage does not synchronise across devices or browser tabs.
- Disconnected players still fold/stand during a live hand; reconnecting does not reverse that decision.
- Automated tests cover existing Brag rankings only. Reconnection integration testing with real Socket.IO clients remains outstanding.
- GitHub and Render not updated.


---
## PHASE 10

# Phase 10 — Opt-in recovery checkpoint

Added optional atomic JSON checkpoint persistence. Set `GILDED_STATE_FILE=/var/data/gilded-rooms.json` on a host with a **persistent writable disk**. The default is memory-only (unchanged). Room codes, seat recovery tokens, chip balances and game selection are saved. Restarted rooms reopen as lobbies; any interrupted hand is cancelled and the chip balances are rolled back to the pre-hand checkpoint. This is deliberately **not** live hand recovery.

**Security:** the checkpoint contains bearer session tokens; secure the file and persistent volume and never commit it to GitHub. Tokens are not shown in public room updates. The save is debounced (150ms), so a sudden process failure may lose the most recent completed hand. For strict durability or multi-instance deployment, use a transactional database instead.

**Important:** Traditional Three-Card Brag blind/seen betting and see challenges remain outstanding. Full multi-device integration tests and Render deployment remain outstanding. This release prioritises recoverability and does not claim to complete those features.

Run `npm test` after installing dependencies. To enable persistence, set `GILDED_STATE_FILE` to a writable persistent-disk path. On ephemeral Render storage, persistence will **not** survive instance replacement.


---
## PHASE 11

# Phase 11 — Rules and recovery verification

Expanded the automated tests for Blackjack hand values, Three-Card Brag ranking edge cases, and persistence checkpoint shape. Run with `npm test` on Node.js 20 or later. The existing 10 Brag tests are retained.

## Scope and limitations
- These tests validate selected deterministic rules and checkpoint data structure, **not** Socket.IO flows or complete settlements.
- The game still uses simplified poker-style betting for Three-Card Brag; blind/seen betting and see challenges remain unimplemented.
- Room snapshots still require a persistent disk via `GILDED_STATE_FILE` to survive Render instance replacement.
- Do not deploy as production-ready without real multiplayer, disconnect/reconnect, full-hand and server-restart acceptance tests.
- No GitHub or Render deployment was performed as part of this package.


---
## PHASE 12

# Phase 12 — Betting and settlement regression coverage

Seven additional automated tests cover turn eligibility, betting-round completion, short-stack side pots, folded contributions, and tied-pot chip conservation.

Run: `npm test` (Node.js 20+). Result: 28 passing tests, 0 failures on Node.js 22.

Scope: deterministic server-side unit checks only. No live Socket.IO connections, real devices, server restart integration, or browser rendering have been tested. Traditional Three-Card Brag blind/seen betting and see challenges remain unimplemented.

Deployment: not uploaded to GitHub or Render.


---
## PHASE 13

# Phase 13 — session safety and test expansion

- Improved the host-disconnect message to correctly direct users to reconnect with the original host device. Previously it incorrectly told users to create a new table.
- Added four tests checking unique session tokens, player name bounds, snapshot privacy, and public game-state privacy.
- Kept the five existing games unchanged; no new game is advertised as complete.

## Verification

Run `npm test` and `node --check server.js`. These tests are isolated unit tests and do **not** exercise real Socket.IO connections. Dependency installation could not complete in this environment, so full multiplayer integration testing remains blocked. In particular, simultaneous phone connections, live reconnect, Brag betting and persistence after an actual server restart require follow-up.

## Deployment

GitHub and Render were not modified. The ZIP contains the source tree, not installed dependencies.


---
## PHASE 14

# Phase 14 — deck integrity and game-night safeguards

- Added a server-side maximum of six active players for Five-Card Draw. This guarantees that five initial cards plus up to three replacement cards per player fit within one 52-card deck (48 cards maximum).
- Seven or eight players may still join the shared lobby for other games. The host must switch game or reduce the active player count before starting Five-Card Draw.
- Added automated tests for unique deck cards, card code validity, shuffle variation, draw-deck capacity and the draw player limit.
- Three-Card Brag still uses simplified poker-style betting. Traditional blind/seen and see challenges remain unimplemented.
- Full Socket.IO integration, browser and real multi-device testing remain outstanding. No GitHub or Render deployment performed.


---
## PHASE 15

# Phase 15 — Five-Card Draw safety and input validation

- Extracted deck-capacity calculation and card-index validation into a testable module.
- Server now checks deck capacity before starting Five-Card Draw and rejects requests for more replacement cards than remain in the deck.
- Rejects duplicate, fractional, out-of-range, or more than three selected card indices.
- Added ten focused automated tests. These are **not** end-to-end Socket.IO tests.
- Existing games, room system and UI remain otherwise unchanged.

## Verification
- `node --check server.js` passed.
- `node --test test/draw-capacity.test.js` passed (10/10).
- Full suite requires installed dependencies and was not verified in this run.
- No live multiplayer test, GitHub update or Render deployment.


---
## PHASE 16

# Phase 16 — Three-Card Brag challenge prototype

Added a player-controlled 'Look at cards' seen-state and a limited heads-up 'See opponent' challenge. A see requires exactly two remaining players, both having marked their hands seen, and matching bets. The server compares three-card Brag rankings and awards a tie to the challenged player. The winner receives the pot through the existing hand settlement path.

**Not authentic Brag betting yet.** Blind/seen stake multipliers, paid see stakes, and full betting constraints remain unimplemented. The cards were already visible to their owner in the earlier interface, so the 'look' control only marks their seen status, and must not be described as concealed-card reveal. This is a playable prototype feature, not a full rules release.

Testing: 46 automated tests pass (including the corrected outdated deck-capacity assertion); server syntax passes. The new challenge flow has not been end-to-end tested with actual Socket.IO clients. No GitHub or Render deployment.


---
## PHASE 17

# Phase 17 — Seat integrity safeguards

Prevents a single active socket from joining a second player seat, and rejects duplicate seat creation in a room. Resume-session now rejects attempts to attach an already-seated device to another player's token. This reduces accidental duplicate seats and confused session state during phone refreshes.

Added ten unit tests for the extracted session guards. These tests are **not** live Socket.IO integration tests. Traditional Three-Card Brag blind/seen wagers and paid challenges remain future work.

Run `npm install` then `npm test` on a network-connected machine to run the complete suite. No GitHub or Render deployment is included.


---
## PHASE 18

# Phase 18 — Three-Card Brag complete house-rules implementation

Implemented separate Brag wagering (no poker blinds), equal antes, blind/seen stake ratios, look-at-cards privacy, raise stake capped at double the current blind stake, fold, paid heads-up see, challenger loses ties, and server-side settlement. The game auto-showdowns after 50 actions or when no player can afford another stake to prevent stalled rooms. These are explicitly documented **house rules**; traditional Brag variants differ on blind-to-seen conversion, raises, and who can challenge whom. This implementation does not claim tournament-standard Brag.

Important: side-pot and bankroll behaviour require live multi-device acceptance tests. No GitHub or Render deployment was performed.


---
## PHASE 19

# Phase 19 — Socket.IO integration-test foundation and Brag disconnect fix

- Added two real WebSocket / Engine.IO / Socket.IO integration tests using Node 22's built-in WebSocket client. They exercise room creation, duplicate seats, game selection, hidden Brag cards, look/see actions, winner settlement, chip conservation, and reconnection.
- Fixed a gameplay bug: when a player disconnected during Brag, the server incorrectly invoked poker street progression. Brag now uses its own turn progression and immediately settles when only one active player remains.
- All 56 existing unit tests pass. The 2 new integration tests were **skipped** because the current execution environment lacks runtime npm dependencies (`express`, `socket.io`, `pokersolver`) and cannot install them. They are not claimed as passed. Run `npm install && npm test` in an environment with npm registry access to execute them. The tests use the global WebSocket API and therefore require Node >=22 (existing server requirement is >=20; on Node 20 integration tests need a WebSocket polyfill or should be skipped).
- No real phone acceptance testing, GitHub upload, or Render deployment was performed.


---
## PHASE 20

# Phase 20 — multiplayer guard fixes and test execution

- Fixed an off-turn Three-Card Brag disconnect incorrectly advancing the turn and potentially skipping the active player.
- Prevented one connected socket from hosting multiple rooms or taking over another room's host session while seated.
- Added three source-level regression guards for the changed code paths.
- Executed all available tests. Live Socket.IO tests still skip because npm dependencies cannot be installed in this environment (npm install timed out). **Do not treat skipped integration tests as passed.**
- Live phone acceptance testing and GitHub/Render deployment are still pending.


---
## PHASE 21

# Phase 21 — recovery-file safety

Improved checkpoint loading to reject duplicate table codes, reused host/player recovery tokens, malformed player entries and unreasonable restored chip balances. This prevents a corrupted or manually edited snapshot from silently overwriting another table or duplicating access credentials.

Added five automated recovery regression checks. Live Socket.IO tests remain unverified without runtime dependencies. No GitHub or Render deployment has been performed.


---
## PHASE 22

# Phase 22 — Casino branding and player avatars

- Added the approved Las Vegas-style marquee artwork to the welcome screen.
- Cropped and optimised 16 character portraits into local WebP files under `public/assets`.
- Added a responsive 16-avatar phone picker with selected-avatar persistence on the device.
- Added server-side avatar validation and avatar data in public seat updates.
- Preserved avatar choices in opt-in room snapshots and recovered rooms.
- Added avatar portraits to TV/player seat displays.
- All 64 locally executable tests pass; 2 live Socket.IO integration tests remain skipped due to unavailable dependencies.
- Not yet pushed to GitHub or deployed to Render. Live device verification outstanding.


---
## PHASE 23

# Phase 23 — Critical showdown correction (first implementation tranche)

The supplied independent review identifies an inverted comparison convention between pokersolver and the pot-settlement routine. This build normalises the pokersolver results for Texas Hold'em, Omaha and Five-Card Draw so positive comparison consistently means the stronger hand. Brag comparison remains unchanged. The fix includes focused tests using mock pokersolver results, but full live hand-outcome integration tests remain outstanding.

Also reject fractional raise targets, remove the unplayable Seven-Card Stud menu entry, and update package and Render Blueprint service naming to gilded-deck. Renaming render.yaml does not rename an existing Render service.

This is **not the complete implementation of all items** in GILDED-DECK-REVIEW.md. Retaining disconnected seats, reconnect grace, shot clocks, showdown reveal, party features, blackjack split, local QR, modularisation and further full integration tests require additional implementation and verification. Do not deploy as a production-ready complete Phase 23 release without that work.


---
## PHASE 24

# Phase 24 — Preserve seats and rotate the dealer safely

## Changes
- No longer delete disconnected or insufficient-chip players when dealing Hold'em, Omaha, Draw, Brag or Blackjack.
- Mark non-participating players `sittingOut`, leave their hands empty and skip them in turn selection, blinds and betting.
- Rotate the dealer using a stable resume-token identity rather than the current array position. The dealer skips sitting-out players.
- Include `sittingOut` in public room state and save the dealer identity in optional room snapshots.
- Add three regression tests exercising the actual `startHand` function and verifying Blackjack no longer filters seats out.

## Test results
`node --check server.js` passed. `npm test`: 73 total, 71 passed, 2 skipped, 0 failed. The two skipped tests require runtime dependencies unavailable in this container, so actual Socket.IO integration has not been verified in this run.

## Known limitations
- This is not the full review implementation. A reconnect grace timer, shot clock, rebuys, showdown theatre, Blackjack splits, offline QR, modularisation and other requests remain outstanding.
- No GitHub commit or Render deployment was performed.
- Room snapshots retain dealer identity, but disconnected players remain unable to act until resumed; the requested grace period is not implemented yet.
- Tests exercise seat retention and rotation, not a complete live multi-phone game.


---
## PHASE 25

# Phase 25 — Disconnect grace period

- Disconnected players retain their cards and seats for 60 seconds during an active hand.
- Rejoining with the original private resume token cancels the pending timeout.
- After expiry, an eligible poker/Brag player folds; a Blackjack player stands; a Draw player in the exchange phase stands pat without revealing or discarding cards.
- Off-turn Brag disconnect expiry no longer advances past the active player.
- The existing source-level regression check was updated to reflect delayed disconnection.

## Known limitations

- Turn shot clocks, countdown UI, host-configurable deadlines and robust fake-clock integration tests are not yet implemented.
- Source-level checks do not replace live Socket.IO integration tests.
- The timer is process-local and does not survive a server restart.
- GitHub and Render are not updated by this package.


---
## PHASE 26

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


---
## PHASE 27

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


---

### Archived source: PHASE-27-CONSOLIDATION.md

# Phase 27 continuation — timer hardening and documentation consolidation

## Changes
- Paused active turn clocks when the player disconnects, allowing the 60-second recovery grace to operate without a competing 30-second auto-fold.
- On reconnection, the existing room broadcast starts a fresh 30-second clock.
- Added a per-player 30-second Five-Card Draw exchange timer; on expiry the player stands pat.
- Cancelled draw timers when a player disconnects or leaves the exchange phase.
- Consolidated historical PHASE-*.md and DESIGN-PHASE-2.md into DEVELOPMENT-HISTORY.md.
- Replaced obsolete starter README with current project documentation.

## Limitations
- This is a continuation of Phase 27, not a complete premium upgrade.
- The clocks use real timers and still need fake-clock and live multi-device testing.
- The two Socket.IO tests may be skipped without dependencies; do not deploy as production-ready without them.
- Not uploaded to GitHub or Render by this package build.


---

### Archived source: PHASE-28.md

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


---

### Archived source: PHASE-29.md

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


---

### Archived source: PHASE-30.md

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


---

### Archived source: PHASE-31.md

# Phase 31 — Showdown presentation (first tranche)

## Changes
- TV reveal stage with paced card presentation (1.5 seconds per player), gold winner-seat emphasis, skip control, and reduced-motion instant reveal.
- Main and side pot results recorded during contribution-tier settlement, then presented separately on the TV.
- Uncontested hands remain private; only non-folded contenders appear in contested showdown data.
- New source-level tests for reveal UI, pot summaries and privacy guard.

## Known limitations
- Showdown pacing is client-side; it is not a synchronised server-controlled timeline across multiple TV displays.
- Winning five-card highlight, reveal order by last aggressor, individual pot animations, phone haptics, and audio polish remain outstanding.
- Runtime Socket.IO integration tests are skipped without installed dependencies. This phase is not production certified.
- The existing Tailwind CDN and external QR generator have not yet been removed.


---

### Archived source: PHASE-32.md

# Phase 32 — Showdown polish

- Add selected best-hand cards to **completed contested** showdown payloads; do not expose them during betting.
- Highlight winning cards at the TV, with reduced-motion styling.
- Add reveal sound cue and one-time outcome haptics for player phones where supported.
- Add three source-level regression checks.

## Limitations
- Best-card extraction depends on pokersolver card representation and requires live end-to-end verification.
- Reveal timing is still per-browser, not synchronised across TV displays.
- Full sound library, detailed side-pot animation, live Socket.IO integration, and production hardening remain outstanding.


---

### Archived source: PHASE-33.md

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


---

### Archived source: PHASE-34.md

# Phase 34 — Event protection and idle-room lifecycle

- Added a per-connection Socket.IO event budget: 60 events per 10 seconds, with a clear failure acknowledgement when the event uses an acknowledgement callback.
- Added six-hour abandoned-room cleanup, configurable with `ROOM_IDLE_MS` (milliseconds). Rooms with a connected host or player are never evicted by the sweep.
- Cleanup cancels pending host transfer, next-hand, turn, draw and disconnection timers, and schedules an updated persistence snapshot.
- Added deterministic unit tests for rate windows and room-expiry conditions.

## Verification

- `node --check server.js` passed.
- `npm test`: 103 passed, 0 failed, 2 skipped (runtime Socket.IO integration tests).
- Live multiplayer acceptance, load tests and deployment verification are still outstanding.

## Operational notes

- The rate limit is per Socket.IO connection, not a distributed IP-level DDoS defence.
- An abandoned room can only expire once all clients are disconnected; stale rooms with active sockets remain available.
- Rooms restored from persistence receive a new activity timestamp on server restart.

---

## Phase 36 — Pot conservation and settlement regression

- Added 1,000 seeded multi-player pot scenarios covering uneven contributions, ties, folds and all-in-style side pots, plus a deterministic replay test.
- Fixed a settlement edge case: when a contribution tier has no remaining eligible contender, its contributions are refunded to the contributors instead of being lost. Refunds are reported separately in the pot summary.
- Verified with `node --check server.js` and `npm test`: **105 passed, 0 failed, 3 skipped**. The skipped tests are live Socket.IO integration tests requiring unavailable runtime dependencies.
- Documentation remains consolidated in this single README. There are no separate Phase Markdown files.
- Still outstanding: live simultaneous-action integration tests, host reconnection tests and full multiplayer acceptance testing. This phase has not been uploaded to GitHub or deployed to Render.

## Phase 37 — Concurrent-action multiplayer checks

- Added a live Socket.IO regression scenario for out-of-turn requests and rapid duplicate actions.
- The test asserts that rejected requests leave the chip ledger and active turn unchanged, that the TV never receives player recovery tokens or the server deck, and that completed heads-up hands conserve the initial 2,000 chips.
- This is a **test addition**, not a claim that the live integration suite has run. Run `npm install && npm test` in a network-enabled environment and resolve every skipped test before multiplayer sign-off.
- The project continues to contain **one Markdown file**, this README.

---

## Phases 38–40 — Multiplayer reliability and deployment security (23 October 2026)

### Phase 38 — Integration coverage
- Added a real Socket.IO regression scenario for the original host reclaiming a disconnected table using its private recovery token; confirms that a connected player cannot acquire a duplicate seat.
- Retained existing integration coverage for Brag, reconnects, forged tokens, and rapid duplicate actions.
- **Execution limitation:** live Socket.IO scenarios cannot run in this offline environment because Express, Socket.IO and pokersolver are not installed. These tests must run on a network-enabled machine before acceptance.

### Phase 39 — Connection security
- Added a reusable, testable origin-policy module. Production origins must be explicit HTTPS origins, with no wildcards, credentials, or paths. Local HTTP origins are permitted in development only.
- Added a live Socket.IO integration scenario for rejection of an unapproved browser origin.
- Limited Engine.IO message payloads to 32 KiB to reduce oversized-message exposure. This is not a substitute for edge-level DDoS controls.

### Phase 40 — Deployment and shutdown reliability
- Validated the configured listening port and fail fast for invalid values.
- Added graceful SIGTERM/SIGINT handling, cancellation of timers, and a final atomic persistence snapshot when `GILDED_STATE_FILE` is configured. An in-progress hand is restored to its pre-hand lobby snapshot, as before.
- Added focused deterministic configuration tests and updated the older source-pattern security check to follow the new module implementation.

### Verification and release gates
- Run `npm ci` (or `npm install` if no lockfile is present), then `npm test` on a network-enabled CI runner. **No skipped integration tests** should remain before sign-off.
- Verify two or more real phones and a TV on separate networks, disconnect/reconnect during a hand, host transfer after 30 seconds, rebuys, simultaneous actions, all five game modes, and chip conservation.
- On Render set `NODE_ENV=production`, `ALLOWED_ORIGINS=https://YOUR-REAL-RENDER-HOSTNAME` and `GILDED_STATE_FILE` only if persistent disk storage is provisioned. Never use the example hostname literally.
- Run a graceful-shutdown/restart drill against a real persistent disk before relying on room recovery.
- **Not yet verified:** live Socket.IO integration execution, actual Render deployment, multi-device acceptance, and persistence across a real platform restart.


## Phase 41 — TV, phone and keyboard polish

- Added phone safe-area support for notched displays and home-indicator insets.
- Added consistent visible keyboard focus for buttons, form controls and avatar choices.
- Improved minimum touch-target heights on phone layouts and disabled-button affordance.
- Added explicit live announcements for connection status and setup errors.
- Added a large-screen table presentation adjustment and high-contrast preference support.
- These changes require device/browser accessibility verification before release.

## Phase 42 — Five-game and sound audit

- Added packaged-asset and user-interface regression tests for all five game selections, Blackjack and Brag controls, 16 avatar images and the main marquee logo.
- Added checks for the locally synthesised, opt-in sound cues (deal, turn, reveal, win), the separate ambience toggle, and visibility handling.
- Preserved the single Markdown file policy: this README contains the development history and release notes.
- These checks establish that the UI controls and assets are present. They **do not** establish correct live gameplay, audible output on real devices, or complete accessibility. Live multi-device acceptance and the dependency-gated Socket.IO integration tests remain required.

## Phase 43 — Release candidate verification gate (23 October 2026)

- Added `.github/workflows/release-check.yml` to install dependencies with Node.js 22, check server syntax, run the complete test suite, and enforce exactly one Markdown document.
- Added `npm run test:release` and `test/release-gate.cjs`. Unlike the normal offline unit-test run, this command **fails** if Socket.IO, Express or pokersolver are missing, so skipped multiplayer tests cannot be mistaken for release certification.
- Before release: verify the GitHub Actions check is green **and has zero skipped tests**; test all five games on a TV and at least two phones, sound on/off, reconnection and host recovery, side-pot chip conservation, and cross-network play. Check production `ALLOWED_ORIGINS` matches the real HTTPS site and check Render logs and persistent storage configuration.
- This phase does not claim to have performed live multi-device acceptance testing or published the ZIP to GitHub. Render auto-deploys only after code is pushed to the connected `main` branch.

## Phase 44 — Strict no-skip release runner

- Replaced the release command with `test/strict-release.cjs`, which verifies dependencies, executes the entire `*.test.js` suite and fails if any tests are skipped, if the test process fails, or if the TAP summary is missing.
- The normal offline `npm test` remains available for unit checks; it does **not** certify multiplayer.
- Deployment remains blocked until the Phase 44 files are committed to GitHub and the strict CI check passes with zero skipped tests.

## Phase 45 — Live deployment smoke checks

- Added `npm run test:smoke` to verify a specified live HTTPS site's `/health` JSON and homepage without creating a room, sending socket events or changing game state.
- Example: `GILDED_SMOKE_URL=https://gilded-deck.onrender.com npm run test:smoke`.
- This check confirms basic HTTP availability only; it does **not** certify game rules, live Socket.IO connections, mobile usability, or the six skipped integration tests.
- Keep `npm run test:release` as the separate, strict zero-skips release gate. The real-device multiplayer trial remains required before final sign-off.
