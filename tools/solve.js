// Usage: node tools/solve.js [card ...]   Finds the shortest solution of each card under scripts/rules.js.
//        node tools/solve.js --self-test  Checks the engine against the hand-solved MAZERULES card.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const R = require('../scripts/rules.js');
const cardsDir = path.join(__dirname, '..', 'cards');

const key = s => `${s.side}|${s.rot}|${s.at}|${[...s.items].sort()}`;

function solve(maze) {
  const first = R.start(maze);
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
  console.log('self-test ok');
}

if (process.argv[2] === '--self-test') { selfTest(); process.exit(0); }
const names = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(cardsDir).filter(c => fs.existsSync(path.join(cardsDir, c, 'maze.json')));
let solved = 0, total = 0;
for (const name of names) {
  const maze = JSON.parse(fs.readFileSync(path.join(cardsDir, name, 'maze.json'), 'utf8'));
  if (!R.playable(maze)) { console.log(`skip ${name} (no start/exit or unplayable)`); continue; }
  total++;
  const moves = solve(maze);
  if (moves) solved++;
  console.log(moves ? `ok   ${name}: ${moves.length} moves` : `FAIL ${name}: no solution`);
}
console.log(`${solved}/${total} playable cards solvable`);
