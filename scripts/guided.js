// Guided mode: the reachable spin and flip spots light up; click one to use it. A spin only puts the player on it; the arrow buttons (or turning the phone, with Motion on) then turn the card. Portals take two clicks: in, then out. Cards with several starts let the player pick one first. Items and the exit count once reachable; the rules in rules.js decide what is allowed.
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
window.addEventListener('resize', () => { fitCard(); if (state) render(); });

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <a href="./" class="hud-button">← Levels</a>
  <span id="hud-message" role="status" aria-live="polite"></span>
  <button type="button" id="hud-motion" class="hud-button" aria-pressed="false" hidden>Motion</button>
  <button type="button" id="hud-restart" class="hud-button">Restart</button>`;
document.querySelector('#app-wrapper').append(hud);
const message = text => { document.querySelector('#hud-message').textContent = text; };

let maze, state, css, busy = false;
// Motion: phoneQ is how many quarters the phone is turned clockwise. The card on screen does not follow the phone,
// so the card's turn in the world is its turn on screen plus the phone's: state.rot = cssView(css).rot + 90 * phoneQ.
// Turning the phone off a spin breaks that; the game then waits (`astray`) until the phone is turned back.
let motionOn = false, phoneQ = 0, astray = false;

function render() {
  // A sideways card is as wide as the card is tall; on narrow screens shrink it until it fits.
  const sideways = R.mod(css.R, 180) !== 0;
  const scale = sideways ? Math.min(1, (window.innerWidth - 32) / cardEl.offsetHeight) : 1;
  cardEl.style.transform = `scale(${scale}) rotate(${css.R}deg) rotateX(${css.X}deg) rotateY(${css.Y}deg)`;
  for (const side of ['front', 'back']) faces[side].querySelector('.layer').classList.toggle('active', side === state.side);
  const reach = R.reachable(maze, state);
  for (const b of document.querySelectorAll('.spot')) {
    const n = faces[state.side].contains(b) && R.node(maze, state.side, b.dataset.id);
    const usable = n && (state.choosing ? n.type === 'start'
      : state.inPortal ? n.type === 'portal'
      : reach.has(n.id) && (n.type === 'spin' || (n.type === 'flip' && R.flipLanding(maze, state.side, n))
        || (n.type === 'portal' && R.portalExits(maze, { ...state, at: n.id }).length)));
    const can = !state.won && !astray && usable;
    b.classList.toggle('can', !!can);
    b.classList.toggle('here', !!can && n.type === 'spin' && n.id === state.at);
    b.disabled = !can;
  }
  const onSpin = !state.won && !astray && !state.choosing && !state.inPortal && R.node(maze, state.side, state.at).type === 'spin';
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
  if (busy || astray || side !== state.side || state.won) return;
  if (state.choosing) { state = { ...state, at: n.id, choosing: false }; settle(); return; }
  if (state.inPortal) { // clicking the portal you are in steps back out of it
    state = { ...(n.id === state.at ? state : R.teleport(maze, state, n.id).state), inPortal: false };
    settle();
    return;
  }
  if (n.type === 'portal') {
    state = { ...R.walk(maze, state, n.id).state, inPortal: true };
    message('Pick the portal to come out of.');
    render();
    return;
  }
  const res = R.walk(maze, state, n.id);
  if (res.error) return;
  state = res.state;
  if (n.type === 'spin') {
    message(motionOn ? 'Turn the phone to turn the card.' : 'Turn the card with the arrows.');
    render();
  }
  else if (n.type === 'flip') await doFlip();
}

// body.busy while the card animates; input is ignored until it clears (the e2e tests wait on it).
async function animate() {
  busy = true;
  document.body.classList.add('busy');
  render();
  await wait(FLIP_MS);
  busy = false;
  document.body.classList.remove('busy');
  settle();
  syncPhone(); // the phone may have turned during the animation
}

async function doSpin(dir) {
  const res = R.spin(maze, state, dir);
  if (res.error) return;
  state = res.state;
  css = { ...css, R: css.R + (dir === 'ccw' ? -90 : 90) };
  await animate();
}

async function doFlip() {
  const res = R.flip(maze, state);
  if (res.error) return;
  state = res.state;
  // res.edge is the edge as the player sees it in the world; on a turned phone that is a different screen edge.
  css = R.cssFlip(css, R.EDGES_CW[R.mod(R.EDGES_CW.indexOf(res.edge) - phoneQ, 4)]);
  console.assert(JSON.stringify(R.cssView(css)) === JSON.stringify({ side: state.side, rot: R.mod(state.rot - 90 * phoneQ, 360) }), 'card view out of sync with rules');
  await animate();
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
  const starts = R.starts(maze);
  state = { ...starts[0], choosing: starts.length > 1 }; // maze-check keeps every start on one side
  css = { R: 0, X: 0, Y: state.side === 'back' ? 180 : 0 };
  document.body.classList.remove('won');
  astray = false;
  if (!state.choosing) settle();
  else { message('Pick where to start.'); render(); }
  syncPhone();
}

const canTurn = () => !busy && !state.won && !state.choosing && !state.inPortal;
document.querySelector('#rotate-clockwise').addEventListener('click', () => canTurn() && doSpin('cw'));
document.querySelector('#rotate-counterclockwise').addEventListener('click', () => canTurn() && doSpin('ccw'));
document.querySelector('#hud-restart').addEventListener('click', () => !busy && restart());

// Motion controls (opt-in): standing on a spin, turning the upright phone a quarter turns the card with it.
const tracker = MazeMotion.quarterTracker();
const motionButton = document.querySelector('#hud-motion');
let sawMotion = false;
motionButton.hidden = !('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches);

function onOrientation(e) {
  if (e.beta != null) sawMotion = true;
  // shortcut: if the browser auto-rotated the page, the phone's turn no longer matches the screen; we just ask for
  // the rotation lock instead of compensating for screen.orientation.angle.
  if (screen.orientation && screen.orientation.angle !== 0) { message("Turn on your phone's rotation lock."); return; }
  const q = tracker.update(e);
  if (q !== phoneQ) { phoneQ = q; syncPhone(); }
}

// Brings the game in line with the phone: on a spin the card turns with it; anywhere else the game waits.
function syncPhone() {
  if (!motionOn || !state || state.won || busy) return;
  const diff = R.mod(phoneQ - R.mod(state.rot - R.cssView(css).rot, 360) / 90, 4);
  if (diff === 0) {
    if (astray) { astray = false; settle(); }
    return;
  }
  if (canTurn() && R.node(maze, state.side, state.at).type === 'spin') {
    const dir = diff === 3 ? 'ccw' : 'cw';
    for (let i = 0; i < (diff === 3 ? 1 : diff); i++) state = R.spin(maze, state, dir).state;
    astray = false;
    settle();
    if (!state.won) message('Turn the phone to turn the card.');
    return;
  }
  astray = true;
  message('You can only turn the card on a spin. Turn the phone back.');
  render();
}

function setMotion(on) {
  if (!on && phoneQ) css = { ...css, R: css.R + 90 * phoneQ }; // hand the phone's turn back to the picture
  motionOn = on;
  phoneQ = 0;
  astray = false;
  motionButton.setAttribute('aria-pressed', on);
  if (on) window.addEventListener('deviceorientation', onOrientation);
  else window.removeEventListener('deviceorientation', onOrientation);
  if (state) settle();
}

motionButton.addEventListener('click', async () => {
  if (motionOn) { setMotion(false); return; }
  // iOS (and recent Chrome) only hand out sensor data after a permission request made straight from a tap.
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const answer = await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
    if (answer !== 'granted') { message('Motion access was not allowed.'); return; }
  }
  sawMotion = false;
  setMotion(true);
  screen.orientation?.lock?.('portrait').catch(() => {}); // only works fullscreen or installed; elsewhere the phone's rotation lock is needed
  message('Motion on: hold the phone upright and turn it while on a spin.');
  setTimeout(() => {
    if (motionOn && !sawMotion) { setMotion(false); message('No motion sensor found (it needs a phone and HTTPS).'); }
  }, 1500);
});

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
