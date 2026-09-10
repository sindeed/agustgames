import assert from "node:assert/strict";
import { actorMotion } from "../actor-motion.js";

for (const fps of [30, 60, 120]) {
  const actor = { x: 0, y: 0, z: 0, zone: "belly" };
  let motion = actorMotion(null, actor, null, 0), lastX = 0, lastPhase = 0;
  const increments = [];
  for (let frame = 1; frame <= fps * 2; frame++) {
    const time = frame / fps;
    actor.x = Math.floor((time + 1e-8) * 10) * 0.5;
    motion = actorMotion(motion, actor, null, time);
    if (time > 0.4) {
      assert(motion.x > lastX, `${fps} fps: movement continues between AI ticks`);
      assert(motion.phase > lastPhase, `${fps} fps: stride never resets between ticks`);
      assert(motion.blend > 0.9, `${fps} fps: legs stay active throughout walking`);
      increments.push(motion.x - lastX);
    }
    lastX = motion.x;
    lastPhase = motion.phase;
  }
  assert(Math.max(...increments) < 0.5, `${fps} fps: no full AI-step jumps`);
  assert(actor.x - motion.x < 0.5, `${fps} fps: visual position stays close to actor`);
  for (let frame = 1; frame <= fps; frame++)
    motion = actorMotion(motion, actor, null, 2 + frame / fps);
  assert(motion.blend < 0.01, `${fps} fps: settles below 1% stride when stopped`);
  const frozen = { ...motion };
  actorMotion(motion, actor, null, 3);
  assert.deepEqual(motion, frozen, `${fps} fps: paused game freezes pose`);
  console.log(`PASS smooth walking, stopping and pause at ${fps} fps`);
}

for (const boat of [false, true]) {
  const carrier = { id: "deck", x: 0, z: 0 };
  const actor = { x: 1, y: 0.72, z: 0, zone: "sea", boatId: boat ? "deck" : null };
  let motion = actorMotion(null, actor, carrier, 0);
  for (let frame = 1; frame <= 60; frame++) {
    carrier.x += 0.2;
    actor.x = carrier.x + 1;
    motion = actorMotion(motion, actor, carrier, frame / 60);
    assert(Math.abs(motion.x + carrier.x - actor.x) < 1e-9);
    assert(Math.abs(motion.blend) < 1e-10);
    assert(Math.abs(motion.phase) < 1e-10);
  }
  console.log(`PASS standing still on a moving ${boat ? "boat" : "raft"}`);
}

let actor = { x: 0, y: 0, z: 0, zone: "sea" };
let motion = actorMotion(null, actor, null, 0);
actor = { x: 25, y: 29, z: -65, zone: "belly" };
motion = actorMotion(motion, actor, null, 1);
assert.deepEqual([motion.x, motion.y, motion.z], [25, 29, -65]);
assert.equal(motion.blend, 0);
console.log("PASS whale transition snaps to correct location without a false stride");
