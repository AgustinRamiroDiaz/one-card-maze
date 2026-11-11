// play.html's controller: turns input (spot taps, arrow buttons, swipes, the phone's turn) into game.js calls and hands
// the results to view.js. The game, in two modes that can be switched at any time without reloading.
// Free play: swipe the card to flip it over the edge you swipe toward; the arrows always turn it. Nothing is checked.
// Rules (?mode=guided): the reachable spin and flip spots light up; click one to use it. A spin only puts the player on it; the arrow buttons (or turning the phone, with Motion on) then turn the card, and when only one spin is in reach they walk the player onto it and turn. Swiping uses the one reachable flip on the edge opposite the swipe (swipe up to go out the bottom); a toast says when there is none, or more than one. Portals take two clicks: in, then out. Turning rules on restarts the card; cards with several starts let the player pick one first. Items are picked up once reachable; the exit lights up once reachable and unlocked, and tapping it wins.
// Layers: rules.js (moves) <- game.js (session, events) <- this file -> view.js (drawing) -> card-view.js (card maths).
const R = MazeRules, G = MazeGame, V = MazeView;
const params = new URLSearchParams(location.search);
const cardName = params.get('card') || 'MAZERULES';

V.init(cardName);
window.addEventListener('resize', () => { V.fitCard(); render(); });

// state (game.js) exists only once rules are on; free play has only the card as drawn, which view.js keeps.
let maze, state, busy = false, free = true;
// Motion: phoneQ is how many quarters the phone is turned clockwise. The card on screen does not follow the phone,
// so the card's turn in the world is its turn on screen plus the phone's: state.rot = V.shown().rot + 90 * phoneQ.
// Turning the phone off a spin breaks that; the game then waits (`astray`) until the phone is turned back.
let motionOn = false, phoneQ = 0, astray = false;

const view = () => free ? {} : {
  up: state.side,
  spots: astray ? new Map() : G.spotStates(maze, state),
  canTurn: !astray && !!G.turnSpin(maze, state),
};
const render = () => V.render(view());

// Input is ignored while the card animates.
async function animate() {
  busy = true;
  await V.animate(view());
  busy = false;
}

// Plays a game.js result: card moves animate first, then the events after them show.
async function apply(res) {
  state = res.state;
  let moved = false;
  for (const ev of res.events) {
    if (ev.type === 'spun') { V.turnCard(ev.dir); moved = true; await animate(); }
    else if (ev.type === 'flipped') {
      // ev.edge is the edge as the player sees it in the world; on a turned phone that is a different screen edge.
      // The card rolls away from the flip's edge (+2, the opposite edge), the way the swipe that picks it moves
      // (swipe up to go out the bottom); the opposite edge turns the same axis, so the card ends up the same.
      V.flipCard(R.EDGES_CW[R.mod(R.EDGES_CW.indexOf(ev.edge) + 2 - phoneQ, 4)]);
      console.assert(JSON.stringify(V.shown()) === JSON.stringify({ side: state.side, rot: R.mod(state.rot - 90 * phoneQ, 360) }), 'card view out of sync with rules');
      moved = true;
      await animate();
    }
    else V.show(ev);
  }
  render();
  if (moved) syncPhone(); // the phone may have turned during the animation
}

function onSpot(side, id) {
  if (busy || astray || free) return;
  apply(G.tap(maze, state, side, id));
}

function onArrow(dir) {
  if (busy) return;
  if (free) { V.turnCard(dir); animate().then(render); return; }
  if (!astray) apply(G.turn(maze, state, dir));
}

// Rules: a swipe travels the other way, like scrolling (swipe up to go out the bottom); on a turned phone, screen
// edges are not world edges, hence + phoneQ.
function onSwipe(swipedToward) {
  if (free) { V.flipCard(swipedToward); animate().then(render); return; }
  if (busy || astray) return;
  apply(G.swipe(maze, state, R.EDGES_CW[R.mod(R.EDGES_CW.indexOf(swipedToward) + 2 + phoneQ, 4)]));
}

// A drag of 50px or more flips the card over the screen edge it moves toward, once per drag.
let dragFrom = null;
const cardEl = V.cardEl;
cardEl.addEventListener('pointerdown', e => { dragFrom = busy ? null : { x: e.clientX, y: e.clientY }; });
cardEl.addEventListener('pointermove', e => {
  if (!dragFrom) return;
  const dx = e.clientX - dragFrom.x, dy = e.clientY - dragFrom.y, d = Math.max(Math.abs(dx), Math.abs(dy));
  // Capture only once it is a drag: capturing on pointerdown would steal the click from a tapped spot.
  if (d > 10 && !cardEl.hasPointerCapture(e.pointerId)) cardEl.setPointerCapture(e.pointerId);
  if (d < 50) return;
  dragFrom = null;
  onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'bottom' : 'top'));
});
for (const type of ['pointerup', 'pointercancel']) cardEl.addEventListener(type, () => { dragFrom = null; });

function restart() {
  const res = G.restart(maze);
  V.resetCard(res.state.side);
  V.clearWon();
  astray = false;
  apply(res);
  syncPhone();
}

// Turns rules on (restarting the card) or off (keeping the card where it is).
function setFree(on) {
  if (busy) return;
  if (on && motionOn) setMotion(false); // motion only turns the card on a spin, so it belongs to rules
  free = on;
  V.setMode({ free: on, hasMaze: !!maze, draft: maze?.status !== 'reviewed', motionSupported });
  const url = new URL(location.href);
  if (on) url.searchParams.delete('mode'); else url.searchParams.set('mode', 'guided');
  history.replaceState(null, '', url);
  if (on) { V.message(''); render(); } else restart();
}

V.buttons.cw.addEventListener('click', () => onArrow('cw'));
V.buttons.ccw.addEventListener('click', () => onArrow('ccw'));
V.buttons.restart.addEventListener('click', () => !busy && restart());
V.buttons.mode.addEventListener('click', () => setFree(!free));

// Motion controls (opt-in): standing on a spin, turning the upright phone a quarter turns the card with it.
const tracker = MazeMotion.quarterTracker();
let sawMotion = false;
const motionSupported = 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches;

function onOrientation(e) {
  if (e.beta != null) sawMotion = true;
  // shortcut: if the browser auto-rotated the page, the phone's turn no longer matches the screen; we just ask for
  // the rotation lock instead of compensating for screen.orientation.angle.
  if (screen.orientation && screen.orientation.angle !== 0) { V.say('rotation-lock'); return; }
  const turn = MazeMotion.screenTurn(e);
  if (turn != null) V.pointNorth(turn);
  const q = tracker.update(e);
  if (q !== phoneQ) { phoneQ = q; syncPhone(); }
}

// Brings the game in line with the phone: on a spin the card turns with it. Off a spin, if exactly one spin is
// reachable the player is walked onto it first; otherwise (none, or a choice to make) the game waits.
function syncPhone() {
  if (!motionOn || !state || state.won || busy) return;
  const diff = R.mod(phoneQ - R.mod(state.rot - V.shown().rot, 360) / 90, 4);
  if (diff === 0) {
    if (astray) { astray = false; apply(G.settle(maze, state)); }
    return;
  }
  if (G.turnSpin(maze, state)) {
    const dir = diff === 3 ? 'ccw' : 'cw';
    let res = { state, events: [] };
    for (let i = 0; i < (diff === 3 ? 1 : diff); i++) res = G.turn(maze, res.state, dir);
    astray = false;
    // The phone turned, not the picture, so the card does not animate; only the outcome shows.
    apply({ state: res.state, events: res.events.filter(ev => ev.type !== 'spun') });
    if (!state.won) V.say('turn-phone');
    return;
  }
  astray = true;
  V.say('astray');
  render();
}

function setMotion(on) {
  if (!on && phoneQ) V.turnBy(phoneQ); // hand the phone's turn back to the picture
  motionOn = on;
  phoneQ = 0;
  astray = false;
  V.setMotion(on);
  if (on) window.addEventListener('deviceorientation', onOrientation);
  else window.removeEventListener('deviceorientation', onOrientation);
  if (state && !free) apply(G.settle(maze, state)); else render();
}

V.buttons.motion.addEventListener('click', async () => {
  if (motionOn) { setMotion(false); return; }
  // iOS (and recent Chrome) only hand out sensor data after a permission request made straight from a tap.
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const answer = await DeviceOrientationEvent.requestPermission().catch(() => 'denied');
    if (answer !== 'granted') { V.say('motion-denied'); return; }
  }
  sawMotion = false;
  setMotion(true);
  screen.orientation?.lock?.('portrait').catch(() => {}); // only works fullscreen or installed; elsewhere the phone's rotation lock is needed
  V.say('motion-on');
  setTimeout(() => {
    if (motionOn && !sawMotion) { setMotion(false); V.say('no-sensor'); }
  }, 1500);
});

fetch(`cards/${encodeURIComponent(cardName)}/maze.json`, { cache: 'no-store' })
  .then(r => (r.ok ? r.json() : null))
  .catch(() => null)
  .then(m => {
    if (R.playable(m)) { maze = m; V.buildSpots({ front: R.nodes(m, 'front'), back: R.nodes(m, 'back') }, onSpot); }
    const wantRules = params.get('mode') === 'guided';
    if (wantRules && maze) { setFree(false); return; }
    setFree(true);
    if (wantRules) V.say('no-rules');
  });
render();
