// Guided mode: the reachable spin and flip spots light up; click one to use it. Items and the exit count once reachable; the rules in rules.js decide what is allowed.
const R = MazeRules;
const params = new URLSearchParams(location.search);
const cardName = params.get('card') || 'MAZERULES';
const cardEl = document.querySelector('#card');
const faces = { front: document.querySelector('.front.card'), back: document.querySelector('.back.card') };
const FLIP_MS = 1000; // matches the 1s transform transition in index.css

document.body.classList.add('guided');
for (const side of ['front', 'back']) {
  faces[side].innerHTML = `<img src="cards/${encodeURIComponent(cardName)}/${side}.png" alt=""><div class="layer"></div>`;
}

function fitCard() { cardEl.style.height = cardEl.offsetWidth * 1.4 + 'px'; }
fitCard();
window.addEventListener('resize', fitCard);

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <a href="./" class="hud-button">← Levels</a>
  <span id="hud-message" role="status" aria-live="polite"></span>
  <button type="button" id="hud-restart" class="hud-button">Restart</button>`;
document.querySelector('#app-wrapper').append(hud);
const message = text => { document.querySelector('#hud-message').textContent = text; };

let maze, state, css, busy = false;

function render() {
  cardEl.style.transform = `rotate(${css.R}deg) rotateX(${css.X}deg) rotateY(${css.Y}deg)`;
  for (const side of ['front', 'back']) faces[side].querySelector('.layer').classList.toggle('active', side === state.side);
  const reach = R.reachable(maze, state);
  for (const b of document.querySelectorAll('.spot')) {
    const n = R.node(maze, state.side, b.dataset.id);
    const can = !state.won && faces[state.side].contains(b) && reach.has(n.id) && (n.type === 'spin' || (n.type === 'flip' && R.flipLanding(maze, state.side, n)));
    b.classList.toggle('can', !!can);
    b.disabled = !can;
  }
  const onSpin = !state.won && R.node(maze, state.side, state.at).type === 'spin';
  document.querySelectorAll('.rotate-button').forEach(b => b.classList.toggle('disabled', !onSpin));
}

// Picks up every reachable item, then walks to the exit if it is reachable and unlocked.
function settle() {
  const reach = R.reachable(maze, state);
  const items = new Set(state.items);
  for (const id of reach.keys()) if (R.node(maze, state.side, id).type === 'item') items.add(`${state.side}.${id}`);
  state = { ...state, items: [...items] };
  const exit = [...reach.keys()].find(id => R.node(maze, state.side, id).type === 'exit');
  if (exit && R.missingItems(maze, state).length === 0) {
    state = { ...R.walk(maze, state, exit).state, won: true };
    message('You found the exit!');
    document.body.classList.add('won');
  } else {
    message(exit ? `The exit is locked. ${status()}` : status() || 'Find the exit.');
  }
  render();
}

function status() {
  const missing = R.missingItems(maze, state).length;
  const total = R.missingItems(maze, { items: [] }).length;
  return total ? `Items ${total - missing}/${total}` : '';
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function onSpot(side, n) {
  if (busy || side !== state.side || state.won) return;
  const res = R.walk(maze, state, n.id);
  if (res.error) return;
  busy = true;
  try {
    state = res.state;
    if (n.type === 'spin') await doSpin('cw');
    else if (n.type === 'flip') await doFlip();
  } finally {
    busy = false;
  }
}

async function doSpin(dir) {
  const res = R.spin(maze, state, dir);
  if (res.error) return;
  state = res.state;
  css = { ...css, R: css.R + (dir === 'ccw' ? -90 : 90) };
  render();
  await wait(FLIP_MS);
  settle();
}

async function doFlip() {
  const res = R.flip(maze, state);
  if (res.error) return;
  state = res.state;
  css = R.cssFlip(css, res.edge);
  console.assert(JSON.stringify(R.cssView(css)) === JSON.stringify({ side: state.side, rot: state.rot }), 'card view out of sync with rules');
  render();
  await wait(FLIP_MS);
  settle();
}

function buildSpots() {
  for (const side of ['front', 'back']) {
    const layer = faces[side].querySelector('.layer');
    layer.querySelectorAll('.spot').forEach(s => s.remove());
    for (const n of R.nodes(maze, side)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `spot spot-${n.type}`;
      b.dataset.id = n.id;
      b.style.left = n.x * 100 + '%';
      b.style.top = n.y * 100 + '%';
      b.setAttribute('aria-label', n.type === 'door' ? 'door' : n.label || n.type);
      b.addEventListener('click', () => onSpot(side, n));
      layer.append(b);
    }
  }
}

function restart() {
  state = R.start(maze);
  css = { R: 0, X: 0, Y: state.side === 'back' ? 180 : 0 };
  document.body.classList.remove('won');
  settle();
}

document.querySelector('#rotate-clockwise').addEventListener('click', () => !busy && !state.won && doSpin('cw'));
document.querySelector('#rotate-counterclockwise').addEventListener('click', () => !busy && !state.won && doSpin('ccw'));
document.querySelector('#hud-restart').addEventListener('click', () => !busy && restart());

fetch(`cards/${encodeURIComponent(cardName)}/maze.json`, { cache: 'no-store' })
  .then(r => (r.ok ? r.json() : null))
  .catch(() => null)
  .then(m => {
    if (!R.playable(m)) {
      message('Guided mode is not available for this card yet.');
      const free = document.createElement('a');
      free.className = 'hud-button';
      free.href = `play.html?card=${encodeURIComponent(cardName)}`;
      free.textContent = 'Free play';
      document.querySelector('#hud-restart').replaceWith(free);
      return;
    }
    maze = m;
    buildSpots();
    restart();
  });
