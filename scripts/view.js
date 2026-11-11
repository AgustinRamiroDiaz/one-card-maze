// Everything the player sees on play.html: the card and how it is turned, the spots, the HUD, messages, toast and
// confetti. It shows game.js events and the state it is handed; it decides nothing about the game and reads no input
// (taps on spots go to the handler passed to buildSpots). Depends on card-view.js only.
const MazeView = (function () {
  const C = CardView;
  const FLIP_MS = 1000; // matches the 1s transform transition in index.css
  const mod = (a, n) => ((a % n) + n) % n;

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
    'no-rules': 'Rules are not available for this card yet.',
    'astray': 'You can only turn the card on a spin. Turn the phone back.',
    'rotation-lock': "Turn on your phone's rotation lock.",
    'motion-denied': 'Motion access was not allowed.',
    'motion-on': 'Motion on: hold the phone upright and turn it while on a spin.',
    'no-sensor': 'No motion sensor found (it needs a phone and HTTPS).',
    'draft': '⚠ Unreviewed map: the rules may be wrong',
  };

  const cardEl = document.querySelector('#card');
  const faces = { front: document.querySelector('.front.card'), back: document.querySelector('.back.card') };
  let css = { R: 0, X: 0, Y: 0 };
  let motion = false;

  function init(cardName) {
    document.body.classList.add('guided');
    for (const side of ['front', 'back']) {
      faces[side].innerHTML = `<img src="cards/${encodeURIComponent(cardName)}/${side}.png" alt="" draggable="false"><div class="layer"></div>`;
    }
    fitCard();
  }

  function fitCard() { cardEl.style.height = cardEl.offsetWidth * 1.4 + 'px'; }

  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <a href="./" class="hud-button">← Levels</a>
    <span id="hud-message" role="status" aria-live="polite"></span>
    <button type="button" id="hud-motion" class="hud-button" aria-pressed="false" hidden>Motion</button>
    <button type="button" id="hud-restart" class="hud-button">Restart</button>
    <button type="button" id="hud-mode" class="hud-button" hidden></button>`;
  document.querySelector('#app-wrapper').append(hud);
  const buttons = {
    motion: hud.querySelector('#hud-motion'), restart: hud.querySelector('#hud-restart'), mode: hud.querySelector('#hud-mode'),
    cw: document.querySelector('#rotate-clockwise'), ccw: document.querySelector('#rotate-counterclockwise'),
  };

  // Rules run on a hand-drawn map of the card; until someone has checked it against the picture it may be wrong.
  const draftBanner = document.createElement('div');
  draftBanner.id = 'draft-banner';
  draftBanner.setAttribute('role', 'note');
  draftBanner.textContent = TEXT.draft;
  document.querySelector('#app-wrapper').prepend(draftBanner);

  // With Motion on, points to world up (where a door's arrow must point to open) as the phone turns.
  const north = document.createElement('div');
  north.id = 'north';
  north.hidden = true;
  north.setAttribute('aria-hidden', 'true');
  north.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2 19 20 12 16 5 20Z"/></svg><b>N</b>';
  document.body.append(north);

  const toastEl = document.createElement('div');
  toastEl.id = 'toast';
  toastEl.setAttribute('role', 'status');
  document.body.append(toastEl);
  let toastTimer;

  const message = text => { document.querySelector('#hud-message').textContent = text; };
  const say = key => message(TEXT[key]);

  function toast(key) {
    toastEl.textContent = TEXT[key];
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  // Shows one game.js event that does not move the card (spun and flipped are drawn by turnCard and flipCard).
  function show(ev) {
    if (ev.type === 'settled') {
      const items = ev.items ? `Items ${ev.items.got}/${ev.items.total}` : '';
      if (ev.exit === 'none') message(items || TEXT['find-exit']);
      else if (ev.exit === 'locked') message(`${TEXT['exit-locked']} ${items}`);
      else say('exit-open');
    }
    else if (ev.type === 'on-spin') say(motion ? 'turn-phone' : 'turn-arrows');
    else if (ev.type === 'won') { say('won'); document.body.classList.add('won'); confetti(); }
    else if (ev.type === 'many-flips' || ev.type === 'no-flip') toast(ev.type);
    else if (TEXT[ev.type]) say(ev.type);
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

  // One button per map node on both faces ({ front: [nodes], back: [nodes] }); a click calls onTap(side, id).
  function buildSpots(nodesBySide, onTap) {
    for (const side of ['front', 'back']) {
      const layer = faces[side].querySelector('.layer');
      layer.querySelectorAll('.spot').forEach(s => s.remove());
      for (const n of nodesBySide[side]) {
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

  // up: the side whose spots are live; spots: Map id -> 'usable'|'here' for that side; canTurn: arrows enabled.
  function render({ up = C.cssView(css).side, spots = new Map(), canTurn = true } = {}) {
    // A sideways card is as wide as the card is tall; on narrow screens shrink it until it fits.
    const sideways = mod(css.R, 180) !== 0;
    const scale = sideways ? Math.min(1, (window.innerWidth - 32) / cardEl.offsetHeight) : 1;
    cardEl.style.transform = `scale(${scale}) rotate(${css.R}deg) rotateX(${css.X}deg) rotateY(${css.Y}deg)`;
    for (const side of ['front', 'back']) {
      faces[side].querySelector('.layer').classList.toggle('active', side === up);
      for (const b of faces[side].querySelectorAll('.spot')) {
        const s = side === up ? spots.get(b.dataset.id) : undefined;
        b.classList.toggle('can', !!s);
        b.classList.toggle('here', s === 'here');
        b.disabled = !s;
      }
    }
    for (const b of [buttons.cw, buttons.ccw]) b.classList.toggle('disabled', !canTurn);
  }

  // Card moves: change the drawn card; animate() then plays the transition.
  const turnCard = dir => { css = { ...css, R: css.R + (dir === 'ccw' ? -90 : 90) }; };
  const flipCard = edgeOnScreen => { css = C.cssFlip(css, edgeOnScreen); };
  const turnBy = quarters => { css = { ...css, R: css.R + 90 * quarters }; };
  const resetCard = side => { css = { R: 0, X: 0, Y: side === 'back' ? 180 : 0 }; };
  const shown = () => C.cssView(css); // { side, rot } as drawn

  // body.busy while the card animates (the e2e tests wait on it).
  async function animate(state) {
    document.body.classList.add('busy');
    render(state);
    await new Promise(r => setTimeout(r, FLIP_MS));
    document.body.classList.remove('busy');
  }

  function setMode({ free, hasMaze, draft, motionSupported }) {
    document.body.classList.toggle('free', free);
    document.body.classList.toggle('draft', !free && draft); // shows #draft-banner
    document.body.classList.remove('won');
    buttons.mode.textContent = free ? 'Enforce rules' : 'Free play';
    buttons.mode.hidden = !hasMaze;
    buttons.restart.hidden = free;
    buttons.motion.hidden = free || !motionSupported;
  }

  function setMotion(on) {
    motion = on;
    buttons.motion.setAttribute('aria-pressed', on);
    north.hidden = !on;
    north.style.transform = '';
  }

  const pointNorth = turn => { north.style.transform = `rotate(${-turn}deg)`; };
  const clearWon = () => document.body.classList.remove('won');

  return { init, fitCard, cardEl, buttons, say, message, show, toast, buildSpots, render, turnCard, flipCard, turnBy,
    resetCard, shown, animate, setMode, setMotion, pointNorth, clearWon };
})();
