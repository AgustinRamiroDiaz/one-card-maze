const { test, expect } = require('@playwright/test');
const R = require('../scripts/rules.js');
const { solve } = require('../tools/solve.js');

const loadMaze = card => require(`../cards/${card}/maze.json`);
const open = (page, card) => page.goto(`/play.html?mode=guided&card=${card}`);
const spot = (page, side, id) => page.locator(`.${side}.card .spot[data-id="${id}"]`);
const highlighted = page => page.locator('.spot.can').evaluateAll(els =>
  els.map(b => `${b.closest('.card').classList[0]}.${b.dataset.id}`).sort());

// Counts glow-coloured pixels in a screenshot of the area around a spot, so the test fails if the
// browser computes the highlight style but never paints it.
async function glowPixels(page, locator) {
  const box = await locator.boundingBox();
  const pad = 12;
  const png = await page.screenshot({ clip: { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad } });
  return page.evaluate(async b64 => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const ctx = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }).getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 160 && d[i + 2] < 120) n++;
    return n;
  }, png.toString('base64'));
}

test('a card with several starts highlights only the starts until one is picked', async ({ page, browserName }) => {
  // shortcut: Playwright's WebKit on this Linux ignores backface-visibility (the back face paints over the
  // front even in a minimal page), so pixel checks are skipped there; re-enable on macOS or official Linux builds.
  const checkPaint = browserName !== 'webkit';
  await open(page, '2CMP2');
  await expect(page.locator('#hud-message')).toHaveText('Pick where to start.');
  expect(await highlighted(page)).toEqual(['front.start1', 'front.start2', 'front.start3']);
  await expect(page.locator('#rotate-clockwise')).toHaveClass(/disabled/);

  const start1 = spot(page, 'front', 'start1');
  const lit = checkPaint && await glowPixels(page, start1);
  if (checkPaint) expect(lit, 'the highlight is painted').toBeGreaterThan(50);

  await spot(page, 'front', 'start2').click();
  await expect(page.locator('#hud-message')).toHaveText('Find the exit.');
  const after = await highlighted(page);
  expect(after.length).toBeGreaterThan(0);
  expect(after.filter(id => id.includes('.start'))).toEqual([]);
  if (checkPaint) expect(await glowPixels(page, start1), 'the glow goes away once the start is no longer offered').toBeLessThan(lit / 4);
});

// Replays the solver's shortest solution through the UI: every clicked spot must be highlighted.
async function playThrough(page, card, startId) {
  const maze = loadMaze(card);
  let s = startId ? R.starts(maze).find(x => x.at === startId) : R.start(maze);
  const moves = solve(maze, s);
  expect(moves, `${card} is solvable`).toBeTruthy();

  await open(page, card);
  if (startId) await spot(page, s.side, startId).click();

  const click = async (side, id) => {
    const el = spot(page, side, id);
    await expect(el, `${side}.${id} is highlighted`).toHaveClass(/\bcan\b/);
    await el.click();
    await expect(page.locator('body')).not.toHaveClass(/\bbusy\b/);
  };
  const turn = async dir => {
    await page.locator(dir === 'cw' ? '#rotate-clockwise' : '#rotate-counterclockwise').click();
    await expect(page.locator('body')).not.toHaveClass(/\bbusy\b/);
  };

  let pending = null; // spot walked to but not yet used; the UI walks there as part of the click
  for (const move of moves) {
    const [kind, arg] = move.split(' ');
    if (kind === 'walk') {
      s = R.walk(maze, s, arg.split('.')[1]).state;
      pending = s.at;
    } else if (kind === 'spin') {
      if (pending) {
        const before = await page.locator('#card').getAttribute('style');
        await click(s.side, pending);
        expect(await page.locator('#card').getAttribute('style'), 'clicking a spin does not turn the card').toBe(before);
        await expect(spot(page, s.side, pending), 'standing on the spin marks it').toHaveClass(/\bhere\b/);
        await expect(page.locator('#rotate-clockwise'), 'standing on a spin enables the arrows').not.toHaveClass(/disabled/);
      }
      await turn(arg);
      s = R.spin(maze, s, arg).state;
      pending = null;
    } else if (kind === 'flip') {
      await click(s.side, pending ?? s.at);
      s = R.flip(maze, s).state;
      pending = null;
    } else if (kind === 'teleport') {
      await click(s.side, pending ?? s.at);
      await expect(page.locator('#hud-message')).toHaveText('Pick the portal to come out of.');
      const to = arg.split('.')[1];
      await click(s.side, to);
      s = R.teleport(maze, s, to).state;
      pending = null;
    }
  }
  // The solver's last move walks onto the exit; the player has to tap it.
  expect(R.node(maze, s.side, s.at).type).toBe('exit');
  await expect(page.locator('#hud-message')).toHaveText('The exit is open. Tap it to leave.');
  await expect(page.locator('body')).not.toHaveClass(/\bwon\b/);
  // Confetti is skipped under reduced motion, which the suite uses; allow motion for the winning tap. The glow
  // starts pulsing again, so the tap is dispatched instead of waiting for the spot to hold still.
  await expect(spot(page, s.side, s.at)).toHaveClass(/\bcan\b/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await spot(page, s.side, s.at).dispatchEvent('click');
  await expect(page.locator('.confetti i')).toHaveCount(120);
  await expect(page.locator('.confetti'), 'confetti cleans up after landing').toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#hud-message')).toHaveText('You found the exit!');
  await expect(page.locator('body')).toHaveClass(/\bwon\b/);
  expect(await highlighted(page)).toEqual([]);
}

test('MAZERULES can be played to the exit', ({ page }) => playThrough(page, 'MAZERULES'));
test('MAZE2404984 can be played to the exit through portals', ({ page }) => playThrough(page, 'MAZE2404984'));
test('2CMP2 can be played to the exit from a picked start', ({ page }) => playThrough(page, '2CMP2', 'start2'));

test('on a phone the turn buttons show and a sideways card still fits the screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await open(page, 'MAZERULES');
  await spot(page, 'front', 'spin3').tap();
  await page.locator('#rotate-clockwise').tap();
  await expect(page.locator('body')).not.toHaveClass(/\bbusy\b/);
  const vw = page.viewportSize().width;
  const card = await page.locator('#card .front.card').boundingBox();
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(vw);
  const btn = await page.locator('#rotate-counterclockwise').boundingBox();
  expect(btn.y, 'turn buttons sit under the card').toBeGreaterThan(card.y + card.height - 1);
});

test('a card played once still opens offline', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'service worker check runs in Chromium only');
  await open(page, 'MAZERULES');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // this load goes through the worker and fills its cache
  await expect(spot(page, 'front', 'spin3')).toHaveClass(/\bcan\b/);
  await context.setOffline(true);
  await page.reload();
  await expect(spot(page, 'front', 'spin3')).toHaveClass(/\bcan\b/);
  await expect(page.locator('.front.card img')).toHaveJSProperty('complete', true);
  expect(await page.locator('.front.card img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
});

test('with Motion on, turning the phone on a spin turns the card without moving the picture', async ({ page, context, isMobile, browserName }) => {
  test.skip(!isMobile || browserName !== 'chromium', 'needs a touch device that lets the test fire orientation events');
  await context.grantPermissions(['accelerometer', 'gyroscope', 'magnetometer']);
  const { pose } = require('../tools/motion-test.js');
  const turn = t => page.evaluate(p => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', p)), pose(t));
  const msg = page.locator('#hud-message');
  await open(page, 'MAZERULES');
  const toggle = page.locator('#hud-motion');
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await turn(0);
  const picture = await page.locator('#card').getAttribute('style');

  // spin3 is the only spin in reach, so turning the phone walks the player onto it and turns the card:
  // door 2 opens (as the cw spin does) and the flip lights up.
  await turn(90);
  await expect(msg).toHaveText('Turn the phone to turn the card.');
  expect(await highlighted(page)).toEqual(['front.flipBottom', 'front.spin3']);
  await expect(spot(page, 'front', 'spin3')).toHaveClass(/\bhere\b/);
  expect(await page.locator('#card').getAttribute('style'), 'the picture stays still').toBe(picture);

  // Flip while the phone is still turned: the rules and the picture must agree (guided.js asserts it).
  const failures = [];
  page.on('console', m => m.type() === 'assert' && failures.push(m.text()));
  await spot(page, 'front', 'flipBottom').tap();
  await expect(page.locator('body')).not.toHaveClass(/\bbusy\b/);
  expect(await highlighted(page)).toEqual(['back.flipBottom', 'back.spinSE']);
  expect(failures).toEqual([]);

  // Switching Motion off hands the phone's turn to the picture, so the game state is unchanged.
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await highlighted(page)).toEqual(['back.flipBottom', 'back.spinSE']);
});

for (const [card, why] of [['MAZE2', 'no spin in reach'], ['MAZE730453', 'two spins in reach']]) {
  test(`with Motion on, turning the phone waits when there is ${why}`, async ({ page, context, isMobile, browserName }) => {
    test.skip(!isMobile || browserName !== 'chromium', 'needs a touch device that lets the test fire orientation events');
    await context.grantPermissions(['accelerometer', 'gyroscope', 'magnetometer']);
    const { pose } = require('../tools/motion-test.js');
    const turn = t => page.evaluate(p => window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', p)), pose(t));
    await open(page, card);
    await page.locator('#hud-motion').tap();
    await turn(0);
    const before = await highlighted(page);
    await turn(90);
    await expect(page.locator('#hud-message')).toHaveText('You can only turn the card on a spin. Turn the phone back.');
    expect(await highlighted(page)).toEqual([]);
    await turn(0);
    expect(await highlighted(page)).toEqual(before);
  });
}
