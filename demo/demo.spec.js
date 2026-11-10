// Demo clips, one video per test (make demo writes them to demo/clips/<project>/<test title>.mp4).
// Captions, a pointer dot and a "phone in hand" view are drawn by the overlay below; the game itself is untouched.
const { test, expect } = require('@playwright/test');
const R = require('../scripts/rules.js');
const { solve } = require('../tools/solve.js');
const { pose } = require('../tools/motion-test.js');

// Lives on <html>, outside <body>, so it stays put when the phone view turns the body.
function overlay() {
  addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const style = document.createElement('style');
    style.textContent = `
      html { background: #1b1b1b; }
      body { transform-origin: 50% 50%; min-height: 100vh; }
      body.demo-phone { outline: 10px solid #111; border-radius: 28px; overflow: hidden; }
      #demo-caption { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 2147483646;
        max-width: calc(100% - 24px); width: max-content; padding: 10px 16px; border-radius: 12px; background: rgba(0,0,0,.82);
        color: #fff; font: 700 18px/1.3 system-ui, sans-serif; text-align: center; transition: opacity .25s; pointer-events: none; }
      #demo-caption:empty { opacity: 0; }
      #demo-pointer { position: fixed; z-index: 2147483647; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
        background: rgba(255,255,255,.55); border: 2px solid rgba(0,0,0,.7); pointer-events: none; opacity: 0;
        transition: transform .12s, opacity .2s; }
      #demo-pointer.down { transform: scale(.7); background: rgba(255,214,0,.85); }
      @media (max-width: 600px) { #demo-caption { font-size: 15px; bottom: 10px; } }`;
    const caption = Object.assign(document.createElement('div'), { id: 'demo-caption' });
    const dot = Object.assign(document.createElement('div'), { id: 'demo-pointer' });
    root.append(style, caption, dot);
    const move = e => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; dot.style.opacity = 1; };
    addEventListener('pointermove', move, true);
    addEventListener('pointerdown', e => { move(e); dot.classList.add('down'); }, true);
    addEventListener('pointerup', e => {
      dot.classList.remove('down');
      if (e.pointerType === 'touch') setTimeout(() => { dot.style.opacity = 0; }, 300); // a finger leaves no cursor behind
    }, true);
  });
}

test.beforeEach(async ({ page }) => { await page.addInitScript(overlay); });

test.afterEach(async ({ page }, info) => {
  if (info.status === 'skipped') return;
  const video = page.video();
  await page.close();
  await video.saveAs(`demo/clips/${info.project.name}/${info.title}.webm`);
});

// The actions a viewer can follow: the pointer glides to a target and taps it, with a pause after each beat.
function director(page, isMobile) {
  const d = {
    beat: (ms = 900) => page.waitForTimeout(ms),
    say: text => page.evaluate(t => { document.querySelector('#demo-caption').textContent = t; }, text),
    settled: () => expect(page.locator('body')).not.toHaveClass(/\bbusy\b/),
    async open(url) {
      await page.goto(url);
      if (url.includes('play.html')) await expect(page.locator('.front.card img')).toHaveJSProperty('complete', true);
      await d.beat(600);
    },
    // Taps by coordinates: the spots pulse, and Playwright's own click waits for elements to hold still.
    async press(locator) {
      const b = await locator.boundingBox();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      if (isMobile) await page.touchscreen.tap(x, y);
      else {
        await page.mouse.move(x, y, { steps: 20 });
        await d.beat(200);
        await page.mouse.click(x, y);
      }
      await d.settled();
      await d.beat();
    },
    async swipe(edge) {
      const box = await page.locator('#card').boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      const [dx, dy] = { left: [-150, 0], right: [150, 0], top: [0, -150], bottom: [0, 150] }[edge];
      await page.mouse.move(x - dx / 3, y - dy / 3, { steps: 10 });
      await page.mouse.down();
      await page.mouse.move(x + dx, y + dy, { steps: 20 });
      await page.mouse.up();
      await d.settled();
      await d.beat();
    },
    spot: (side, id) => page.locator(`.${side}.card .spot[data-id="${id}"]`),
    arrow: dir => page.locator(dir === 'cw' ? '#rotate-clockwise' : '#rotate-counterclockwise'),
  };
  return d;
}

// Plays the solver's shortest route, captioning each kind of move. limit stops after that many solver moves.
async function playRoute(d, card, { start, limit = Infinity } = {}) {
  const maze = require(`../cards/${card}/maze.json`);
  let s = start ? R.starts(maze).find(x => x.at === start) : R.start(maze);
  const moves = solve(maze, s).slice(0, limit);
  let pending = null;
  for (const move of moves) {
    const [kind, arg] = move.split(' ');
    if (kind === 'walk') {
      s = R.walk(maze, s, arg.split('.')[1]).state;
      pending = s.at;
    } else if (kind === 'spin') {
      if (pending) {
        await d.say('Walk to a glowing spin. Spins are the only places you may turn the card.');
        await d.press(d.spot(s.side, pending));
      }
      await d.say('Turn the card with the arrows. A door is open only while its arrow points up.');
      await d.press(d.arrow(arg));
      s = R.spin(maze, s, arg).state;
      pending = null;
    } else if (kind === 'flip') {
      await d.say('Tap a glowing triangle to flip the card over that edge.');
      await d.press(d.spot(s.side, pending ?? s.at));
      s = R.flip(maze, s).state;
      pending = null;
    } else if (kind === 'teleport') {
      await d.say('Step into a portal…');
      await d.press(d.spot(s.side, pending ?? s.at));
      await d.say('…then pick the portal to come out of.');
      await d.press(d.spot(s.side, arg.split('.')[1]));
      s = R.teleport(maze, s, arg.split('.')[1]).state;
      pending = null;
    }
  }
  return { s };
}

async function pickLevel(d, page, card) {
  await d.open('/');
  await d.say('Pick a level. Guided mode enforces the rules.');
  await d.press(page.locator('#mode label', { hasText: 'Guided' }));
  await d.beat(1200);
  const link = page.locator(`main a[href*="card=${card}&"], main a[href$="card=${card}"]`).first();
  await link.evaluate(a => a.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await d.beat(1500);
  await d.press(link);
  await expect(page.locator('.front.card img')).toHaveJSProperty('complete', true);
}

test('tutorial', async ({ page, isMobile }) => {
  test.setTimeout(240_000);
  const d = director(page, isMobile);
  await pickLevel(d, page, 'MAZERULES');
  await d.say('Find the exit. Glowing spots are the moves in reach.');
  await d.beat(2500);
  const { s } = await playRoute(d, 'MAZERULES');
  await d.say('The exit is open. Tap it to leave.');
  await d.press(d.spot(s.side, s.at));
  await expect(page.locator('body')).toHaveClass(/\bwon\b/);
  await d.say('');
  await d.beat(4500);
});

test('01-level-picker', async ({ page, isMobile }) => {
  const d = director(page, isMobile);
  await pickLevel(d, page, 'MAZERULES');
  await d.say('The level opens with the rules on.');
  await d.beat(2500);
});

test('02-free-play', async ({ page, isMobile }) => {
  const d = director(page, isMobile);
  await d.open('/play.html?card=MAZERULES');
  await d.say('Free play: swipe to flip the card over any edge.');
  await d.swipe('right');
  await d.swipe('bottom');
  await d.say('The arrows turn it at any time. Nothing is checked.');
  await d.press(d.arrow('cw'));
  await d.press(d.arrow('cw'));
  await d.press(d.arrow('ccw'));
  await d.beat(1200);
});

test('03-rules-spin-and-flip', async ({ page, isMobile }) => {
  const d = director(page, isMobile);
  await d.open('/play.html?mode=guided&card=MAZERULES');
  await d.say('With rules on, only the moves in reach light up.');
  await d.beat(2500);
  await d.say('With one spin in reach, the arrows walk you onto it and turn the card.');
  await d.press(d.arrow('cw'));
  await d.beat(800);
  await d.say('Tap a glowing triangle to flip the card over that edge.');
  await d.press(d.spot('front', 'flipBottom'));
  await d.say('');
  await d.beat(1500);
});

test('04-swipe-to-flip', async ({ page, isMobile }) => {
  const d = director(page, isMobile);
  await d.open('/play.html?mode=guided&card=3394568');
  await d.say('Swipe to use the flip in reach. Like scrolling: swipe down to go out the top.');
  await d.beat(2000);
  await d.swipe('bottom');
  await d.beat(1200);
  await d.open('/play.html?mode=guided&card=472933');
  await d.say('If no flip, or more than one, is in reach on that edge, a toast says so.');
  await d.beat(1500);
  await d.swipe('right');
  await d.beat(2000);
  await d.swipe('top');
  await d.beat(2500);
});

test('05-switch-modes', async ({ page, isMobile }) => {
  const d = director(page, isMobile);
  await d.open('/play.html?card=MAZERULES');
  await d.say('Play freely for a while…');
  await d.swipe('right');
  await d.press(d.arrow('cw'));
  await d.say('…then turn the rules on. The card restarts from its start.');
  await d.press(page.locator('#hud-mode'));
  await d.beat(1500);
  await d.say('Now the rules decide what is in reach.');
  await d.beat(2500);
  await d.say('Switch back to free play at any time.');
  await d.press(page.locator('#hud-mode'));
  await d.beat(1500);
});

test('06-pick-a-start', async ({ page, isMobile }) => {
  const d = director(page, isMobile);
  await d.open('/play.html?mode=guided&card=2CMP2');
  await d.say('Some cards have several starts. Pick one first.');
  await d.beat(2000);
  await d.press(d.spot('front', 'start2'));
  await playRoute(d, '2CMP2', { start: 'start2', limit: 3 });
  await d.say('');
  await d.beat(1200);
});

test('07-portals', async ({ page, isMobile }) => {
  const d = director(page, isMobile);
  await d.open('/play.html?mode=guided&card=MAZE2404984');
  await d.say('Portals connect distant parts of the card.');
  await d.beat(2000);
  await playRoute(d, 'MAZE2404984', { limit: 4 });
  await d.say('');
  await d.beat(1200);
});

test('08-motion-control', async ({ page, context, isMobile }) => {
  test.skip(!isMobile, 'motion control is phone only');
  await context.grantPermissions(['accelerometer', 'gyroscope', 'magnetometer']);
  const d = director(page, isMobile);
  let angle = 0;
  // Sends the phone's sensor readings and draws the page the way someone watching the phone would see it turn.
  const send = t => page.evaluate(([p, t]) => {
      window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', p));
      const r = t * Math.PI / 180, w = innerWidth, h = innerHeight - 70;
      const s = Math.min(1, 0.92 * Math.min(w / (w * Math.abs(Math.cos(r)) + h * Math.abs(Math.sin(r))),
        h / (w * Math.abs(Math.sin(r)) + h * Math.abs(Math.cos(r)))));
      document.body.classList.toggle('demo-phone', t !== 0);
      document.body.style.transform = t ? `translateY(-30px) scale(${s}) rotate(${t}deg)` : '';
  }, [pose(t), t]);
  const turnPhoneTo = async target => {
    while (angle !== target) {
      angle += Math.sign(target - angle) * 5;
      await send(angle);
      await page.waitForTimeout(40);
    }
    await d.settled();
    await d.beat(1200);
  };
  const motionOn = async () => {
    angle = 0;
    await d.press(page.locator('#hud-motion'));
    await send(0); // the game turns Motion off again if no reading arrives within 1.5s
    await d.beat(1200);
  };

  await d.open('/play.html?mode=guided&card=MAZERULES');
  await d.say('Turn on Motion to turn the card by turning the phone.');
  await d.beat(1200);
  await motionOn();
  await d.say('Turn the phone: the player walks to the spin in reach and the card turns with the phone.');
  await d.beat(1200);
  await turnPhoneTo(90);
  await d.say('The N badge keeps pointing up in the world: doors open when their arrow points that way.');
  await d.beat(2500);
  await d.say('Flips work with the phone turned.');
  await d.press(d.spot('front', 'flipBottom'));
  await d.beat(1200);

  await d.open('/play.html?mode=guided&card=MAZE2');
  await motionOn();
  await d.say('Off a spin, the game waits until the phone is turned back.');
  await d.beat(1200);
  await turnPhoneTo(90);
  await d.beat(2000);
  await turnPhoneTo(0);
  await d.beat(1500);
});
