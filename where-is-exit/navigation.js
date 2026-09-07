// Small deterministic A* used only when a monster cannot walk straight ahead.
// The caller supplies collision/height rules; this never changes monster speed.
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
