// Motion controls: the phone is the card. Turning the upright phone a quarter in its own plane (like a steering
// wheel) turns the card a quarter in the world; the picture on screen never moves. Shared by guided.js (browser)
// and tools/motion-test.js (Node).
(function (root) {
  const DEG = Math.PI / 180;

  // Clockwise turn of the screen away from upright, in degrees, from the W3C beta/gamma angles
  // (rotation Rz(alpha)·Rx(beta)·Ry(gamma)). It is world "up" seen in the screen plane, so it only means something
  // while the phone stands up; lying flat (tilted under ~30°) returns null.
  function screenTurn({ beta, gamma }) {
    if (beta == null || gamma == null) return null;
    const ux = -Math.cos(beta * DEG) * Math.sin(gamma * DEG), uy = Math.sin(beta * DEG);
    return Math.hypot(ux, uy) < 0.5 ? null : Math.atan2(-ux, uy) / DEG;
  }

  // Which quarter (0-3, clockwise) the phone is turned to. It only changes once the phone is within `snap`
  // degrees of the new quarter, so holding it near 45° does not flicker between two.
  function quarterTracker({ snap = 30 } = {}) {
    let quarter = 0;
    return {
      update(e) {
        const a = screenTurn(e);
        if (a == null) return quarter;
        const q = Math.round(a / 90);
        if (Math.abs(a - q * 90) <= snap) quarter = ((q % 4) + 4) % 4;
        return quarter;
      },
      get quarter() { return quarter; },
    };
  }

  const api = { screenTurn, quarterTracker };
  if (typeof module !== 'undefined') module.exports = api; else root.MazeMotion = api;
})(this);
