// Usage: node tools/motion-test.js   Checks the phone-turn maths in scripts/motion.js.
const assert = require('assert');
const M = require('../scripts/motion.js');

// Orientation of a phone tilted `tilt` degrees up from flat (90 = straight up) and turned clockwise by `t` degrees
// in its own plane.
function pose(t, tilt = 75) {
  const D = Math.PI / 180, k = Math.sin(tilt * D), c = Math.cos(tilt * D);
  return { alpha: 0, beta: Math.asin(Math.cos(t * D) * k) / D, gamma: Math.atan2(Math.sin(t * D) * k, c) / D };
}

for (const tilt of [50, 75, 89]) for (const t of [0, 30, -30, 90, -90, 170]) {
  assert.ok(Math.abs(M.screenTurn(pose(t, tilt)) - t) < 1e-6, `turn ${t} at tilt ${tilt}`);
}
assert.strictEqual(M.screenTurn({ alpha: 0, beta: 5, gamma: 3 }), null, 'a phone lying flat is ignored');
assert.strictEqual(M.screenTurn({ alpha: null, beta: null, gamma: null }), null, 'no sensor');

const q = M.quarterTracker();
const seq = [0, 30, 50, 65, 90, 120, 180, -90, -50, -10].map(t => q.update(pose(t)));
assert.deepStrictEqual(seq, [0, 0, 0, 1, 1, 1, 2, 3, 3, 0], 'quarters change only near the next quarter');
assert.strictEqual(q.update({ alpha: 0, beta: 2, gamma: 1 }), 0, 'lying flat keeps the last quarter');

module.exports = { pose };
if (require.main === module) console.log('motion ok');
