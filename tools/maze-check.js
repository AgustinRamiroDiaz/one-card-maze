// Shared by validate.js (Node) and editor.html (browser): checkMaze(maze) -> { errors, warnings }
(function (root) {
  const TYPES = ['start', 'exit', 'room', 'junction', 'door', 'spin', 'flip', 'item', 'special'];
  const ARROWS = ['up', 'down', 'left', 'right'];
  const MIRROR = { top: 'top', bottom: 'bottom', left: 'right', right: 'left' };
  const STATUSES = ['draft', 'reviewed', 'unplayable'];
  const TOL = 0.1;

  function checkMaze(maze) {
    const errors = [], warnings = [];
    if (!STATUSES.includes(maze.status)) errors.push(`bad status ${maze.status}`);
    if (maze.status === 'unplayable') return { errors, warnings };
    const counts = {};
    for (const side of ['front', 'back']) {
      const s = maze.sides?.[side];
      if (!s) { errors.push(`missing side ${side}`); continue; }
      const ids = new Set();
      for (const n of s.nodes) {
        const at = `${side}.${n.id}`;
        if (ids.has(n.id)) errors.push(`${at}: duplicate id`);
        ids.add(n.id);
        if (!TYPES.includes(n.type)) errors.push(`${at}: bad type ${n.type}`);
        if (!(n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1)) errors.push(`${at}: coords out of range`);
        if (n.type === 'door' && !ARROWS.includes(n.arrow)) errors.push(`${at}: door needs arrow`);
        if (n.type === 'flip' && !MIRROR[n.edge]) errors.push(`${at}: flip needs edge`);
        counts[n.type] = (counts[n.type] || 0) + 1;
      }
      const linked = new Set();
      for (const [a, b] of s.edges) {
        if (!ids.has(a) || !ids.has(b)) errors.push(`${side}: edge ${a}-${b} references unknown node`);
        linked.add(a); linked.add(b);
      }
      for (const n of s.nodes) if (!linked.has(n.id)) warnings.push(`${side}.${n.id}: no edges`);
    }
    if (counts.start !== 1) warnings.push(`${counts.start || 0} start nodes`);
    if (!counts.exit) warnings.push('no exit node');
    for (const [a, b] of [['front', 'back'], ['back', 'front']]) {
      for (const f of (maze.sides?.[a]?.nodes || []).filter(n => n.type === 'flip')) {
        const tx = 1 - f.x, ty = f.y;
        const ok = (maze.sides?.[b]?.nodes || []).some(n => n.type === 'flip' && n.edge === MIRROR[f.edge]
          && Math.abs(n.x - tx) < TOL && Math.abs(n.y - ty) < TOL);
        if (!ok) warnings.push(`${a}.${f.id}: no matching ${MIRROR[f.edge]} flip on ${b} near (${tx.toFixed(2)}, ${ty.toFixed(2)})`);
      }
    }
    return { errors, warnings };
  }

  const api = { checkMaze, TYPES, ARROWS, MIRROR, STATUSES };
  if (typeof module !== 'undefined') module.exports = api; else root.MazeCheck = api;
})(this);
