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
| `start` | where the player begins | |
| `exit` | goal | |
| `room` | open area | |
| `door` | passable only while its arrow points up on screen | `arrow`: `up` `down` `left` `right`, as printed |
| `spin` | the player may rotate the card here | |
| `flip` | triangle on the card edge; flip over that edge | `edge`: `top` `bottom` `left` `right` |
| `item` | something to collect | `label` |
| `special` | card-specific feature (lair, portal, sword, …) | `label` |

Edges are walkable connections; walking an edge is always allowed, doors gate movement through the door node.

Flipping over an edge lands on the other side at the mirrored point: `(x, y)` on one side touches `(1 - x, y)` on the other. So a `top` flip pairs with a `top` flip at `1 - x`, and a `right` flip pairs with a `left` flip at the same `y`.

`mechanics[].type` is one of `collect`, `boss`, `portal`, `counter`, `other`; `text` describes the rule as the card states it.

Check files with `node tools/validate.js [card ...]`.

## Editor

`tools/editor.html` shows a card with its graph drawn over it and lets you fix it. Serve the repo root (`python3 -m http.server 8000`) and open http://localhost:8000/tools/editor.html.
