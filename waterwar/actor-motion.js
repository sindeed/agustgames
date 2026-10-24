// Animate between the AI's 10 Hz updates, relative to the deck underfoot.
export function actorMotion(previous, actor, carrier, time) {
  const x = actor.x - (carrier?.x || 0),
    z = actor.z - (carrier?.z || 0),
    support = carrier?.id || null;
  let m = previous;
  if (!m || m.zone !== actor.zone || m.support !== support ||
      Math.hypot(x - m.x, z - m.z, actor.y - m.y) > 8) {
    m = { x, y: actor.y, z, support, zone: actor.zone, time,
      phase: previous?.phase || 0, speed: 0, blend: 0, yaw: previous?.yaw || 0 };
  }
  const dt = Math.max(0, Math.min(0.2, time - m.time));
  if (dt > 0) {
    const follow = 1 - Math.exp(-20 * dt),
      dx = (x - m.x) * follow,
      dz = (z - m.z) * follow,
      distance = Math.hypot(dx, dz),
      walking = !actor.boatId && actor.y >= 0;
    m.speed += ((walking ? distance / dt : 0) - m.speed) * (1 - Math.exp(-10 * dt));
    const intensity = Math.min(1, m.speed / 1.5);
    m.x += dx;
    m.z += dz;
    m.y += (actor.y - m.y) * follow;
    m.blend += (intensity - m.blend) * (1 - Math.exp(-12 * dt));
    if (walking) m.phase += m.speed * dt * Math.PI * 2 / 2.8;
    if (walking && distance > 0.0001) {
      const target = Math.atan2(-dx, -dz),
        turn = Math.atan2(Math.sin(target - m.yaw), Math.cos(target - m.yaw));
      m.yaw += turn * (1 - Math.exp(-14 * dt));
    }
    m.time = time;
  }
  return m;
}
