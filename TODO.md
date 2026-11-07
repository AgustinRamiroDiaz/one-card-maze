# TODO

## 1. Enforce game rules

How the game works (from the `MAZERULES` and `BOSSRULES` cards):

- You walk along paths from **start** to **exit**.
- **Doors** have an arrow and are open only while the arrow points up on screen. Rotating the card changes which doors are open.
- **Spin** icons are the only places where you may rotate the card.
- **Flip** triangles on the card edges are where you may flip the card and continue on the other side, at the matching triangle.
- Some cards add their own mechanics: items you collect to unlock the exit (`BURGER`), boss fights where you enter the Lair in a set sequence of orientations (`BOSSRULES*`, `PORTALBOSS`), and possibly more (`MADNESS`, `PRESSURE`, `LOOT`, `CthulhuPreview`, …).

Tasks:

- [x] Define a per-card data file, e.g. `cards/<name>/maze.json`, describing both sides as a graph:
  - nodes: start, exit, rooms/junctions, spin spots, flip edges, items, lair, with positions as fractions of the image (0–1), so they scale with the card
  - edges: path segments between nodes, with any door on them and the door's arrow direction
  - flip links: which flip edge on one side lands on which flip edge on the other side
- [x] Build an editor (`tools/editor.html`) to view and fix the graph on each card.
- [x] Draft `maze.json` for every card with a vision model (all `status: draft` except `MAZERULES`).
- [ ] Review every card in the editor and mark it `reviewed`. Each file's `notes` lists the agent's doubts.
- [ ] Support flips that pair by symbol rather than by position (`party`): add an optional `pair` field on flip nodes.
- [ ] Decide how boss cards are won: 31 cards have no exit; some drafts add an `exit` node in the lair, others only a `special` node.
- [ ] Two-card co-op (`PAD` + `PRESSURE`): gates on one card are opened by buttons on the other.
- [x] Write the rules engine (`scripts/rules.js`; `node tools/solve.js` solves every card, `--self-test` checks the engine): given the state (side, rotation, position, items, boss progress), list the legal moves.
  Rotation after a flip: flipping over an edge that is left/right on screen turns rotation `t` into `-t`; over an edge that is top/bottom on screen, into `180 - t`. This solves `MAZERULES`; `MAZE3` and `MAZE823023` only solve if every flip gives `-t`, which probably means a misread connection there.
- [ ] Add per-card mechanics as small plugins: items/keys, boss sequence, and others found while annotating.
- [x] Show a win state. (Lose states arrive with boss rules.)
- [x] Cards without a playable map (no start or exit, e.g. boss cards) fall back to free play; the index fades them in guided mode.
- [ ] Fix the maps of the 11 cards the solver can't finish: 2CMP2, 3017342, MAZE1123087, MAZE2, MAZE2404984, MAZE3, MAZE823023, MAZEKS106457, buffet, catspotting, cupcake.
- [ ] Items: guided mode requires every `item` on the card before the exit opens; check that this matches each card's text.

## 2. Play by clicking the icons

- [x] Put clickable hotspots over every map node: click to walk there, click a spin to turn, click a flip to go over the edge (`?mode=guided`).
- [x] Spin: clicking the icon turns clockwise; the side buttons turn either way and are only active on a spin.
- [x] Moves are only allowed along open paths; spins and flips only where the player stands.
- [x] Free play (the original swipe UI) stays available from the index switch.

Depends on: the `maze.json` positions from §1.

## 3. A player token moved with the keyboard

- [ ] Draw a token on the card at the start node.
- [ ] Arrow keys / WASD move it along the path in the on-screen direction. This has to account for the current card rotation and flip.
- [ ] Animate the token along the path between nodes.
- [ ] Keys for spin (e.g. `Q`/`E`) and flip (e.g. `Space`) when standing on those spots.
- [ ] Locked doors block movement.

Depends on: the graph and engine from §1.

## 4. Clean URLs

- [ ] `/` shows the level index.
- [ ] `/<cardname>` plays that card, e.g. `/BURGER`.
- [ ] Make it work on a static host (GitHub Pages) and on `python3 -m http.server`.
- [ ] Update the index links.
