// A game session on top of rules.js: what a player's tap, turn or swipe does, and what happened as a result.
// No DOM, no text, no input devices. Each function takes the state and returns { state, events } without mutating it.
// State: rules.js state plus { choosing, inPortal, won }.
// Events (the view decides how each one looks and sounds):
//   { type: 'choose-start' }                       several starts: tap one
//   { type: 'settled', exit: 'none'|'locked'|'open', items: { got, total } | null }
//   { type: 'portal-entered' }                     tap the portal to come out of
//   { type: 'on-spin' }                            standing on a spin; turning is possible
//   { type: 'spun', dir: 'cw'|'ccw' }
//   { type: 'flipped', edge }                      edge: the edge as the player sees it, before the flip
//   { type: 'won' }
//   { type: 'blocked', id }                        the tapped spot is out of reach
//   { type: 'no-flip' } | { type: 'many-flips' }   a swipe found none, or several, flips on that edge
// Shared by guided.js (browser) and tools/game-test.js (Node).
(function (root) {
  const R = typeof module !== 'undefined' ? require('./rules.js') : root.MazeRules;
  const none = state => ({ state, events: [] });

  // Picks up every reachable item and reports whether the exit can be reached.
  function settle(maze, state) {
    const reach = R.reachable(maze, state);
    const items = new Set(state.items);
    for (const id of reach.keys()) if (R.node(maze, state.side, id).type === 'item') items.add(`${state.side}.${id}`);
    state = { ...state, items: [...items] };
    const total = R.missingItems(maze, { items: [] }).length;
    const missing = R.missingItems(maze, state).length;
    const exitInReach = [...reach.keys()].some(id => R.node(maze, state.side, id).type === 'exit');
    const exit = !exitInReach ? 'none' : missing ? 'locked' : 'open';
    return { state, events: [{ type: 'settled', exit, items: total ? { got: total - missing, total } : null }] };
  }

  // Back to the card's start; with several starts the player picks one first.
  function restart(maze) {
    const starts = R.starts(maze);
    const state = { ...starts[0], choosing: starts.length > 1 }; // maze-check keeps every start on one side
    return state.choosing ? { state, events: [{ type: 'choose-start' }] } : settle(maze, state);
  }

  function flip(maze, state) {
    const res = R.flip(maze, state);
    if (res.error) return none(state);
    const after = settle(maze, res.state);
    return { state: after.state, events: [{ type: 'flipped', edge: res.edge }, ...after.events] };
  }

  // A tap on a spot of `side`.
  function tap(maze, state, side, id) {
    if (side !== state.side || state.won) return none(state);
    const n = R.node(maze, side, id);
    if (!n) return none(state);
    if (state.choosing) return settle(maze, { ...state, at: id, choosing: false });
    if (state.inPortal) { // tapping the portal you are in steps back out of it
      const out = id === state.at ? state : R.teleport(maze, state, id).state;
      return settle(maze, { ...out, inPortal: false });
    }
    if (n.type === 'portal') {
      const res = R.walk(maze, state, id);
      if (res.error) return { state, events: [{ type: 'blocked', id }] };
      return { state: { ...res.state, inPortal: true }, events: [{ type: 'portal-entered' }] };
    }
    const res = R.walk(maze, state, id);
    if (res.error) return { state, events: [{ type: 'blocked', id }] };
    if (n.type === 'exit') {
      const won = R.won(maze, res.state);
      return won ? { state: { ...res.state, won }, events: [{ type: 'won' }] } : settle(maze, res.state);
    }
    if (n.type === 'spin') return { state: res.state, events: [{ type: 'on-spin' }] };
    if (n.type === 'flip') return flip(maze, res.state);
    return none(res.state);
  }

  // The spin a turn would use: the one the player stands on, or else the only one in reach (they are walked onto it).
  // With none, or several to choose from, there is none and the player has to tap a spin first.
  function turnSpin(maze, state) {
    if (state.won || state.choosing || state.inPortal) return null;
    if (R.node(maze, state.side, state.at).type === 'spin') return state.at;
    const spins = [...R.reachable(maze, state).keys()].filter(id => R.node(maze, state.side, id).type === 'spin');
    return spins.length === 1 ? spins[0] : null;
  }

  function turn(maze, state, dir) {
    const spin = turnSpin(maze, state);
    if (!spin) return none(state);
    const res = R.spin(maze, R.walk(maze, state, spin).state, dir);
    const after = settle(maze, res.state);
    return { state: after.state, events: [{ type: 'spun', dir }, ...after.events] };
  }

  // A swipe that leaves through `edge` (as the player sees the card) uses the one reachable flip on that edge.
  function swipe(maze, state, edge) {
    if (state.won || state.choosing || state.inPortal) return none(state);
    const flips = [...R.reachable(maze, state).keys()].map(id => R.node(maze, state.side, id))
      .filter(n => n.type === 'flip' && R.screenEdge(n, state.rot) === edge && R.flipLanding(maze, state.side, n));
    if (flips.length === 1) return tap(maze, state, state.side, flips[0].id);
    return { state, events: [{ type: flips.length ? 'many-flips' : 'no-flip' }] };
  }

  // What each spot on the side in play shows right now: Map id -> state. Spots not in the map show nothing.
  //   'usable'  tap it now            'here'  the spin the player stands on (also usable)
  //   'locked'  a shut door at the edge of the player's reach, or the exit in reach while items are missing
  //   'used'    an item already picked up
  function spotStates(maze, state) {
    const out = new Map();
    if (state.won) return out;
    const reach = R.reachable(maze, state);
    const missing = R.missingItems(maze, state).length;
    const edges = maze.sides?.[state.side]?.edges ?? [];
    const besideReach = id => edges.some(([a, b]) => (a === id && reach.has(b)) || (b === id && reach.has(a)));
    for (const n of R.nodes(maze, state.side)) {
      const usable = state.choosing ? n.type === 'start'
        : state.inPortal ? n.type === 'portal'
        : reach.has(n.id) && (n.type === 'spin' || (n.type === 'flip' && !!R.flipLanding(maze, state.side, n))
          || (n.type === 'exit' && !missing)
          || (n.type === 'portal' && R.portalExits(maze, { ...state, at: n.id }).length > 0));
      if (usable) out.set(n.id, n.type === 'spin' && n.id === state.at ? 'here' : 'usable');
      else if (n.type === 'item' && state.items.includes(`${state.side}.${n.id}`)) out.set(n.id, 'used');
      else if (state.choosing || state.inPortal) continue;
      else if (n.type === 'exit' && reach.has(n.id)) out.set(n.id, 'locked');
      else if (n.type === 'door' && !R.doorOpen(n, state.rot) && besideReach(n.id)) out.set(n.id, 'locked');
    }
    return out;
  }

  const api = { restart, settle, tap, turn, turnSpin, swipe, spotStates };
  if (typeof module !== 'undefined') module.exports = api; else root.MazeGame = api;
})(this);
