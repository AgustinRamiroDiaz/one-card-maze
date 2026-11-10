// The game, in two modes that can be switched at any time without reloading.
// Free play: swipe the card to flip it over the edge you swipe toward; the arrows always turn it. Nothing is checked.
// Rules (?mode=guided): the reachable spin and flip spots light up; click one to use it. A spin only puts the player on it; the arrow buttons (or turning the phone, with Motion on) then turn the card. Portals take two clicks: in, then out. Cards with several starts let the player pick one first; switching in from free play keeps the card as it lies and lets the player pick any spot on it. Items are picked up once reachable; the exit lights up once reachable and unlocked, and tapping it wins; the rules in rules.js decide what is allowed.
const R = MazeRules;
const params = new URLSearchParams(location.search);
const cardName = params.get('card') || 'MAZERULES';
const cardEl = document.querySelector('#card');
const faces = { front: document.querySelector('.front.card'), back: document.querySelector('.back.card') };
const FLIP_MS = 1000; // matches the 1s transform transition in index.css

document.body.classList.add('guided');
for (const side of ['front', 'back']) {
  faces[side].innerHTML = `<img src="cards/${encodeURIComponent(cardName)}/${side}.png" alt="" draggable="false"><div class="layer"></div>`;
}

function fitCard() { cardEl.style.height = cardEl.offsetWidth * 1.4 + 'px'; }
fitCard();
window.addEventListener('resize', () => { fitCard(); render(); });

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <a href="./" class="hud-button">← Levels</a>
  <span id="hud-message" role="status" aria-live="polite"></span>
  <button type="button" id="hud-motion" class="hud-button" aria-pressed="false" hidden>Motion</button>
  <button type="button" id="hud-restart" class="hud-button">Restart</button>
  <button type="button" id="hud-mode" class="hud-button" hidden></button>`;
document.querySelector('#app-wrapper').append(hud);

// With Motion on, points to world up (where a door's arrow must point to open) as the phone turns.
const north = document.createElement('div');
north.id = 'north';
north.hidden = true;
north.setAttribute('aria-hidden', 'true');
north.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2 19 20 12 16 5 20Z"/></svg><b>N</b>';
document.body.append(north);

const message = text => { document.querySelector('#hud-message').textContent = text; };

// css is the card as drawn and is the only state free play has; state (rules.js) exists only once rules are on.
let maze, state, css = { R: 0, X: 0, Y: 0 }, busy = false, free = true;
// Motion: phoneQ is how many quarters the phone is turned clockwise. The card on screen does not follow the phone,
// so the card's turn in the world is its turn on screen plus the phone's: state.rot = cssView(css).rot + 90 * phoneQ.
// Turning the phone off a spin breaks that; the game then waits (`astray`) until the phone is turned back.
let motionOn = false, phoneQ = 0, astray = false;

function render() {
  // A sideways card is as wide as the card is tall; on narrow screens shrink it until it fits.
  const sideways = R.mod(css.R, 180) !== 0;
  const scale = sideways ? Math.min(1, (window.innerWidth - 32) / cardEl.offsetHeight) : 1;
  cardEl.style.transform = `scale(${scale}) rotate(${css.R}deg) rotateX(${css.X}deg) rotateY(${css.Y}deg)`;
  const up = free ? R.cssView(css).side : state.side;
  for (const side of ['front', 'back']) faces[side].querySelector('.layer').classList.toggle('active', side === up);
  const reach = !free && R.reachable(maze, state);
  for (const b of document.querySelectorAll('.spot')) {
    const n = !free && faces[state.side].contains(b) && R.node(maze, state.side, b.dataset.id);
    const usable = n && (state.choosing === 'any' ? n.type !== 'door' && n.type !== 'exit'
      : state.choosing ? n.type === 'start'
      : state.inPortal ? n.type === 'portal'
      : reach.has(n.id) && (n.type === 'spin' || (n.type === 'flip' && R.flipLanding(maze, state.side, n))
        || (n.type === 'exit' && R.missingItems(maze, state).length === 0)
        || (n.type === 'portal' && R.portalExits(maze, { ...state, at: n.id }).length)));
    const can = usable && !state.won && !astray;
    b.classList.toggle('can', !!can);
    b.classList.toggle('here', !!can && n.type === 'spin' && n.id === state.at);
    b.disabled = !can;
  }
  const onSpin = free || (!state.won && !astray && !state.choosing && !state.inPortal && R.node(maze, state.side, state.at).type === 'spin');
  document.querySelectorAll('.rotate-button').forEach(b => b.classList.toggle('disabled', !onSpin));
}

// Turns rules on (the player then picks where they are on the card as it lies) or off, keeping the card in place.
function setFree(on) {
  if (busy) return;
  if (on && motionOn) setMotion(false); // motion only turns the card on a spin, so it belongs to rules
  free = on;
  document.body.classList.toggle('free', on);
  document.body.classList.remove('won');
  const modeButton = document.querySelector('#hud-mode');
  modeButton.textContent = on ? 'Enforce rules' : 'Free play';
  modeButton.hidden = !maze;
  document.querySelector('#hud-restart').hidden = on;
  motionButton.hidden = on || !motionSupported;
  const url = new URL(location.href);
  if (on) url.searchParams.delete('mode'); else url.searchParams.set('mode', 'guided');
  history.replaceState(null, '', url);
  if (on) { message(''); render(); } else restart(R.cssView(css));
}

// Picks up every reachable item and says whether the exit can be reached.
function settle() {
  const reach = R.reachable(maze, state);
  const items = new Set(state.items);
  for (const id of reach.keys()) if (R.node(maze, state.side, id).type === 'item') items.add(`${state.side}.${id}`);
  state = { ...state, items: [...items] };
  const exit = [...reach.keys()].find(id => R.node(maze, state.side, id).type === 'exit');
  if (!exit) message(status() || 'Find the exit.');
  else if (R.missingItems(maze, state).length) message(`The exit is locked. ${status()}`);
  else message('The exit is open. Tap it to leave.');
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
  if (n.type === 'exit') {
    state = { ...state, won: R.won(maze, state) };
    message('You found the exit!');
    document.body.classList.add('won');
    render();
    confetti();
  }
  else if (n.type === 'spin') {
    message(motionOn ? 'Turn the phone to turn the card.' : 'Turn the card with the arrows.');
    render();
  }
  else if (n.type === 'flip') await doFlip();
}

// A burst of paper bits from the top of the screen; removed when it lands.
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#E8443A', '#FFD600', '#2B8A3E', '#1C7ED6', '#F783AC', '#FFFFFF'];
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const h = window.innerHeight;
  const falls = Array.from({ length: 120 }, () => {
    const bit = document.createElement('i');
    bit.style.left = Math.random() * 100 + '%';
    bit.style.background = colors[Math.floor(Math.random() * colors.length)];
    layer.append(bit);
    const drift = (Math.random() - 0.5) * 200, spin = (Math.random() - 0.5) * 1440;
    return bit.animate([
      { transform: 'translate(0, -20px) rotate(0deg)', opacity: 1 },
      { transform: `translate(${drift}px, ${h + 40}px) rotate(${spin}deg)`, opacity: 0.8 },
    ], { duration: 2200 + Math.random() * 1800, delay: Math.random() * 400, easing: 'cubic-bezier(.25,.6,.5,1)', fill: 'forwards' }).finished;
  });
  Promise.all(falls).then(() => layer.remove());
}

// body.busy while the card animates; input is ignored until it clears (the e2e tests wait on it).
async function animate() {
  busy = true;
  document.body.classList.add('busy');
  render();
  await wait(FLIP_MS);
  busy = false;
  document.body.classList.remove('busy');
  if (free) { render(); return; }
  settle();
  syncPhone(); // the phone may have turned during the animation
}

function freeTurn(dir) {
  css = { ...css, R: css.R + (dir === 'ccw' ? -90 : 90) };
  animate();
}

// Free play: a drag of 50px or more flips the card over the screen edge it moves toward, once per drag.
let dragFrom = null;
cardEl.addEventListener('pointerdown', e => {
  if (!free || busy) return;
  dragFrom = { x: e.clientX, y: e.clientY };
  cardEl.setPointerCapture(e.pointerId); // keep getting moves once the finger leaves the card
});
cardEl.addEventListener('pointermove', e => {
  if (!dragFrom) return;
  const dx = e.clientX - dragFrom.x, dy = e.clientY - dragFrom.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
  dragFrom = null;
  css = R.cssFlip(css, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top'));
  animate();
});
for (const type of ['pointerup', 'pointercancel']) cardEl.addEventListener(type, () => { dragFrom = null; });

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

// view ({ side, rot }) starts with the card lying that way and any spot on it pickable; otherwise the card's own start(s).
function restart(view) {
  const starts = R.starts(maze);
  state = view ? { ...view, at: null, items: [], choosing: 'any' }
    : { ...starts[0], choosing: starts.length > 1 }; // maze-check keeps every start on one side
  // view came from css, so css already draws it; rebuilding it would animate the card through an equivalent pose.
  if (!view) css = { R: state.rot, X: 0, Y: state.side === 'back' ? 180 : 0 };
  document.body.classList.remove('won');
  astray = false;
  if (!state.choosing) settle();
  else { message(view ? 'Tap where you are on the card.' : 'Pick where to start.'); render(); }
  syncPhone();
}

const canTurn = () => !busy && !state.won && !state.choosing && !state.inPortal;
const turnCard = dir => busy ? null : free ? freeTurn(dir) : canTurn() && doSpin(dir);
document.querySelector('#rotate-clockwise').addEventListener('click', () => turnCard('cw'));
document.querySelector('#rotate-counterclockwise').addEventListener('click', () => turnCard('ccw'));
document.querySelector('#hud-restart').addEventListener('click', () => !busy && restart());
document.querySelector('#hud-mode').addEventListener('click', () => setFree(!free));

// Motion controls (opt-in): standing on a spin, turning the upright phone a quarter turns the card with it.
const tracker = MazeMotion.quarterTracker();
const motionButton = document.querySelector('#hud-motion');
let sawMotion = false;
const motionSupported = 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches;

function onOrientation(e) {
  if (e.beta != null) sawMotion = true;
  // shortcut: if the browser auto-rotated the page, the phone's turn no longer matches the screen; we just ask for
  // the rotation lock instead of compensating for screen.orientation.angle.
  if (screen.orientation && screen.orientation.angle !== 0) { message("Turn on your phone's rotation lock."); return; }
  const turn = MazeMotion.screenTurn(e);
  if (turn != null) north.style.transform = `rotate(${-turn}deg)`;
  const q = tracker.update(e);
  if (q !== phoneQ) { phoneQ = q; syncPhone(); }
}

// Brings the game in line with the phone: on a spin the card turns with it. Off a spin, if exactly one spin is
// reachable the player is walked onto it first; otherwise (none, or a choice to make) the game waits.
function syncPhone() {
  if (!motionOn || !state || state.won || busy) return;
  const diff = R.mod(phoneQ - R.mod(state.rot - R.cssView(css).rot, 360) / 90, 4);
  if (diff === 0) {
    if (astray) { astray = false; settle(); }
    return;
  }
  if (canTurn() && R.node(maze, state.side, state.at).type !== 'spin') {
    const spins = [...R.reachable(maze, state).keys()].filter(id => R.node(maze, state.side, id).type === 'spin');
    if (spins.length === 1) state = R.walk(maze, state, spins[0]).state;
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
  north.hidden = !on;
  north.style.transform = '';
  if (on) window.addEventListener('deviceorientation', onOrientation);
  else window.removeEventListener('deviceorientation', onOrientation);
  if (state && !free) settle(); else render();
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
    if (R.playable(m)) { maze = m; buildSpots(); }
    const wantRules = params.get('mode') === 'guided';
    if (wantRules && maze) { setFree(false); restart(); return; } // a fresh level with rules starts at the card's own start
    setFree(true);
    if (wantRules) message('Rules are not available for this card yet.');
  });
render();
