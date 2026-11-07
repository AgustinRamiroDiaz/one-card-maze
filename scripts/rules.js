// One Card Maze rules engine, shared by the guided game (browser) and tools/solve.js (Node).
// State: { side: 'front'|'back', rot: 0|90|180|270 (clockwise turn of the visible image), at: nodeId, items: [ids] }
(function (root) {
  const EDGES_CW = ['top', 'right', 'bottom', 'left'];
  const ARROWS_CW = ['up', 'right', 'down', 'left'];
  const MIRROR = { top: 'top', bottom: 'bottom', left: 'right', right: 'left' };
  const mod = (a, n) => ((a % n) + n) % n;
  const other = side => (side === 'front' ? 'back' : 'front');

  // Where an image direction ends up on screen after turning the image `rot` degrees clockwise.
  const onScreen = (list, value, rot) => list[mod(list.indexOf(value) + rot / 90, 4)];
  const doorOpen = (node, rot) => onScreen(ARROWS_CW, node.arrow, rot) === 'up';
  const screenEdge = (node, rot) => onScreen(EDGES_CW, node.edge, rot);

  // Turning the card over an edge that is left/right on screen mirrors the turn (t -> -t);
  // over an edge that is top/bottom on screen it also adds a half turn (t -> 180 - t).
  const rotAfterFlip = (rot, edgeOnScreen) =>
    mod((edgeOnScreen === 'left' || edgeOnScreen === 'right') ? -rot : 180 - rot, 360);

  // The game draws the card like the original UI: rotate(R) rotateX(X) rotateY(Y).
  // A flip turns X or Y by 180 depending on which local axis lies along the screen edge.
  function cssFlip(css, edgeOnScreen) {
    const sideways = edgeOnScreen === 'left' || edgeOnScreen === 'right';
    const axis = sideways === (mod(css.R, 180) === 0) ? 'Y' : 'X';
    const sign = edgeOnScreen === 'right' || edgeOnScreen === 'bottom' ? 1 : -1; // only affects the animation
    return { ...css, [axis]: css[axis] + 180 * sign };
  }
  function cssView(css) {
    const x = mod(css.X, 360) === 180, y = mod(css.Y, 360) === 180;
    return { side: x !== y ? 'back' : 'front', rot: mod(css.R + (x ? 180 : 0), 360) };
  }

  function nodes(maze, side) { return maze.sides?.[side]?.nodes ?? []; }
  function node(maze, side, id) { return nodes(maze, side).find(n => n.id === id); }

  function neighbours(maze, side, id) {
    const out = [];
    for (const [a, b] of maze.sides?.[side]?.edges ?? []) {
      if (a === id) out.push(b); else if (b === id) out.push(a);
    }
    return out;
  }

  const passable = (n, rot) => n.type !== 'door' || doorOpen(n, rot);

  // Shortest walk from state.at to every node reachable without leaving the side or rotating.
  // Returns Map id -> [path of ids, starting after state.at].
  function reachable(maze, state) {
    const paths = new Map([[state.at, []]]);
    const queue = [state.at];
    while (queue.length) {
      const cur = queue.shift();
      for (const nb of neighbours(maze, state.side, cur)) {
        const n = node(maze, state.side, nb);
        if (!n || paths.has(nb) || !passable(n, state.rot)) continue;
        paths.set(nb, [...paths.get(cur), nb]);
        queue.push(nb);
      }
    }
    return paths;
  }

  function flipLanding(maze, side, flipNode) {
    const candidates = nodes(maze, other(side)).filter(n => n.type === 'flip');
    if (flipNode.pair) return candidates.find(n => n.id === flipNode.pair) ?? null;
    const tx = 1 - flipNode.x, ty = flipNode.y;
    let best = null, bestD = 0.15;
    for (const n of candidates) {
      if (n.edge !== MIRROR[flipNode.edge]) continue;
      const d = Math.hypot(n.x - tx, n.y - ty);
      if (d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  const itemIds = maze => ['front', 'back'].flatMap(s => nodes(maze, s).filter(n => n.type === 'item').map(n => `${s}.${n.id}`));

  function start(maze) {
    for (const side of ['front', 'back']) {
      const s = nodes(maze, side).find(n => n.type === 'start');
      if (s) return { side, rot: 0, at: s.id, items: [] };
    }
    return null;
  }

  // Moves. Each returns { state, path?, error? } and never mutates its input.
  function walk(maze, state, target) {
    const path = reachable(maze, state).get(target);
    if (!path) return { state, error: 'blocked' };
    const items = new Set(state.items);
    for (const id of path) if (node(maze, state.side, id).type === 'item') items.add(`${state.side}.${id}`);
    return { state: { ...state, at: target, items: [...items] }, path };
  }

  function spin(maze, state, dir) {
    if (node(maze, state.side, state.at)?.type !== 'spin') return { state, error: 'not-on-spin' };
    return { state: { ...state, rot: mod(state.rot + (dir === 'ccw' ? -90 : 90), 360) } };
  }

  function flip(maze, state) {
    const here = node(maze, state.side, state.at);
    if (here?.type !== 'flip') return { state, error: 'not-on-flip' };
    const landing = flipLanding(maze, state.side, here);
    if (!landing) return { state, error: 'no-landing' };
    const edge = screenEdge(here, state.rot);
    return { state: { ...state, side: other(state.side), rot: rotAfterFlip(state.rot, edge), at: landing.id }, edge };
  }

  function missingItems(maze, state) {
    return itemIds(maze).filter(id => !state.items.includes(id));
  }

  function won(maze, state) {
    return node(maze, state.side, state.at)?.type === 'exit' && missingItems(maze, state).length === 0;
  }

  const playable = maze => maze?.status !== 'unplayable' && !!start(maze) &&
    ['front', 'back'].some(s => nodes(maze, s).some(n => n.type === 'exit'));

  const api = { EDGES_CW, ARROWS_CW, doorOpen, screenEdge, rotAfterFlip, node, nodes, reachable, flipLanding,
    start, walk, spin, flip, missingItems, won, playable, other, mod, cssFlip, cssView };
  if (typeof module !== 'undefined') module.exports = api; else root.MazeRules = api;
})(this);
