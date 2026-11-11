// Everything the player sees on play.html: the card and how it is turned, the spots and the player's bean, the HUD,
// motion lines, the speech balloon and the win burst. It shows game.js events and the state it is handed; it decides
// nothing about the game and reads no input (taps on spots go to the handler passed to buildSpots). Depends on
// card-view.js only. Glyphs come from the SVG sprite in play.html.
const MazeView = (function () {
  const C = CardView;
  const FLIP_MS = 1000; // matches --turn-ms in play.css
  const mod = (a, n) => ((a % n) + n) % n;
  const glyph = id => `<svg class="g" viewBox="0 0 48 48" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  // Words stay out of sight: every one goes to the screen-reader status line, and only the ones a picture cannot say
  // (phone settings, the unreviewed map) are also shown in the speech balloon.
  const TEXT = {
    'choose-start': 'Pick where to start.',
    'find-exit': 'Find the exit.',
    'exit-locked': 'The exit is locked.',
    'exit-open': 'The exit is open. Tap it to leave.',
    'portal-entered': 'Pick the portal to come out of.',
    'turn-arrows': 'Turn the card with the arrows.',
    'turn-phone': 'Turn the phone to turn the card.',
    'won': 'You found the exit!',
    'many-flips': 'More than one flip on that edge is in reach. Tap the one to use.',
    'no-flip': 'No flip in reach on that edge.',
    'blocked': 'That way is shut.',
    'no-rules': 'Rules are not available for this card yet.',
    'astray': 'You can only turn the card on a spin. Turn the phone back.',
    'rotation-lock': "Turn on your phone's rotation lock.",
    'motion-denied': 'Motion access was not allowed.',
    'motion-on': 'Hold the phone upright and turn it while on a spin.',
    'no-sensor': 'No motion sensor found (it needs a phone and HTTPS).',
    'draft': 'Unreviewed map: the rules may be wrong.',
  };
  const SPOKEN = new Set(['no-rules', 'astray', 'rotation-lock', 'motion-denied', 'motion-on', 'no-sensor', 'draft']);

  const panel = document.querySelector('#panel');
  const wrapper = document.querySelector('#card-wrapper');
  const cardEl = document.querySelector('#card');
  const faces = { front: document.querySelector('.front.card'), back: document.querySelector('.back.card') };
  let css = { R: 0, X: 0, Y: 0 };
  let motion = false;

  const bean = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  bean.setAttribute('class', 'me g');
  bean.setAttribute('viewBox', '0 0 48 52');
  bean.setAttribute('aria-hidden', 'true');
  bean.innerHTML = '<use href="#i-me"/>';
  let upright = 0; // the bean's counter-turn, accumulated so it always takes the short way round

  function init(cardName) {
    document.body.classList.add('guided');
    for (const side of ['front', 'back']) {
      faces[side].innerHTML = `<img src="cards/${encodeURIComponent(cardName)}/${side}.png" alt="" draggable="false"><div class="layer"></div><span class="credit">onecardmaze.com</span>`;
    }
  }

  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <a href="./" id="hud-back" class="dot" aria-label="All cards">${glyph('back')}</a>
    <span id="items" hidden>${glyph('tick')}<b></b></span>
    <span id="hud-message" class="sr-only" role="status" aria-live="polite"></span>
    <button type="button" id="hud-motion" class="dot" aria-label="Motion" aria-pressed="false" hidden>${glyph('motion')}</button>
    <button type="button" id="hud-restart" class="dot" aria-label="Restart" hidden>${glyph('restart')}</button>
    <button type="button" id="hud-mode" class="dot" aria-label="Rules" aria-pressed="false" hidden>${glyph('rules')}</button>`;
  document.querySelector('#app-wrapper').prepend(hud);
  const itemsEl = hud.querySelector('#items');

  // Rules run on a hand-drawn map of the card; until someone has checked it against the picture it may be wrong.
  const draftTag = document.createElement('button');
  draftTag.type = 'button';
  draftTag.id = 'draft-banner';
  draftTag.innerHTML = `${glyph('q')}<span class="sr-only">${TEXT.draft}</span>`;
  draftTag.addEventListener('click', () => toast('draft'));
  panel.append(draftTag);

  // Exit found: a starburst with the bean cheering, then again / next card / all cards.
  function burstPath(cx, cy, r1, r2, n, seed) {
    let d = '', s = seed;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? r2 * (0.9 + rnd() * 0.15) : r1 * (0.88 + rnd() * 0.2);
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
    }
    return d + 'Z';
  }
  const star = (x, y, s) => `<path class="star" transform="translate(${x} ${y}) scale(${s})" d="M0-13l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z"/>`;
  const win = document.createElement('div');
  win.id = 'win';
  win.innerHTML = `
    <svg class="burst" viewBox="-20 -20 440 440" aria-hidden="true">
      <path class="edge" d="${burstPath(200, 200, 200, 128, 16, 3)}"/>
      <path class="echo" d="${burstPath(200, 200, 160, 118, 16, 9)}"/>
      ${star(40, 40, 1.3)}${star(360, 50, 1)}${star(370, 360, 1.2)}
      <path class="cheer" d="M160 112l-12-24M240 112l12-24M200 102V76"/>
      <svg x="140" y="120" width="120" height="130" viewBox="0 0 48 52" class="g"><use href="#i-me"/></svg>
    </svg>
    <div class="choices">
      <button type="button" class="dot again" aria-label="Play again">${glyph('restart')}</button>
      <a class="dot next" aria-label="Next card">${glyph('next')}</a>
      <a href="./" class="dot" aria-label="All cards">${glyph('grid')}</a>
    </div>`;
  panel.append(win);
  const nextLink = win.querySelector('.next');

  // With Motion on, points to world up (where a door's arrow must point to open) as the phone turns.
  const north = document.createElement('div');
  north.id = 'north';
  north.hidden = true;
  north.setAttribute('aria-hidden', 'true');
  north.innerHTML = '<svg viewBox="0 0 24 24"><text x="12" y="7" text-anchor="middle">N</text><path d="M12 8 18 22 12 19 6 22Z"/></svg>';
  document.body.append(north);

  const buttons = {
    motion: hud.querySelector('#hud-motion'), restart: hud.querySelector('#hud-restart'), mode: hud.querySelector('#hud-mode'),
    cw: document.querySelector('#rotate-clockwise'), ccw: document.querySelector('#rotate-counterclockwise'),
    again: win.querySelector('.again'),
  };

  const toastEl = document.createElement('div');
  toastEl.id = 'toast';
  toastEl.setAttribute('aria-hidden', 'true'); // the status line already says it
  document.body.append(toastEl);
  let toastTimer;

  const message = text => { document.querySelector('#hud-message').textContent = text; };
  function say(key) {
    message(TEXT[key]);
    if (SPOKEN.has(key)) toast(key);
  }

  function toast(key) {
    toastEl.textContent = TEXT[key];
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  function shake() {
    cardEl.classList.remove('shake');
    void cardEl.offsetWidth; // restart the animation on repeated misses
    cardEl.classList.add('shake');
  }
  cardEl.addEventListener('animationend', () => cardEl.classList.remove('shake'));

  // Shows one game.js event that does not move the card (spun and flipped are drawn by turnCard and flipCard).
  function show(ev) {
    if (ev.type === 'settled') {
      itemsEl.hidden = !ev.items;
      if (ev.items) {
        itemsEl.querySelector('b').textContent = `${ev.items.got}/${ev.items.total}`;
        itemsEl.classList.toggle('all', ev.items.got === ev.items.total);
        itemsEl.setAttribute('aria-label', `Items ${ev.items.got} of ${ev.items.total}`);
      }
      const items = ev.items ? `Items ${ev.items.got}/${ev.items.total}` : '';
      if (ev.exit === 'none') message(items || TEXT['find-exit']);
      else if (ev.exit === 'locked') message(`${TEXT['exit-locked']} ${items}`);
      else say('exit-open');
    }
    else if (ev.type === 'on-spin') say(motion ? 'turn-phone' : 'turn-arrows');
    else if (ev.type === 'won') { say('won'); document.body.classList.add('won'); buttons.again.focus({ preventScroll: true }); }
    else if (ev.type === 'many-flips' || ev.type === 'no-flip' || ev.type === 'blocked') { shake(); say(ev.type); }
    else if (TEXT[ev.type]) say(ev.type);
  }

  // One button per map node on both faces ({ front: [nodes], back: [nodes] }); a click calls onTap(side, id).
  const coords = { front: new Map(), back: new Map() };
  function buildSpots(nodesBySide, onTap) {
    for (const side of ['front', 'back']) {
      const layer = faces[side].querySelector('.layer');
      layer.querySelectorAll('.spot').forEach(s => s.remove());
      coords[side].clear();
      for (const n of nodesBySide[side]) {
        coords[side].set(n.id, n);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `spot spot-${n.type}`;
        b.dataset.id = n.id;
        b.style.left = n.x * 100 + '%';
        b.style.top = n.y * 100 + '%';
        b.setAttribute('aria-label', n.type === 'door' ? 'door' : n.label || n.type);
        b.addEventListener('click', () => onTap(side, n.id));
        layer.append(b);
      }
    }
  }

  // up: the side whose spots are live; spots: Map id -> 'usable'|'here'|'locked'|'used' for that side;
  // at: where the player stands on that side (no bean without it); canTurn: spin balloons shown.
  function render({ up = C.cssView(css).side, spots = new Map(), at = null, canTurn = true } = {}) {
    // A sideways card is as wide as the card is tall; on narrow panels shrink it until it fits.
    const sideways = mod(css.R, 180) !== 0;
    const scale = sideways ? Math.min(1, (panel.clientWidth - 32) / cardEl.offsetHeight) : 1;
    cardEl.style.transform = `scale(${scale}) rotate(${css.R}deg) rotateX(${css.X}deg) rotateY(${css.Y}deg)`;
    for (const side of ['front', 'back']) {
      faces[side].querySelector('.layer').classList.toggle('active', side === up);
      for (const b of faces[side].querySelectorAll('.spot')) {
        const s = side === up ? spots.get(b.dataset.id) : undefined;
        const usable = s === 'usable' || s === 'here';
        b.classList.toggle('can', usable);
        b.classList.toggle('here', s === 'here');
        b.classList.toggle('locked', s === 'locked');
        b.classList.toggle('used', s === 'used');
        b.disabled = !usable;
      }
    }
    const spot = at && coords[up].get(at);
    if (spot) {
      if (bean.parentNode !== faces[up].querySelector('.layer')) faces[up].querySelector('.layer').append(bean);
      bean.style.left = spot.x * 100 + '%';
      bean.style.top = spot.y * 100 + '%';
      upright += mod(-C.cssView(css).rot - upright + 180, 360) - 180;
      bean.style.setProperty('--upright', `${upright}deg`);
    } else bean.remove();
    for (const b of [buttons.cw, buttons.ccw]) b.classList.toggle('disabled', !canTurn);
  }

  // Card moves: change the drawn card; animate() then plays the transition with its motion lines.
  let move = null;
  const turnCard = dir => { css = { ...css, R: css.R + (dir === 'ccw' ? -90 : 90) }; move = dir; };
  const flipCard = edgeOnScreen => {
    css = C.cssFlip(css, edgeOnScreen);
    move = edgeOnScreen === 'left' || edgeOnScreen === 'right' ? 'flip-x' : 'flip-y';
  };
  const turnBy = quarters => { css = { ...css, R: css.R + 90 * quarters }; };
  const resetCard = side => { css = { R: 0, X: 0, Y: side === 'back' ? 180 : 0 }; };
  const shown = () => C.cssView(css); // { side, rot } as drawn

  // body.busy while the card animates (the e2e tests wait on it).
  async function animate(state) {
    document.body.classList.add('busy');
    if (move) wrapper.dataset.move = move;
    move = null;
    render(state);
    await new Promise(r => setTimeout(r, FLIP_MS));
    delete wrapper.dataset.move;
    document.body.classList.remove('busy');
  }

  function setMode({ free, hasMaze, draft, motionSupported }) {
    document.body.classList.toggle('free', free);
    document.body.classList.toggle('draft', !free && draft); // shows the "?" tag
    document.body.classList.remove('won');
    buttons.mode.setAttribute('aria-pressed', !free);
    buttons.mode.hidden = !hasMaze;
    buttons.restart.hidden = free;
    buttons.motion.hidden = free || !motionSupported;
    if (free) itemsEl.hidden = true;
  }

  function setMotion(on) {
    motion = on;
    buttons.motion.setAttribute('aria-pressed', on);
    north.hidden = !on;
    north.style.transform = '';
  }

  const pointNorth = turn => { north.style.transform = `rotate(${-turn}deg)`; };
  const clearWon = () => document.body.classList.remove('won');
  const setNext = href => { nextLink.hidden = !href; if (href) nextLink.href = href; };

  return { cardEl, buttons, say, message, show, toast, buildSpots, render, turnCard, flipCard, turnBy, init,
    resetCard, shown, animate, setMode, setMotion, pointNorth, clearWon, setNext };
})();
