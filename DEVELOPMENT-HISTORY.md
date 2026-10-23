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

