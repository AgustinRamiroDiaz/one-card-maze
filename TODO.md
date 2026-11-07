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
- [ ] Write the rules engine: given the state (side, rotation, position, items, boss progress), list the legal moves.
  Rotation after a flip: flipping over an edge that is left/right on screen turns rotation `t` into `-t`; over an edge that is top/bottom on screen, into `180 - t`. This solves `MAZERULES`; `MAZE3` and `MAZE823023` only solve if every flip gives `-t`, which probably means a misread connection there.
- [ ] Add per-card mechanics as small plugins: items/keys, boss sequence, and others found while annotating.
- [ ] Show a win/lose state.
- [ ] Decide what happens on cards with no `maze.json` yet. Default: free play, as now.

## 2. Play by clicking the icons

- [ ] Put clickable hotspots over spin icons (rotate) and flip triangles (flip), positioned from `maze.json`.
- [ ] Spin icons offer clockwise and counterclockwise.
- [ ] With rules on, a hotspot only works when the player stands on it.
- [ ] Keep swipe and the side buttons as a fallback for cards without data.

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
