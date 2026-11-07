// Usage: node tools/validate.js [card ...]   (no args = every card with a maze.json)
const fs = require('fs');
const path = require('path');
const { checkMaze } = require('./maze-check.js');
const cardsDir = path.join(__dirname, '..', 'cards');

const names = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(cardsDir).filter(c => fs.existsSync(path.join(cardsDir, c, 'maze.json')));
let failed = 0;
for (const name of names) {
  let res;
  try { res = checkMaze(JSON.parse(fs.readFileSync(path.join(cardsDir, name, 'maze.json'), 'utf8'))); }
  catch (e) { res = { errors: [e.message], warnings: [] }; }
  if (res.errors.length) failed++;
  const lines = [...res.errors.map(e => `  ERROR ${e}`), ...res.warnings.map(w => `  warn  ${w}`)];
  console.log(`${res.errors.length ? 'FAIL' : 'ok  '} ${name}${lines.length ? '\n' + lines.join('\n') : ''}`);
}
process.exit(failed ? 1 : 0);
