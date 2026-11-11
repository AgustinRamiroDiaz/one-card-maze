// Usage: node tools/game-test.js   Checks scripts/game.js (the session layer) and the layer order of scripts/*.js.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const R = require('../scripts/rules.js');
const G = require('../scripts/game.js');
const { solve } = require('./solve.js');
const root = path.join(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, 'cards', name, 'maze.json'), 'utf8'));
const types = res => res.events.map(e => e.type);

// The tutorial card, played through the session the way a player would.
function tutorial() {
  const maze = load('MAZERULES');
  let res = G.restart(maze);
  assert.deepStrictEqual(res.events, [{ type: 'settled', exit: 'none', items: null }]);
  assert.strictEqual(G.spotStates(maze, res.state).get('spin3'), 'usable');
  assert.deepStrictEqual(types(G.tap(maze, res.state, 'front', 'flipBottom')), ['blocked'], 'door2 is locked');
  assert.deepStrictEqual(types(G.tap(maze, res.state, 'back', 'exit')), [], 'taps on the other side do nothing');
  res = G.turn(maze, res.state, 'cw'); // the only spin in reach: walked onto it and turned
  assert.deepStrictEqual(types(res), ['spun', 'settled']);
  assert.strictEqual(res.state.at, 'spin3');
  assert.strictEqual(G.spotStates(maze, res.state).get('spin3'), 'here');
  res = G.tap(maze, res.state, 'front', 'flipBottom');
  assert.deepStrictEqual(types(res), ['flipped', 'settled']);
  assert.deepStrictEqual([res.state.side, res.state.at, res.state.rot], ['back', 'flipBottom', 270]);
  const swiped = G.swipe(maze, G.restart(maze).state, 'bottom');
  assert.deepStrictEqual(types(swiped), ['no-flip'], 'flipBottom is behind a locked door at the start');
}

// Every card the rules can solve must be winnable through the session using only what the player is offered:
// tapping spots spotStates marks usable, and turning when a spin is in reach.
function winnable(maze, first) {
  const key = s => JSON.stringify([s.side, s.rot, s.at, [...s.items].sort(), !!s.choosing, !!s.inPortal]);
  const seen = new Set([key(first)]);
  const queue = [first];
  while (queue.length) {
    const s = queue.shift();
    if (s.won) return true;
    const next = [...G.spotStates(maze, s).keys()].map(id => G.tap(maze, s, s.side, id).state);
    if (G.turnSpin(maze, s)) next.push(G.turn(maze, s, 'cw').state, G.turn(maze, s, 'ccw').state);
    for (const n of next) if (!seen.has(key(n))) { seen.add(key(n)); queue.push(n); }
  }
  return false;
}

function everyCard() {
  let checked = 0;
  for (const name of fs.readdirSync(path.join(root, 'cards'))) {
    if (!fs.existsSync(path.join(root, 'cards', name, 'maze.json'))) continue;
    const maze = load(name);
    if (!R.playable(maze)) continue;
    for (const start of R.starts(maze)) {
      if (!solve(maze, start)) continue; // unsolvable maps are tools/solve.js's report
      assert.ok(winnable(maze, { ...start, choosing: false }), `${name} from ${start.at}: solvable by the rules but not through the game`);
      checked++;
    }
  }
  return checked;
}

// Layers, lowest first. A file may use only the layers below it, so there are no cycles.
// rules.js, game.js and card-view.js must also stay free of the DOM so Node can run them.
function layers() {
  const order = [
    ['rules.js', 'MazeRules'], ['game.js', 'MazeGame'], ['card-view.js', 'CardView'], ['motion.js', 'MazeMotion'],
    ['view.js', 'MazeView'], ['guided.js', null],
  ];
  const uses = { 'game.js': ['rules.js'], 'view.js': ['card-view.js'], 'guided.js': ['rules.js', 'game.js', 'view.js', 'motion.js'] };
  for (const [file] of order) {
    const src = fs.readFileSync(path.join(root, 'scripts', file), 'utf8').replace(/\/\/.*$/gm, '');
    for (const [other, global] of order) {
      if (other === file) continue;
      const used = (global && new RegExp(`\\b${global}\\b`).test(src)) || src.includes(`require('./${other}')`);
      assert.strictEqual(used, (uses[file] ?? []).includes(other), `${file} ${used ? 'must not use' : 'should use'} ${other}`);
    }
    if (['rules.js', 'game.js', 'card-view.js', 'motion.js'].includes(file))
      assert.ok(!/\b(document|window)\b/.test(src), `${file} must not touch the DOM`);
  }
}

tutorial();
layers();
const n = everyCard();
console.log(`game ok (${n} card starts winnable through the session)`);
