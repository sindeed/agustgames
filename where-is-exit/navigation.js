// Small deterministic A* used only when a monster cannot walk straight ahead.
// The caller supplies collision/height rules; this never changes monster speed.

export function rectangleConnection(a, b, anchor = a, inset = 0.2) {
  const endpoints = (ac, aw, bc, bw, at) => {
    const loA = ac - aw / 2 + inset, hiA = ac + aw / 2 - inset;
    const loB = bc - bw / 2 + inset, hiB = bc + bw / 2 - inset;
    if (hiA < loB) return [hiA, loB];
    if (hiB < loA) return [loA, hiB];
    const p = Math.max(Math.max(loA, loB), Math.min(Math.min(hiA, hiB), at));
    return [p, p];
  };
  const [ax, bx] = endpoints(a.x, a.w, b.x, b.w, anchor.x);
  const [az, bz] = endpoints(a.z, a.d, b.z, b.d, anchor.z);
  return { from: { x: ax, z: az }, to: { x: bx, z: bz }, distance: Math.hypot(bx - ax, bz - az) };
}

// Plan through real support surfaces, not through the empty space between
// them. A moving platform is one node with two docking positions, so an
// actor can board, wait while riding, and jump off at its destination.
export function findSurfaceRoute(surfaces, fromId, toId, maxGap = 3.1) {
  if (fromId === toId) return [];
  const poses = surface => [surface, ...(surface.docks || [])];
  const reachable = (a, b) => poses(a).some(ap => poses(b).some(bp =>
    rectangleConnection(ap, bp).distance <= maxGap && Math.abs((ap.y || 0) - (bp.y || 0)) <= 0.85));
  const queue = [fromId], seen = new Set(queue), previous = new Map();
  for (let i = 0; i < queue.length; i++) {
    const node = surfaces.find(s => s.id === queue[i]);
    if (!node) continue;
    for (const next of surfaces) {
      if (seen.has(next.id) || !reachable(node, next)) continue;
      seen.add(next.id); previous.set(next.id, node.id); queue.push(next.id);
      if (next.id !== toId) continue;
      const path = [];
      for (let id = toId; id !== fromId; id = previous.get(id)) path.unshift(id);
      return path;
    }
  }
  return [];
}

export function findRoute(start, goal, heightAt, maxRise = 0.4, step = 2) {
  const key = (x, z) => `${x},${z}`;
  const snap = value => Math.round(value / step) * step;
  const nearest = point => {
    let best = null, distance = Infinity;
    for (let dx = -6; dx <= 6; dx += step) for (let dz = -6; dz <= 6; dz += step) {
      const x = snap(point.x) + dx, z = snap(point.z) + dz;
      const h = heightAt(x, z);
      const d = Math.hypot(point.x - x, point.z - z);
      if (h !== null && d < distance) { best = { x, z, h }; distance = d; }
    }
    return best;
  };
  const from = nearest(start), to = nearest(goal);
  if (!from || !to) return [];
  const open = [], costs = new Map(), parents = new Map(), points = new Map();
  const push = node => {
    open.push(node);
    let i = open.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (open[parent].f <= node.f) break;
      open[i] = open[parent]; i = parent;
    }
    open[i] = node;
  };
  const pop = () => {
    const result = open[0], end = open.pop();
    if (open.length) {
      let i = 0;
      while (i * 2 + 1 < open.length) {
        let child = i * 2 + 1;
        if (child + 1 < open.length && open[child + 1].f < open[child].f) child++;
        if (open[child].f >= end.f) break;
        open[i] = open[child]; i = child;
      }
      open[i] = end;
    }
    return result;
  };
  from.key = key(from.x, from.z);
  const targetKey = key(to.x, to.z);
  costs.set(from.key, 0); points.set(from.key, from);
  push({ ...from, g: 0, f: Math.hypot(from.x - to.x, from.z - to.z) });
  let visits = 0;
  while (open.length && visits++ < 7000) {
    const node = pop();
    if (node.g > costs.get(node.key)) continue;
    if (node.key === targetKey) {
      const path = [];
      let cursor = node.key;
      while (cursor !== from.key) {
        path.unshift(points.get(cursor)); cursor = parents.get(cursor);
      }
      return path;
    }
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const x = node.x + dx, z = node.z + dz;
      if (Math.abs(x) > 54 || Math.abs(z) > 54) continue;
      const h = heightAt(x, z), midpoint = heightAt(node.x + dx / 2, node.z + dz / 2);
      if (h === null || midpoint === null || h - node.h > maxRise || midpoint - node.h > maxRise) continue;
      const nextKey = key(x, z), g = node.g + step + Math.abs(h - node.h) * 0.1;
      if (g >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, g); parents.set(nextKey, node.key);
      const next = { x, z, h, key: nextKey };
      points.set(nextKey, next);
      push({ ...next, g, f: g + Math.hypot(x - to.x, z - to.z) });
    }
  }
  return [];
}
