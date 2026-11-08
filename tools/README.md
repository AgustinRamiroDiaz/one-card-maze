# Tools

## Maze data: `cards/<name>/maze.json`

Each card gets one file describing both sides as a graph. Coordinates are fractions (0–1) of the side's image as printed, so (0,0) is the top-left corner and (1,1) is the bottom-right.

```json
{
  "status": "draft | reviewed | unplayable",
  "notes": "free text: route summary, doubts",
  "mechanics": [ { "type": "collect", "text": "Gather bun, patty, lettuce to unlock the exit" } ],
  "sides": {
    "front": { "nodes": [ ... ], "edges": [ ["idA", "idB"], ... ] },
    "back":  { "nodes": [ ... ], "edges": [ ... ] }
  }
}
```

Node fields: `id` (unique per side), `type`, `x`, `y`, plus:

| type | meaning | extra fields |
|---|---|---|
| `start` | where the player begins; with several, the player picks one (all must be on the same side) | |
| `exit` | goal | |
| `room` | open area | |
| `door` | passable only while its arrow points up on screen | `arrow`: `up` `down` `left` `right`, as printed |
| `spin` | the player may rotate the card here | |
| `flip` | triangle on the card edge; flip over that edge | `edge`: `top` `bottom` `left` `right` |
| `item` | something to collect | `label` |
| `portal` | teleports to any other portal on the same side; entering and leaving are separate moves | |
| `special` | card-specific feature (lair, portal, sword, …) | `label` |

Edges are walkable connections; walking an edge is always allowed, doors gate movement through the door node.

Flipping over an edge lands on the other side at the mirrored point: `(x, y)` on one side touches `(1 - x, y)` on the other. So a `top` flip pairs with a `top` flip at `1 - x`, and a `right` flip pairs with a `left` flip at the same `y`.

`mechanics[].type` is one of `collect`, `boss`, `portal`, `counter`, `other`; `text` describes the rule as the card states it.

Check files with `make validate` (or `node tools/validate.js [card ...]`). `make winnable` solves every playable card from each of its starts and fails if any start has no solution. `make hooks` installs the pre-commit hooks (validate + rules self-test); run the winnable check through pre-commit with `pre-commit run winnable --hook-stage manual --all-files`.

## Editor

`tools/editor.html` shows a card with its graph drawn over it and lets you fix it. Serve the repo root (`python3 -m http.server 8000`) and open http://localhost:8000/tools/editor.html.

## Browser tests

`e2e/guided.spec.js` checks guided play: on a card with several starts only the starts light up (and the glow is painted), and three cards (MAZERULES, the portal card MAZE2404984, and 2CMP2 from a picked start) are played to the exit by replaying the solver's solution through the UI. Set up once with `npm install && npx playwright install chromium firefox`, then run `make e2e`. Playwright starts its own server on port 4173. Each test runs on desktop Chromium and Firefox and on phone emulations of a Pixel 7 (Chromium) and an iPhone 13 (WebKit); setup also needs `npx playwright install webkit`. Playwright's WebKit build for unsupported Linux distributions ignores `backface-visibility`, so the glow pixel check is skipped on WebKit.

## Motion controls

`scripts/motion.js` reads `deviceorientation` and reports which quarter (0-3, clockwise) the upright phone is turned to; a phone lying flat is ignored. In guided play the **Motion** button (shown on touch screens) turns it on. The phone is the card: while standing on a spin, turning the phone a quarter turns the card a quarter in the world, so other doors point up and the highlights change, but the picture on screen never moves. Turning the phone anywhere else pauses the game until it is turned back. Switching Motion off hands the phone's turn to the on-screen picture. Sensors only work over HTTPS, iOS asks for permission on the first tap, and the phone's own rotation lock must be on. `make test` checks the maths (`tools/motion-test.js`); the e2e suite fires synthetic orientation events on the Pixel 7 project.
