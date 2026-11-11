# Rules mode

The rules engine is `scripts/rules.js`; the game only offers moves it allows. Code layers, lowest first (each uses only the ones below it; `node tools/game-test.js` checks this):

| File | Layer |
|---|---|
| `scripts/rules.js` | Rules: what each move does to the state |
| `scripts/game.js` | Game session: taps, turns and swipes in, new state and events out (`settled`, `spun`, `flipped`, `won`, `blocked`, …) |
| `scripts/card-view.js` | Card maths: the CSS transform for a side and turn |
| `scripts/motion.js` | Phone-turn maths |
| `scripts/view.js` | Drawing: card, spots, HUD, messages; turns events into what the player sees |
| `scripts/guided.js` | Controller: input to the game, results to the view |

## Moves

- **Walk**: along the map's paths, on the current side, without rotating. Tapping a spot walks the shortest open path to it.
- **Doors** are open only while their arrow points up (in the world: with Motion on, that is the north arrow's direction).
- **Spin**: rotating is allowed only while standing on a spin.
- **Flip**: only from a flip spot on the card's edge, landing on the matching flip on the other side. Flipping over a left/right edge turns rotation `t` into `-t`; over a top/bottom edge into `180 - t`.
- **Portal**: from a portal to any other portal on the same side, in two taps.
- **Items**: picked up as soon as they are in reach; every item on the card unlocks the exit.

## Glowing spots

Only spots the player can use right now glow:

- reachable spins, and flips that have a landing;
- reachable portals with somewhere to go;
- the exit, once reachable and unlocked;
- while picking a start, only the starts;
- while inside a portal, only the other portals.

Nothing glows after winning, or while Motion waits for the phone to be turned back.

## Messages

Status line (HUD):

| Message | When |
|---|---|
| Pick where to start. | Card with several starts, before one is picked |
| Find the exit. / Items n/m | Exit not in reach (item count if the card has items) |
| The exit is locked. Items n/m | Exit in reach, items missing |
| The exit is open. Tap it to leave. | Exit in reach and unlocked |
| Turn the card with the arrows. / Turn the phone to turn the card. | Just stepped onto a spin (the second with Motion on) |
| Pick the portal to come out of. | Inside a portal |
| You found the exit! | Won |

Toasts (bottom, 2.5s), after a swipe that can't flip:

- "More than one flip on that edge is in reach. Tap the one to use."
- "No flip in reach on that edge."
