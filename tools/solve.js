// Usage: node tools/solve.js [card ...]   Finds the shortest solution from every start of each card under scripts/rules.js;
//                                          exits 1 if any start of a playable card has no solution.
//        node tools/solve.js --self-test  Checks the engine against the hand-solved MAZERULES card.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const R = require('../scripts/rules.js');
const cardsDir = path.join(__dirname, '..', 'cards');

const key = s => `${s.side}|${s.rot}|${s.at}|${[...s.items].sort()}`;

function solve(maze, first = R.start(maze)) {
  const seen = new Map([[key(first), null]]);
  const queue = [first];
  const visit = (from, to, move) => {
    const k = key(to);
    if (seen.has(k)) return;
    seen.set(k, { from: key(from), move, state: from });
    queue.push(to);
  };
  while (queue.length) {
    const s = queue.shift();
    if (R.won(maze, s)) {
      const moves = [];
      for (let k = key(s); seen.get(k); k = seen.get(k).from) moves.unshift(seen.get(k).move);
      return moves;
    }
    for (const [id] of R.reachable(maze, s)) if (id !== s.at) visit(s, R.walk(maze, s, id).state, `walk ${s.side}.${id}`);
    for (const dir of ['cw', 'ccw']) { const r = R.spin(maze, s, dir); if (!r.error) visit(s, r.state, `spin ${dir}`); }
    const f = R.flip(maze, s); if (!f.error) visit(s, f.state, `flip ${f.edge}`);
    for (const id of R.portalExits(maze, s)) visit(s, R.teleport(maze, s, id).state, `teleport ${s.side}.${id}`);
  }
  return null;
}

function selfTest() {
  for (const R0 of [0, 90, 180, 270, -90, 450]) for (const X of [0, 180, -180]) for (const Y of [0, 180, 360])
    for (const edge of R.EDGES_CW) {
      const before = R.cssView({ R: R0, X, Y });
      const after = R.cssView(R.cssFlip({ R: R0, X, Y }, edge));
      assert.notStrictEqual(after.side, before.side);
      assert.strictEqual(after.rot, R.rotAfterFlip(before.rot, edge), `R=${R0} X=${X} Y=${Y} ${edge}`);
    }
  // The original UI.js swipe handler, per rotation: which swipe turns X and which turns Y, and the sign for a
  // right/down swipe (Y's sign reverses once X is flipped). cssFlip must animate the same way.
  const original = { 0: { X: ['v', -1], Y: ['h', 1] }, 90: { X: ['h', 1], Y: ['v', 1] },
    180: { X: ['v', 1], Y: ['h', -1] }, 270: { X: ['h', -1], Y: ['v', -1] } };
  for (const R0 of [0, 90, 180, 270]) for (const X of [0, 180]) for (const edge of R.EDGES_CW) {
    const swipe = edge === 'left' || edge === 'right' ? 'h' : 'v', dir = edge === 'right' || edge === 'bottom' ? 1 : -1;
    const axis = original[R0].X[0] === swipe ? 'X' : 'Y';
    const want = 180 * dir * original[R0][axis][1] * (axis === 'Y' && X === 180 ? -1 : 1);
    const got = R.cssFlip({ R: R0, X, Y: 0 }, edge);
    assert.deepStrictEqual(got, { R: R0, X, Y: 0, [axis]: (axis === 'X' ? X : 0) + want }, `animation R=${R0} X=${X} ${edge}`);
  }
  const maze = JSON.parse(fs.readFileSync(path.join(cardsDir, 'MAZERULES', 'maze.json'), 'utf8'));
  let s = R.start(maze);
  assert.ok(R.walk(maze, s, 'door2').error, 'door2 starts locked');
  s = R.walk(maze, s, 'spin3').state;
  s = R.spin(maze, s, 'cw').state;
  s = R.walk(maze, s, 'flipBottom').state;
  const f = R.flip(maze, s);
  assert.deepStrictEqual([f.state.side, f.state.at, f.state.rot], ['back', 'flipBottom', 270]);
  assert.ok(!R.walk(maze, f.state, 'spinSE').error, 'door right is open after the flip');
  assert.ok(solve(maze), 'MAZERULES solvable');
  const portals = JSON.parse(fs.readFileSync(path.join(cardsDir, 'MAZE2404984', 'maze.json'), 'utf8'));
  let p = R.start(portals);
  assert.ok(R.walk(portals, p, 'portalTop').error, 'portals are not walkable shortcuts');
  assert.ok(R.teleport(portals, p, 'portalTop').error, 'teleport needs the player on a portal');
  p = R.teleport(portals, R.walk(portals, p, 'portalStart').state, 'portalTop').state;
  assert.strictEqual(p.at, 'portalTop');
  assert.ok(solve(portals), 'MAZE2404984 solvable through portals');
  console.log('self-test ok');
}

function main() {
  if (process.argv[2] === '--self-test') { selfTest(); return; }
  const names = process.argv.slice(2).length ? process.argv.slice(2)
    : fs.readdirSync(cardsDir).filter(c => fs.existsSync(path.join(cardsDir, c, 'maze.json')));
  let solved = 0, total = 0;
  for (const name of names) {
    const maze = JSON.parse(fs.readFileSync(path.join(cardsDir, name, 'maze.json'), 'utf8'));
    if (!R.playable(maze)) { console.log(`skip ${name} (no start/exit or unplayable)`); continue; }
    total++;
    const results = R.starts(maze).map(s => [s.at, solve(maze, s)]);
    const ok = results.every(([, moves]) => moves);
    if (ok) solved++;
    const detail = results.map(([at, moves]) => `${at} ${moves ? moves.length + ' moves' : 'no solution'}`).join(', ');
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
  }
  console.log(`${solved}/${total} playable cards solvable from every start`);
  process.exit(solved === total ? 0 : 1);
}

module.exports = { solve };
if (require.main === module) main();
