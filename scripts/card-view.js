// How the card is drawn: the CSS transform rotate(R) rotateX(X) rotateY(Y), and which side and turn it shows.
// Presentation maths only; no game rules. Shared by view.js (browser) and tools/solve.js --self-test (Node).
(function (root) {
  const mod = (a, n) => ((a % n) + n) % n;

  // A flip turns X or Y by 180 depending on which local axis lies along the screen edge.
  // The sign only changes the animation: the card must roll toward the edge (a swipe right lifts the left edge
  // toward the viewer and lays it down on the right). Animating X turns the card about rotate(R)·x on screen,
  // Y about rotate(R)·rotateX(X)·y, so the sign depends on R and on whether X is flipped. Matches the original UI.js.
  function cssFlip(css, edgeOnScreen) {
    const sideways = edgeOnScreen === 'left' || edgeOnScreen === 'right';
    const axis = sideways === (mod(css.R, 180) === 0) ? 'Y' : 'X';
    const q = mod(css.R, 360) / 90;
    const along = axis === 'X' ? (q <= 1 ? 1 : -1) : (q === 0 || q === 3 ? 1 : -1) * (mod(css.X, 360) === 180 ? -1 : 1);
    const toward = edgeOnScreen === 'right' || edgeOnScreen === 'top' ? 1 : -1;
    return { ...css, [axis]: css[axis] + 180 * toward * along };
  }

  // The side facing the viewer and the card's clockwise turn on screen, as rules.js counts them.
  function cssView(css) {
    const x = mod(css.X, 360) === 180, y = mod(css.Y, 360) === 180;
    return { side: x !== y ? 'back' : 'front', rot: mod(css.R + (x ? 180 : 0), 360) };
  }

  const api = { cssFlip, cssView };
  if (typeof module !== 'undefined') module.exports = api; else root.CardView = api;
})(this);
