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

test('a card with several starts highlights only the starts until one is picked', async ({ page }) => {
  await open(page, '2CMP2');
  await expect(page.locator('#hud-message')).toHaveText('Pick where to start.');
  expect(await highlighted(page)).toEqual(['front.start1', 'front.start2', 'front.start3']);
  await expect(page.locator('#rotate-clockwise')).toHaveClass(/disabled/);

  const start1 = spot(page, 'front', 'start1');
  const lit = await glowPixels(page, start1);
  expect(lit, 'the highlight is painted').toBeGreaterThan(50);

  await spot(page, 'front', 'start2').click();
  await expect(page.locator('#hud-message')).toHaveText('Find the exit.');
  const after = await highlighted(page);
  expect(after.length).toBeGreaterThan(0);
  expect(after.filter(id => id.includes('.start'))).toEqual([]);
  expect(await glowPixels(page, start1), 'the glow goes away once the start is no longer offered').toBeLessThan(lit / 4);
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
      if (pending) { await click(s.side, pending); if (arg === 'ccw') { await turn('ccw'); await turn('ccw'); } }
      else await turn(arg);
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
  await expect(page.locator('#hud-message')).toHaveText('You found the exit!');
  await expect(page.locator('body')).toHaveClass(/\bwon\b/);
  expect(await highlighted(page)).toEqual([]);
}

test('MAZERULES can be played to the exit', ({ page }) => playThrough(page, 'MAZERULES'));
test('MAZE2404984 can be played to the exit through portals', ({ page }) => playThrough(page, 'MAZE2404984'));
test('2CMP2 can be played to the exit from a picked start', ({ page }) => playThrough(page, '2CMP2', 'start2'));
