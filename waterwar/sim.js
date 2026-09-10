export const VERSION = "20260910-7";
export const TAU = Math.PI * 2;
export const WORLD = 8000;
export const TILE = 3;
export const BUILD = {
  floor: { name: "Vanlig platta", cost: 1, hp: 100 },
  wall: { name: "Vanlig vägg", cost: 2, hp: 100 },
  stairs: { name: "Trappa", cost: 3, hp: 100 },
  strong: { name: "Specialvägg", cost: 5, hp: 200 },
  boat: { name: "Liten båt", cost: 5, hp: 100 },
  wheel: { name: "Ratt", cost: 1, hp: 100 },
};
export const WEAPONS = {
  hammer: {
    name: "Hammare",
    icon: "⚒",
    cost: 0,
    reach: 4.5,
    damage: 34,
    cooldown: 0.46,
  },
  sword: {
    name: "Svärd",
    icon: "⚔",
    cost: 0,
    guard: 3,
    reach: 3,
    damage: 25,
    cooldown: 0.42,
  },
  spear: {
    name: "Spjut",
    icon: "↟",
    cost: 3,
    guard: 5,
    reach: 6,
    damage: 25,
    cooldown: 0.6,
  },
  bow: {
    name: "Pilbåge",
    icon: "➶",
    cost: 5,
    guard: 7,
    reach: 95,
    damage: 25,
    cooldown: 0.7,
  },
  firebow: {
    name: "Eldpilbåge",
    icon: "➶",
    cost: 7,
    guard: 10,
    reach: 95,
    damage: 25,
    cooldown: 0.9,
  },
};
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function seedRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Simulation {
  constructor(seed = 1209) {
    this.random = seedRandom(seed);
    this.serial = 0;
    this.time = 0;
    this.aiClock = 0;
    this.mode = "menu";
    this.building = false;
    this.selectedBuild = "floor";
    this.events = [];
    this.sounds = [];
    this.rafts = [];
    this.bots = [];
    this.guards = [];
    this.boats = [];
    this.sharks = [];
    this.resources = [];
    this.islands = [];
    this.islandCells = new Map();
    this.arrows = [];
    this.effects = [];
    this.rescued = 0;
    this.replacements = 0;
    this.wars = new Set();
    this.current = { x: 0.09, z: -0.12, next: 30 };
    this.whale = {
      phase: "deep",
      timer: 180,
      x: 0,
      z: -120,
      y: -95,
      hp: Infinity,
      mouth: false,
      swallows: 0,
      nextMouth: 16,
    };
    this.input = { x: 0, z: 0 };
    this.player = {
      id: "player",
      team: 0,
      x: 0,
      z: 5,
      y: -0.9,
      yaw: 0,
      pitch: -0.04,
      hp: 100,
      wood: 0,
      gold: 0,
      weapon: "hammer",
      weapons: ["hammer", "sword"],
      zone: "sea",
      swim: 0,
      cooldown: 0,
      steering: null,
      skin: "sailor",
      invulnerable: 8,
      healAt: null,
    };
    this.makeIslands();
    this.makeRaft(0, 0, 0);
    this.startFurniture(0, 0, 0);
    for (let i = 0; i < 49; i++) this.spawnBot(i);
    this.addShark(55, -48);
  }
  id(prefix) {
    return `${prefix}${++this.serial}`;
  }
  event(message) {
    this.events.push({ message, until: this.time + 4 });
    if (this.events.length > 8) this.events.shift();
  }
  sound(kind, source = this.player) {
    if (source.zone !== this.player.zone || dist(source, this.player) > 65) return;
    this.sounds.push({ kind, x: source.x, z: source.z, zone: source.zone });
    if (this.sounds.length > 64) this.sounds.shift();
  }
  get raft() {
    return this.rafts.find((r) => r.team === 0);
  }
  get daylight() {
    return clamp(
      0.56 + Math.sin((this.time / 360 + 0.12) * TAU) * 0.52,
      0.08,
      1,
    );
  }
  get cave() {
    const i = this.islands.find((i) => i.cave);
    return (
      this.player.zone === "sea" &&
      Math.hypot(this.player.x - i.x, this.player.z - (i.z - 7)) < 18 &&
      this.player.z < i.z + 5
    );
  }
  get night() {
    return this.daylight < 0.3;
  }
  makeRaft(team, x, z, zone = "sea") {
    const r = {
      id: this.id("raft"),
      team,
      x,
      z,
      zone,
      parts: [],
      skin: "sailor",
    };
    this.rafts.push(r);
    this.addPart(r, "floor", 0, 0, 0);
    return r;
  }
  addPart(raft, type, x, z, y = 0, rotation = 0) {
    const p = {
      id: this.id("part"),
      raftId: raft.id,
      type,
      x,
      z,
      y,
      rotation,
      hp: BUILD[type].hp,
      burning: 0,
      spread: 0,
    };
    raft.parts.push(p);
    return p;
  }
  startFurniture(team, x, z) {
    for (const [kind, dx, dz] of [
      ["sofa", -3.3, 1.5],
      ["table", 3.3, 1],
      ["table", 2.8, -2.9],
    ])
      this.resources.push({
        id: this.id("res"),
        kind,
        team,
        x: x + dx,
        z: z + dz,
        y: 0,
        hp: 100,
        active: true,
        zone: "sea",
      });
  }
  makeIslands() {
    const places = [
      { x: 35, z: -65, r: 25 },
      { x: -112, z: -185, r: 43, cave: true },
      { x: 210, z: 65, r: 28 },
      { x: -210, z: 45, r: 32 },
      { x: 80, z: 235, r: 32 },
      { x: -130, z: 275, r: 28 },
      { x: 285, z: -170, r: 36 },
      { x: -320, z: -250, r: 29 },
      { x: 170, z: -390, r: 32 },
      { x: -180, z: -460, r: 30 },
      { x: -390, z: 160, r: 33 },
      { x: -60, z: -330, r: 27 },
    ];
    for (let z = -7500; z <= 7500; z += 600)
      for (let x = -7500; x <= 7500; x += 600) {
        const p = {
          x: x + (this.random() - 0.5) * 180,
          z: z + (this.random() - 0.5) * 180,
          r: 19 + this.random() * 23,
        };
        if (places.every((i) => dist(i, p) > i.r + p.r + 75)) places.push(p);
      }
    for (let i = 0; i < places.length; i++) {
      const p = { ...places[i], id: `island${i}` };
      this.islands.push(p);
      // Only nearby shores participate in the many ground checks each frame.
      for (let cx = Math.floor((p.x - p.r) / 128); cx <= Math.floor((p.x + p.r) / 128); cx++)
        for (let cz = Math.floor((p.z - p.r) / 128); cz <= Math.floor((p.z + p.r) / 128); cz++) {
          const key = `${cx},${cz}`;
          if (!this.islandCells.has(key)) this.islandCells.set(key, []);
          this.islandCells.get(key).push(p);
        }
      const count = p.cave ? 10 : 5 + Math.floor(this.random() * 5);
      for (let j = 0; j < count; j++) {
        const a = j * 2.4,
          rr = p.r * (0.22 + this.random() * 0.5);
        this.resources.push({
          id: this.id("palm"),
          kind: "palm",
          x: p.x + Math.cos(a) * rr,
          z: p.z + Math.sin(a) * rr,
          y: 1.15,
          hp: 100,
          active: true,
          regrow: 0,
          zone: "sea",
          island: p.id,
        });
      }
      this.resources.push({
        id: this.id("chest"),
        kind: "chest",
        x: p.x + p.r * 0.25,
        z: p.z + p.r * 0.48,
        y: 1.15,
        hp: 100,
        active: true,
        zone: "sea",
        island: p.id,
      });
      const oreCount = p.cave ? 26 : 3;
      for (let j = 0; j < oreCount; j++) {
        const a = j * 2.4,
          rr = p.cave ? 2 + this.random() * 12 : p.r * 0.62;
        this.resources.push({
          id: this.id("ore"),
          kind: "ore",
          x: p.x + Math.cos(a) * rr,
          z: p.z + (p.cave ? -10 : 0) + Math.sin(a) * rr,
          y: 1.15,
          hp: 100,
          active: true,
          regrow: 0,
          zone: "sea",
          island: p.id,
        });
      }
    }
  }
  spawnBot(slot) {
    const old = this.bots.find((b) => b.slot === slot);
    if (old) {
      this.bots = this.bots.filter((b) => b !== old);
      this.rafts = this.rafts.filter((r) => r.team !== old.team);
      this.guards = this.guards.filter((g) => g.team !== old.team);
      this.boats = this.boats.filter((b) => b.team !== old.team);
      this.resources = this.resources.filter((r) => r.team !== old.team);
      this.replacements++;
    }
    const col = slot % 7, row = Math.floor(slot / 7);
    let x = (col - 3) * 1730 + 810 + (this.random() - 0.5) * 180,
      z = (row - 3) * 1730 - 850 + (this.random() - 0.5) * 180;
    for (const island of this.islands)
      if (dist({ x, z }, island) < island.r + 16) z = island.z + island.r + 18;
    const team = slot + 1;
    const r = this.makeRaft(team, x, z);
    const bot = {
      id: this.id("bot"),
      slot,
      team,
      x,
      z: z + 3,
      y: -0.9,
      zone: "sea",
      hp: 100,
      wood: 0,
      gold: 0,
      weapon: "sword",
      weapons: ["hammer", "sword"],
      cooldown: 0,
      think: 2 + this.random() * 3,
      age: 0,
      hostile: this.random() < 0.35,
      skin: "sailor",
      raftId: r.id,
      healAt: null,
    };
    this.bots.push(bot);
    this.startFurniture(team, x, z);
    return bot;
  }
  start() {
    this.mode = "playing";
    this.event("Hammaren är redo. Slå sönder soffan och de två borden!");
  }
  baseGround(x, z, zone) {
    if (zone === "belly") {
      if (x > 18 && x < 33 && z < 43 && z > -69)
        return clamp((40 - z) / 105, 0, 1) * 30;
      if (x >= -6 && x <= 33 && z >= -72 && z <= -59) return 30;
      return 0;
    }
    let ground = -0.9;
    for (const i of this.islandCells.get(`${Math.floor(x / 128)},${Math.floor(z / 128)}`) || []) {
      const d = Math.hypot(x - i.x, z - i.z);
      if (d < i.r) ground = Math.max(ground, clamp((i.r - d) / 4, 0, 1) * 1.15);
    }
    return ground;
  }
  ground(x, z, zone, currentY = Infinity) {
    let height = this.baseGround(x, z, zone),
      raft = null;
    for (const r of this.rafts) {
      if (r.zone !== zone || Math.abs(r.x - x) > 85 || Math.abs(r.z - z) > 85)
        continue;
      for (const p of r.parts) {
        if (p.hp <= 0) continue;
        if (
          (p.type === "floor" || p.type === "stairs") &&
          Math.abs(x - r.x - p.x) < 1.53 &&
          Math.abs(z - r.z - p.z) < 1.53
        ) {
          const y =
            p.type === "stairs"
              ? 0.72 + p.y + clamp((1.5 - (z - r.z - p.z)) / 3, 0, 1) * 3
              : 0.72 + p.y;
          if (y >= height && y <= currentY + (currentY < 0 ? 1.85 : 1.15)) {
            height = y;
            raft = r;
          }
        }
      }
    }
    return { height, raft };
  }
  move(actor, dx, dz) {
    const oldX = actor.x, oldZ = actor.z;
    const nx = clamp(
        actor.x + dx,
        actor.zone === "belly" ? -46 : -WORLD,
        actor.zone === "belly" ? 46 : WORLD,
      ),
      nz = clamp(
        actor.z + dz,
        actor.zone === "belly" ? -81 : -WORLD,
        actor.zone === "belly" ? 80 : WORLD,
      );
    let blocked = false;
    for (const r of this.rafts) {
      if (r.zone !== actor.zone || dist(r, actor) > 80) continue;
      for (const p of r.parts) {
        if (!['wall', 'strong'].includes(p.type) || p.hp <= 0 ||
            actor.y < p.y - 0.4 || actor.y >= p.y + 3) continue;
        const halfX = p.rotation ? 0.37 : 1.65,
          halfZ = p.rotation ? 1.65 : 0.37,
          x = actor.x - r.x - p.x,
          z = actor.z - r.z - p.z;
        // An actor already overlapping a newly built wall can step out.
        if (Math.abs(x) < halfX && Math.abs(z) < halfZ) continue;
        let enter = 0, leave = 1;
        for (const [start, delta, half] of [[x, nx - actor.x, halfX], [z, nz - actor.z, halfZ]]) {
          if (Math.abs(delta) < 1e-9) {
            if (Math.abs(start) >= half) { enter = 2; break; }
          } else {
            const a = (-half - start) / delta, b = (half - start) / delta;
            enter = Math.max(enter, Math.min(a, b));
            leave = Math.min(leave, Math.max(a, b));
          }
        }
        if (enter <= leave) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) {
      actor.x = nx;
      actor.z = nz;
    }
    actor.y = this.ground(actor.x, actor.z, actor.zone, actor.y).height;
    const distance = Math.hypot(actor.x - oldX, actor.z - oldZ);
    actor.stepSoundDistance = (actor.stepSoundDistance || 0) + distance;
    const stride = actor.y < 0 ? 1.8 : 1.4;
    if (actor.stepSoundDistance >= stride) {
      this.sound(actor.y < 0 ? "splash" : "step", actor);
      actor.stepSoundDistance %= stride;
    }
  }
  moveToward(actor, target, speed, dt) {
    const d = dist(actor, target);
    if (d > 0.2) {
      const step = Math.min(d, speed * dt);
      this.move(
        actor,
        ((target.x - actor.x) / d) * step,
        ((target.z - actor.z) / d) * step,
      );
    }
    return d;
  }
  hasWheel(raft) {
    return (
      !!raft?.parts.some((p) => p.type === "wheel" && p.hp > 0) &&
      raft.parts.some((p) => p.type === "floor" && p.hp > 0)
    );
  }
  translateRaft(r, dx, dz) {
    const ground = this.ground(
      this.player.x,
      this.player.z,
      this.player.zone,
      this.player.y,
    );
    const riders = [...this.bots, ...this.guards].filter(
      (a) =>
        a.zone === r.zone &&
        !a.boatId &&
        Math.abs(a.x - r.x) < 65 &&
        Math.abs(a.z - r.z) < 65 &&
        this.ground(a.x, a.z, a.zone, a.y).raft === r,
    );
    if (
      this.player.zone === r.zone &&
      (ground.raft === r || this.player.steering === r.id)
    ) {
      this.player.x += dx;
      this.player.z += dz;
    }
    for (const a of riders) {
      a.x += dx;
      a.z += dz;
    }
    r.x += dx;
    r.z += dz;
  }
  wallPlacement(x, z, y, raft) {
    const localX = x - raft.x, localZ = z - raft.z;
    let nearest = null, distance = Infinity;
    for (const floor of raft.parts) {
      if (floor.type !== "floor" || floor.hp <= 0 || floor.y !== y) continue;
      for (const [dx, dz, rotation] of [[0, -1.5, 0], [1.5, 0, Math.PI / 2], [0, 1.5, 0], [-1.5, 0, Math.PI / 2]]) {
        const ex = floor.x + dx, ez = floor.z + dz,
          along = rotation ? Math.abs(localZ - ez) : Math.abs(localX - ex),
          across = rotation ? Math.abs(localX - ex) : Math.abs(localZ - ez),
          d = Math.hypot(across, Math.max(0, along - 1.5));
        if (d < distance) {
          distance = d;
          nearest = { x: ex, z: ez, y, rotation };
        }
      }
    }
    return distance <= 1.6 ? nearest : null;
  }
  canBuild(type, x, z, y = 0, raft = this.raft, owner = this.player) {
    if (!BUILD[type] || !raft || raft.zone !== owner.zone)
      return { ok: false, reason: "Du behöver din flotte här." };
    if (owner.wood < BUILD[type].cost)
      return { ok: false, reason: `Du behöver ${BUILD[type].cost} trä.` };
    if (type === "boat") {
      if (dist(owner, { x, z }) > 18)
        return { ok: false, reason: "Bygg båten närmare dig." };
      if (this.baseGround(x, z, raft.zone) > 0 && raft.zone === "sea")
        return { ok: false, reason: "Bygg båten på vattnet." };
      return { ok: true, x, z, y: 0 };
    }
    if (type === "wall" || type === "strong") {
      const edge = this.wallPlacement(x, z, Math.max(0, Math.round(y / 3) * 3), raft);
      if (!edge) return { ok: false, reason: "Placera väggen vid kanten av en platta." };
      if (Math.hypot(edge.x, edge.z) > 72 || dist(owner, { x: raft.x + edge.x, z: raft.z + edge.z }) > 20)
        return { ...edge, ok: false, reason: "Bygg närmare flotten." };
      if (raft.parts.some((p) => ["wall", "strong"].includes(p.type) && p.hp > 0 &&
          p.x === edge.x && p.z === edge.z && p.y === edge.y && (p.rotation || 0) === edge.rotation))
        return { ...edge, ok: false, reason: "Det finns redan en vägg på den kanten." };
      return { ...edge, ok: true };
    }
    const gx = Math.round((x - raft.x) / 3) * 3,
      gz = Math.round((z - raft.z) / 3) * 3,
      gy = Math.max(0, Math.round(y / 3) * 3);
    if (
      Math.hypot(gx, gz) > 70 ||
      dist(owner, { x: raft.x + gx, z: raft.z + gz }) > 20
    )
      return { ok: false, reason: "Bygg närmare flotten." };
    const floors = raft.parts.filter((p) => p.type === "floor" && p.hp > 0);
    let supported = floors.some(
      (p) =>
        Math.abs(p.x - gx) < 0.1 &&
        Math.abs(p.z - gz) < 0.1 &&
        Math.abs(p.y - gy) < 0.1,
    );
    if (type === "floor") {
      supported = raft.parts.some(
        (p) =>
          (p.type === "floor" || p.type === "stairs") &&
          ((p.y === gy && Math.abs(p.x - gx) + Math.abs(p.z - gz) <= 3.1) ||
            (p.type === "stairs" &&
              Math.abs(p.y + 3 - gy) < 0.1 &&
              Math.abs(p.x - gx) < 0.1 &&
              Math.abs(p.z - 3 - gz) < 0.1)),
      );
      if (!floors.length && gy === 0 && Math.abs(gx) <= 3 && Math.abs(gz) <= 3)
        supported = true;
    }
    if (!supported)
      return {
        ok: false,
        reason:
          type === "floor"
            ? "Placera intill en platta eller överst på en trappa."
            : "Placera på en platta.",
      };
    if (
      raft.parts.some(
        (p) => p.type === type && p.x === gx && p.z === gz && p.y === gy,
      )
    )
      return { ok: false, reason: "Här finns redan en sådan del." };
    if (type === "wheel" && this.hasWheel(raft))
      return { ok: false, reason: "Din flotte har redan en ratt." };
    return { ok: true, x: gx, z: gz, y: gy };
  }
  build(type, x, z, y = 0, owner = this.player, raft = this.raft) {
    const result = this.canBuild(type, x, z, y, raft, owner);
    if (!result.ok) {
      if (owner === this.player) this.event(result.reason);
      return false;
    }
    owner.wood -= BUILD[type].cost;
    if (type === "boat") {
      this.boats.push({
        id: this.id("boat"),
        team: owner.team,
        x,
        z,
        y: 0,
        zone: owner.zone,
        hp: 100,
        crew: [],
        target: null,
        home: raft.id,
      });
    } else this.addPart(raft, type, result.x, result.z, result.y, result.rotation || 0);
    this.sound("build", { x, z, zone: owner.zone });
    if (owner === this.player) this.event(`${BUILD[type].name} byggd!`);
    return true;
  }
  buy(type, guard = false, owner = this.player) {
    const w = WEAPONS[type];
    if (!w || type === "hammer") return false;
    const cost = guard ? w.guard : w.cost;
    if (!guard && owner.weapons.includes(type)) {
      owner.weapon = type;
      return true;
    }
    if (owner.gold < cost) {
      if (owner === this.player)
        this.event("Du behöver fler guldklimpar. Leta på öarna!");
      return false;
    }
    owner.gold -= cost;
    if (guard) {
      const r = this.rafts.find((r) => r.team === owner.team);
      const n = this.guards.filter((g) => g.team === owner.team).length;
      this.guards.push({
        id: this.id("guard"),
        team: owner.team,
        x: owner.x + Math.cos(n * 2.4) * 1.5,
        z: owner.z + Math.sin(n * 2.4) * 1.5,
        y: owner.y,
        zone: owner.zone,
        hp: 100,
        weapon: type,
        cooldown: 0,
        raftId: r?.id,
        escort: false,
        boatId: null,
        skin: owner.skin,
      });
    } else {
      owner.weapons.push(type);
      owner.weapon = type;
    }
    if (owner === this.player)
      this.event(guard ? "Din nya vakt är här!" : `${w.name} är redo!`);
    return true;
  }
  setSkin(skin, owner = this.player) {
    const r = this.rafts.find((r) => r.team === owner.team);
    if (
      !["pirate", "medieval"].includes(skin) ||
      r.parts.filter((p) => p.type === "floor").length < 25
    )
      return false;
    r.skin = skin;
    owner.skin = skin;
    for (const g of this.guards.filter((g) => g.team === owner.team))
      g.skin = skin;
    return true;
  }
  harvest(res, owner = this.player) {
    if (!res?.active || res.zone !== owner.zone) return false;
    this.sound(res.kind === "ore" || res.kind === "chest" ? "metal" : "chop", res);
    res.hp -= 34;
    if (res.hp > 0) return true;
    res.active = false;
    this.sound("break", res);
    if (res.kind === "palm") {
      owner.wood++;
      res.regrow = 30;
    } else if (res.kind === "sofa") owner.wood += 2;
    else if (res.kind === "table") owner.wood++;
    else if (res.kind === "ore") {
      owner.gold += 3;
      res.regrow = 90;
    } else if (res.kind === "chest") {
      owner.gold += 5;
      res.regrow = 180;
    }
    if (owner === this.player)
      this.event(
        res.kind === "palm"
          ? "+1 trä · Palmen växer tillbaka om 30 sekunder"
          : res.kind === "sofa"
            ? "+2 trä"
            : res.kind === "table"
              ? "+1 trä"
              : res.kind === "chest"
                ? "+5 guldklimpar"
                : "+3 guldklimpar",
      );
    return true;
  }
  interact(target) {
    const p = this.player;
    if (p.cooldown > 0 || this.mode !== "playing") return false;
    if (p.steering) {
      p.steering = null;
      this.event("Du går igen.");
      return true;
    }
    if (!target) return false;
    const { kind, entity, raft, distance = Infinity } = target;
    if (
      kind === "part" &&
      entity.type === "wheel" &&
      raft.team === 0 &&
      distance < 4 &&
      this.hasWheel(raft)
    ) {
      p.steering = raft.id;
      this.event("Styr med spaken. Tryck Slå för att gå igen.");
      return true;
    }
    if (
      kind === "guard" &&
      p.zone === "belly" &&
      entity.team !== 0 &&
      p.weapon === "hammer" &&
      distance < 4
    ) {
      entity.escort = true;
      entity.boatId = null;
      this.event("Vakten följer dig till blåshålet!");
      return true;
    }
    return false;
  }
  attack(target = null, direction = null) {
    const p = this.player;
    if (this.mode !== "playing" || p.cooldown > 0) return false;
    if (this.interact(target)) return true;
    const w = WEAPONS[p.weapon];
    p.cooldown = w.cooldown;
    if (!p.weapon.includes("bow")) this.sound("swing", p);
    if (p.weapon === "bow" || p.weapon === "firebow") {
      const dir = direction || {
        x: -Math.sin(p.yaw) * Math.cos(p.pitch),
        z: -Math.cos(p.yaw) * Math.cos(p.pitch),
        y: Math.sin(p.pitch),
      };
      this.shoot(p, dir);
      return true;
    }
    if (!target || target.distance > w.reach) return false;
    const { kind, entity, raft } = target;
    if (kind === "resource") {
      if (p.weapon === "hammer") return this.harvest(entity);
      this.event("Använd hammaren för att samla trä och guld.");
      return false;
    }
    if (p.weapon === "hammer") {
      this.event("Tryck Byt för att välja ett vapen.");
      return false;
    }
    if (
      (kind === "bot" || kind === "guard") &&
      entity.team !== 0 &&
      !entity.escort
    ) {
      this.startWar(0, entity.team);
      this.damage(entity, w.damage);
      return true;
    }
    if (kind === "shark") {
      this.damage(entity, w.damage);
      return true;
    }
    if (kind === "part" && raft.team !== 0) {
      this.startWar(0, raft.team);
      this.damagePart(raft, entity, w.damage);
      return true;
    }
    if (kind === "boat" && entity.team !== 0) {
      this.startWar(0, entity.team);
      this.damage(entity, w.damage);
      return true;
    }
    return false;
  }
  shoot(actor, dir) {
    this.sound("bow", actor);
    this.arrows.push({
      id: this.id("arrow"),
      team: actor.team,
      x: actor.x,
      z: actor.z,
      y: actor.y + 1.45,
      vx: dir.x * 48,
      vz: dir.z * 48,
      vy: (dir.y || 0) * 48,
      zone: actor.zone,
      fire: actor.weapon === "firebow",
      ttl: 3,
      damage: 25,
    });
  }
  ignite(raft, part) {
    if (part.burning || part.hp <= 0) return;
    part.burning = 5;
    part.spread = 0.55;
    this.effects.push({
      id: this.id("flame"),
      type: "fire",
      raftId: raft.id,
      partId: part.id,
      life: 5,
    });
  }
  damagePart(raft, p, amount) {
    const source = { x: raft.x + p.x, z: raft.z + p.z, zone: raft.zone };
    this.sound("chop", source);
    p.hp -= amount;
    if (p.hp <= 0) {
      this.sound("break", source);
      raft.parts = raft.parts.filter((a) => a !== p);
      if (this.player.steering === raft.id && !this.hasWheel(raft))
        this.player.steering = null;
    }
  }
  damage(actor, amount) {
    if (actor === this.whale) return;
    if (actor === this.player && actor.invulnerable > 0) return;
    if (amount <= 0 || actor.hp <= 0) return;
    this.sound("hit", actor);
    actor.hp = Math.max(0, actor.hp - amount);
    if (actor === this.player || this.bots.includes(actor))
      actor.healAt = actor.hp > 0 ? this.time + 2 : null;
    if (actor.hp > 0) return;
    if (actor === this.player) {
      this.mode = "dead";
      this.player.steering = null;
    } else if (actor.slot !== undefined) this.spawnBot(actor.slot);
    else if (this.sharks.includes(actor))
      this.sharks = this.sharks.filter((s) => s !== actor);
    else if (this.guards.includes(actor))
      this.guards = this.guards.filter((g) => g !== actor);
    else if (this.boats.includes(actor)) {
      for (const g of this.guards.filter((g) => g.boatId === actor.id))
        g.boatId = null;
      this.boats = this.boats.filter((b) => b !== actor);
    }
  }
  addShark(x, z) {
    const s = {
      id: this.id("shark"),
      x,
      z,
      y: -0.4,
      zone: "sea",
      hp: 100,
      cooldown: 0,
      angle: this.random() * TAU,
      target: null,
    };
    this.sharks.push(s);
    return s;
  }
  updateHealing() {
    for (const actor of [this.player, ...this.bots]) {
      if (actor.hp > 0 && actor.hp < 100 && Number.isFinite(actor.healAt) &&
          this.time + 1e-9 >= actor.healAt) {
        actor.hp = 100;
        actor.healAt = null;
      }
    }
  }
  startWar(a, b) {
    if (a !== undefined && b !== undefined && a !== b)
      this.wars.add([a, b].sort((x, y) => x - y).join(":"));
  }
  atWar(a, b) {
    return this.wars.has([a, b].sort((x, y) => x - y).join(":"));
  }
  nearbyRaft(actor, range = 350) {
    return this.rafts
      .filter(
        (r) =>
          r.team !== actor.team &&
          r.parts.length &&
          r.zone === actor.zone &&
          dist(r, actor) < range,
      )
      .sort((a, b) => dist(a, actor) - dist(b, actor))[0];
  }
  canDispatch(guard) {
    return (
      guard?.team === 0 &&
      !guard.boatId &&
      !guard.boarding &&
      guard.zone === this.player.zone &&
      dist(guard, this.player) < 4 &&
      !!this.nearbyRaft(this.player) &&
      this.boats.some(
        (b) => b.team === 0 && b.zone === guard.zone && b.crew.length < 4,
      )
    );
  }
  dispatchGuard(guard) {
    if (!this.canDispatch(guard)) return false;
    const boat = this.boats
      .filter((b) => b.team === 0 && b.zone === guard.zone && b.crew.length < 4)
      .sort((a, b) => dist(a, guard) - dist(b, guard))[0];
    const r = this.nearbyRaft(this.player);
    guard.boarding = boat.id;
    guard.raidTarget = r.id;
    guard.escort = false;
    this.event("Vakten går till båten och åker till den närmaste flotten.");
    return true;
  }
  nearestEnemy(actor, range, all = false) {
    return [this.player, ...this.bots, ...this.guards]
      .filter(
        (a) =>
          a.team !== actor.team &&
          a.zone === actor.zone &&
          a.hp > 0 &&
          !a.escort &&
          (all || this.atWar(actor.team, a.team)),
      )
      .sort((a, b) => dist(actor, a) - dist(actor, b))
      .find((a) => dist(actor, a) < range);
  }
  guardEnemy(guard, range = 28) {
    const enemies = guard.escort ? [] : [this.nearestEnemy(guard, range)];
    if (guard.zone === "sea")
      enemies.push(...this.sharks.filter((s) => s.hp > 0 && dist(guard, s) < range));
    return enemies.filter(Boolean).sort((a, b) => dist(guard, a) - dist(guard, b))[0];
  }
  approachGuardEnemy(guard, enemy, dt) {
    const speed = guard.weapon.includes("bow") ? 1.5 : 4;
    if (enemy.id.startsWith("shark")) {
      const d = dist(guard, enemy);
      if (d <= WEAPONS[guard.weapon].reach * 0.85) return;
      const step = Math.min(d, speed * dt),
        x = guard.x + (enemy.x - guard.x) / d * step,
        z = guard.z + (enemy.z - guard.z) / d * step;
      // Defend from the deck or shore instead of jumping into the water to chase.
      if (guard.y >= 0 && this.ground(x, z, guard.zone, guard.y).height < 0) return;
    }
    this.moveToward(guard, enemy, speed, dt);
  }
  updateProjectiles(dt) {
    for (const a of this.arrows) {
      const old = { x: a.x, z: a.z, y: a.y };
      a.x += a.vx * dt;
      a.z += a.vz * dt;
      a.y += a.vy * dt;
      a.ttl -= dt;
      const hit = (x, y, z, r) => {
        const dx = a.x - old.x,
          dy = a.y - old.y,
          dz = a.z - old.z,
          l = dx * dx + dy * dy + dz * dz;
        const t = clamp(
          ((x - old.x) * dx + (y - old.y) * dy + (z - old.z) * dz) / (l || 1),
          0,
          1,
        );
        return (
          Math.hypot(
            old.x + dx * t - x,
            old.y + dy * t - y,
            old.z + dz * t - z,
          ) < r
        );
      };
      let done = false;
      for (const actor of [
        this.player,
        ...this.bots,
        ...this.guards,
        ...this.sharks,
        ...this.boats,
      ]) {
        if (
          actor.hp <= 0 ||
          actor.team === a.team ||
          actor.zone !== a.zone ||
          actor.escort
        )
          continue;
        if (
          hit(
            actor.x,
            actor.y + (actor.id.startsWith("shark") ? 0.2 : 1.1),
            actor.z,
            actor.id.startsWith("shark") ? 1.6 : 0.85,
          )
        ) {
          this.startWar(a.team, actor.team);
          this.damage(actor, a.damage);
          done = true;
          break;
        }
      }
      if (!done)
        for (const r of this.rafts) {
          if (r.team === a.team || r.zone !== a.zone || dist(r, a) > 90)
            continue;
          for (const part of r.parts) {
            const cy =
              part.y +
              (part.type === "wall" || part.type === "strong" ? 1.8 : 0.6);
            if (hit(r.x + part.x, cy, r.z + part.z, 1.5)) {
              this.startWar(a.team, r.team);
              if (a.fire) this.ignite(r, part);
              else this.damagePart(r, part, a.damage);
              done = true;
              break;
            }
          }
          if (done) break;
        }
      if (done) a.ttl = 0;
    }
    this.arrows = this.arrows.filter((a) => a.ttl > 0 && a.y > -10);
  }
  updateBots(dt) {
    for (const b of [...this.bots]) {
      b.cooldown = Math.max(0, b.cooldown - dt);
      b.age += dt;
      if (b.zone === "belly") {
        const enemy = this.nearestEnemy(b, 10);
        if (enemy && b.cooldown === 0) this.aiAttack(b, enemy);
        else this.escapeAI(b, dt);
        continue;
      }
      const r = this.rafts.find((r) => r.id === b.raftId);
      if (!r) continue;
      if (b.hostile && b.age > 80) {
        const near = this.nearestEnemy(b, 45, true);
        if (near) this.startWar(b.team, near.team);
      }
      const enemy = this.nearestEnemy(b, 60);
      if (enemy && b.age > 70) {
        if (dist(b, enemy) < WEAPONS[b.weapon].reach) this.aiAttack(b, enemy);
        else if (this.hasWheel(r) && r.zone === enemy.zone) {
          const d = dist(r, enemy);
          this.translateRaft(
            r,
            ((enemy.x - r.x) / d) * 4 * dt,
            ((enemy.z - r.z) / d) * 4 * dt,
          );
        }
        continue;
      }
      b.think -= dt;
      if (b.think > 0) continue;
      b.think = 0.65;
      let res = null, nearestDistance = Infinity;
      for (const candidate of this.resources) {
        if (!candidate.active || candidate.zone !== b.zone) continue;
        const d = (candidate.x - b.x) ** 2 + (candidate.z - b.z) ** 2;
        if ((candidate.team === b.team || (!candidate.team && d < 1700 ** 2)) && d < nearestDistance) {
          res = candidate;
          nearestDistance = d;
        }
      }
      if (res) {
        if (dist(b, res) < 4) {
          b.weapon = "hammer";
          this.harvest(res, b);
        } else {
          this.moveToward(b, res, 4, 0.65);
        }
      }
      if (
        b.wood >= 1 &&
        r.parts.filter((p) => p.type === "floor").length < 35
      ) {
        const n = r.parts.filter((p) => p.type === "floor").length;
        let found = false;
        for (let radius = 1; radius < 5 && !found; radius++)
          for (let x = -radius; x <= radius && !found; x++)
            for (let z = -radius; z <= radius && !found; z++) {
              if (Math.max(Math.abs(x), Math.abs(z)) !== radius) continue;
              const check = this.canBuild(
                "floor",
                r.x + x * 3,
                r.z + z * 3,
                0,
                r,
                { ...b, x: r.x, z: r.z, wood: b.wood },
              );
              if (check.ok) {
                b.wood--;
                this.addPart(r, "floor", check.x, check.z, 0);
                found = true;
              }
            }
        if (n >= 25 && !this.hasWheel(r) && b.wood > 0) {
          b.wood--;
          this.addPart(r, "wheel", 0, 0);
        }
      }
      if (b.gold >= 7 && !b.weapons.includes("firebow"))
        this.buy("firebow", false, b);
      else if (
        b.gold >= 3 &&
        this.guards.filter((g) => g.team === b.team).length < 4
      )
        this.buy(
          b.gold >= 10
            ? "firebow"
            : b.gold >= 7
              ? "bow"
              : b.gold >= 5
                ? "spear"
                : "sword",
          true,
          b,
        );
      b.weapon = b.weapons.at(-1);
      const botBoat = this.boats.find(
        (boat) => boat.team === b.team && !boat.target,
      );
      const nearRaft = b.hostile ? this.nearbyRaft(b, 450) : null;
      if (botBoat && nearRaft) {
        const guard = this.guards.find(
          (g) => g.team === b.team && !g.boatId && !g.boarding,
        );
        if (guard) {
          guard.boarding = botBoat.id;
          guard.raidTarget = nearRaft.id;
        }
      }
      const floorCount = r.parts.filter((p) => p.type === "floor").length;
      if (floorCount >= 25) {
        this.setSkin(b.slot % 2 ? "pirate" : "medieval", b);
        if (b.wood >= 5 && !this.boats.some((boat) => boat.team === b.team)) {
          b.wood -= 5;
          this.boats.push({
            id: this.id("boat"),
            team: b.team,
            x: r.x + 10,
            z: r.z,
            y: 0,
            zone: r.zone,
            hp: 100,
            crew: [],
            target: null,
            home: r.id,
          });
        }
        if (b.wood >= 5 && !r.parts.some((p) => p.type === "strong")) {
          b.wood -= 5;
          const floor = r.parts.find((p) => p.type === "floor");
          this.addPart(r, "strong", floor.x, floor.z - 1.5, floor.y);
        }
        if (b.wood >= 3 && !r.parts.some((p) => p.type === "stairs")) {
          b.wood -= 3;
          this.addPart(r, "stairs", 3, 0);
        }
        if (b.wood >= 2 && !r.parts.some((p) => p.type === "wall")) {
          b.wood -= 2;
          const floor = r.parts.find((p) => p.type === "floor");
          this.addPart(r, "wall", floor.x + 1.5, floor.z, floor.y, Math.PI / 2);
        }
      }
    }
  }
  aiAttack(a, target) {
    if (a.cooldown > 0 || a.weapon === "hammer" || target.hp <= 0) return;
    const w = WEAPONS[a.weapon],
      d = Math.max(0.001, dist(a, target));
    if (d > w.reach) return;
    a.cooldown = w.cooldown + 1.1;
    if (!a.weapon.includes("bow")) this.sound("swing", a);
    if (a.weapon.includes("bow")) {
      this.shoot(a, {
        x: (target.x - a.x) / d,
        z: (target.z - a.z) / d,
        y: (target.y + (target.id.startsWith("shark") ? 0.2 : 1.1) - a.y - 1.45) / d,
      });
    } else this.damage(target, w.damage);
  }
  updateGuards(dt) {
    for (const g of [...this.guards]) {
      g.cooldown = Math.max(0, g.cooldown - dt);
      if (g.boatId) {
        const enemy = this.guardEnemy(g);
        if (enemy) this.aiAttack(g, enemy);
        continue;
      }
      if (g.boarding) {
        const boat = this.boats.find((b) => b.id === g.boarding);
        if (boat && boat.zone === g.zone) {
          if (this.moveToward(g, boat, 5, dt) < 2) {
            g.boatId = boat.id;
            boat.crew.push(g.id);
            boat.target = g.raidTarget;
            g.boarding = null;
            const r = this.rafts.find((r) => r.id === boat.target);
            if (r) this.startWar(g.team, r.team);
          }
          continue;
        }
        g.boarding = null;
      }
      const owner = g.escort
        ? this.player
        : g.team === 0
          ? this.player
          : this.bots.find((b) => b.team === g.team);
      if (!owner) continue;
      if (g.zone !== owner.zone) continue;
      if (g.raidTarget && g.zone === "sea") {
        const r = this.rafts.find(
          (r) => r.id === g.raidTarget && r.parts.length && r.zone === g.zone,
        );
        if (r) {
          const target = this.guardEnemy(g, 22);
          if (target) {
            this.approachGuardEnemy(g, target, dt);
            this.aiAttack(g, target);
          } else {
            const part = r.parts.reduce((a, b) =>
                Math.hypot(r.x + a.x - g.x, r.z + a.z - g.z) <
                Math.hypot(r.x + b.x - g.x, r.z + b.z - g.z)
                  ? a
                  : b,
              ),
              point = { x: r.x + part.x, z: r.z + part.z };
            const d = this.moveToward(g, point, 4, dt);
            if (d < WEAPONS[g.weapon].reach && g.cooldown <= 0) {
              g.cooldown = 1.2;
              if (g.weapon.includes("bow"))
                this.shoot(g, {
                  x: (point.x - g.x) / (d || 1),
                  z: (point.z - g.z) / (d || 1),
                  y: (part.y + 0.5 - g.y - 1.45) / (d || 1),
                });
              else {
                this.sound("swing", g);
                this.damagePart(r, part, 25);
              }
            }
          }
          continue;
        }
        g.raidTarget = null;
      }
      const enemy = this.guardEnemy(g);
      if (enemy) {
        this.approachGuardEnemy(g, enemy, dt);
        this.aiAttack(g, enemy);
      } else if (g.zone === "belly" && owner.zone === "belly") {
        if (dist(g, owner) > 3) this.moveToward(g, owner, 5, dt);
      } else if (dist(g, owner) > 3) {
        this.moveToward(g, owner, 5, dt);
      }
      if (g.zone === "belly" && g.y >= 27 && dist(g, { x: 0, z: -65 }) < 6)
        this.escapeActor(g);
    }
  }
  updateBoats(dt) {
    for (const b of this.boats) {
      b.crew = b.crew.filter((id) =>
        this.guards.some((g) => g.id === id && g.boatId === b.id),
      );
      if (b.zone === "belly") continue;
      const target = this.rafts.find(
        (r) => r.id === b.target && r.zone === b.zone && r.parts.length,
      );
      if (target && b.crew.length) {
        const d = dist(b, target);
        if (d > 5) {
          b.x += ((target.x - b.x) / d) * 16 * dt;
          b.z += ((target.z - b.z) / d) * 16 * dt;
        } else {
          for (const id of b.crew) {
            const g = this.guards.find((g) => g.id === id);
            if (g) {
              g.boatId = null;
              g.x = b.x;
              g.z = b.z;
              g.y = 0.6;
            }
          }
          b.crew = [];
          b.target = null;
        }
      }
      for (let i = 0; i < b.crew.length; i++) {
        const g = this.guards.find((g) => g.id === b.crew[i]);
        if (g) {
          g.x = b.x + ((i % 2) - 0.5);
          g.z = b.z + Math.floor(i / 2) - 0.5;
          g.y = 0.65;
        }
      }
    }
  }
  updateSharks(dt) {
    const p = this.player;
    if (
      p.zone === "sea" &&
      p.swim > 14 &&
      this.sharks.filter((s) => dist(s, p) < 60).length < 2
    ) {
      const a = this.random() * TAU;
      this.addShark(p.x + Math.cos(a) * 30, p.z + Math.sin(a) * 30);
      this.event("Hajar! Ta dig upp på flotten eller på en ö.");
    }
    if (
      this.sharks.length < 4 &&
      this.time > 100 &&
      this.random() < dt * 0.012
    ) {
      const a = this.random() * TAU;
      this.addShark(p.x + Math.cos(a) * 50, p.z + Math.sin(a) * 50);
    }
    for (const s of [...this.sharks]) {
      s.cooldown = Math.max(0, s.cooldown - dt);
      const swimmers = [p, ...this.bots].filter(
        (a) =>
          a.zone === "sea" &&
          a.y < 0 &&
          (a === p ? p.swim > 14 : a.age > 90) &&
          dist(a, s) < 90,
      );
      const target = swimmers.sort((a, b) => dist(a, s) - dist(b, s))[0];
      if (target) {
        const d = dist(s, target);
        if (d > 1.7) {
          s.x += ((target.x - s.x) / d) * 5.2 * dt;
          s.z += ((target.z - s.z) / d) * 5.2 * dt;
        }
        s.angle = Math.atan2(target.x - s.x, target.z - s.z);
        if (d < 2.5 && s.cooldown === 0) {
          this.sound("bite", s);
          this.damage(target, 15);
          s.cooldown = 1.7;
        }
      } else {
        const r = this.rafts.find(
          (r) =>
            r.zone === "sea" &&
            r.parts.length &&
            dist(r, s) < 40 &&
            this.time > 90,
        );
        if (r) {
          const part = r.parts.reduce(
            (best, v) =>
              dist(s, { x: r.x + v.x, z: r.z + v.z }) <
              dist(s, { x: r.x + best.x, z: r.z + best.z })
                ? v
                : best,
            r.parts[0],
          );
          const t = { x: r.x + part.x, z: r.z + part.z },
            d = dist(s, t);
          s.angle = Math.atan2(t.x - s.x, t.z - s.z);
          if (d > 2) {
            s.x += ((t.x - s.x) / d) * 3 * dt;
            s.z += ((t.z - s.z) / d) * 3 * dt;
          } else if (s.cooldown === 0) {
            this.sound("bite", s);
            this.damagePart(r, part, 20);
            s.cooldown = 2;
          }
        } else {
          s.angle += dt * 0.08;
          s.x += Math.sin(s.angle) * 2 * dt;
          s.z += Math.cos(s.angle) * 2 * dt;
        }
      }
    }
    this.sharks = this.sharks.filter((s) => dist(s, p) < 1000);
  }
  warnWhale() {
    const p = this.player,
      w = this.whale;
    w.phase = "warning";
    w.timer = 14;
    w.x = p.zone === "sea" ? p.x : 0;
    // Keep the camera outside the whale until the swallowing transition.
    w.z = p.zone === "sea" ? p.z - 130 : 0;
    w.y = -60;
    w.mouth = true;
    this.event("Valen kommer!");
    this.sound("whale");
  }
  swallowRaft(r) {
    if (r.zone === "belly") return;
    const old = { x: r.x, z: r.z };
    const index = this.whale.swallows++ % 6;
    const nx = -20 + (index % 3) * 19,
      nz = 45 - Math.floor(index / 3) * 22;
    r.zone = "belly";
    r.x = nx;
    r.z = nz;
    r.returnPos = old;
    for (const a of [this.player, ...this.bots, ...this.guards])
      if (
        a.zone === "sea" &&
        dist(a, old) <
          Math.max(25, ...r.parts.map((p) => Math.hypot(p.x, p.z) + 8))
      ) {
        a.zone = "belly";
        a.x = nx + clamp(a.x - old.x, -7, 7);
        a.z = nz + clamp(a.z - old.z, -7, 7);
        a.y = 0.72;
        a.boatId = null;
        a.boarding = null;
        a.raidTarget = null;
        a.steering = null;
        if (a === this.player) {
          this.building = false;
          a.swim = 0;
          a.invulnerable = 5;
          this.event("Du är i valens mage! Ta dig ut genom blåshålet.");
        }
      }
    for (const b of this.boats)
      if (b.zone === "sea" && dist(b, old) < 90) {
        b.zone = "belly";
        b.x = nx + 8;
        b.z = nz;
        b.crew = [];
        b.target = null;
      }
  }
  escapeActor(a) {
    a.zone = "sea";
    a.x = this.whale.x + 150 + (a.team || 0) * 0.4;
    a.z = this.whale.z + 40;
    a.y = -0.9;
    a.swim = 0;
    a.boatId = null;
    a.boarding = null;
    a.raidTarget = null;
    if (a.escort) {
      a.escort = false;
      this.rescued++;
    }
    if (a === this.player) a.invulnerable = 10;
  }
  escape() {
    const p = this.player;
    const companions = this.guards.filter(
      (g) => g.zone === "belly" && (g.team === 0 || g.escort),
    );
    this.escapeActor(p);
    const r = this.raft;
    if (r?.zone === "belly") {
      r.zone = "sea";
      r.x = p.x;
      r.z = p.z;
      p.y = this.ground(p.x, p.z, "sea").height;
    }
    for (const g of companions) {
      this.escapeActor(g);
      g.x = p.x + (this.random() - 0.5) * 4;
      g.z = p.z + (this.random() - 0.5) * 4;
      g.y = p.y;
    }
    for (const b of this.boats.filter(
      (b) => b.team === 0 && b.zone === "belly",
    )) {
      b.zone = "sea";
      b.x = p.x + 9;
      b.z = p.z;
    }
    this.event("Ut genom blåshålet! Du och dina vakter är fria!");
    this.sound("escape");
    this.whale.timer = Math.max(this.whale.timer, 70);
  }
  escapeAI(a, dt) {
    const target =
      a.z > 40
        ? { x: 25, z: 40 }
        : a.x < 18 && a.y < 25
          ? { x: 25, z: a.z }
          : a.y < 29
            ? { x: 25, z: -65 }
            : { x: 0, z: -65 };
    this.moveToward(a, target, 3.5, dt);
    if (a.y >= 27 && dist(a, { x: 0, z: -65 }) < 5) {
      const team = a.team;
      this.escapeActor(a);
      const r = this.rafts.find((r) => r.team === team);
      if (r?.zone === "belly") {
        r.zone = "sea";
        r.x = a.x;
        r.z = a.z;
      }
      for (const g of this.guards.filter(
        (g) => g.team === team && g.zone === "belly" && !g.escort,
      ))
        this.escapeActor(g);
    }
  }
  updateWhale(dt) {
    const w = this.whale;
    w.timer -= dt;
    if (w.phase === "deep") {
      w.y = -95 + Math.sin(this.time * 0.05) * 10;
      if (w.timer <= 0) this.warnWhale();
    } else if (w.phase === "warning") {
      w.y = -60 + (14 - w.timer) * 4;
      if (w.timer <= 0) {
        w.phase = "feeding";
        w.timer = 18;
        w.y = -3;
        const rafts = this.rafts.filter(
          (r) => r.zone === "sea" && dist(r, w) < 145,
        );
        for (const r of rafts) this.swallowRaft(r);
        if (this.player.zone === "sea" && dist(this.player, w) < 145) {
          this.building = false;
          this.player.zone = "belly";
          this.player.x = 0;
          this.player.z = 58;
          this.player.y = 0;
          this.player.steering = null;
          this.player.swim = 0;
        }
        const other = this.rafts
          .filter((r) => r.team !== 0 && r.zone === "sea")
          .sort((a, b) => dist(a, w) - dist(b, w))[0];
        if (other) this.swallowRaft(other);
      }
    } else if (w.phase === "feeding") {
      if (w.timer <= 0) {
        w.phase = "deep";
        w.timer = 150 + this.random() * 150;
        w.mouth = false;
      }
    }
    if (this.player.zone === "belly") {
      w.nextMouth -= dt;
      if (w.nextMouth < 0) {
        w.mouth = !w.mouth;
        w.nextMouth = w.mouth ? 7 : 15 + this.random() * 10;
        if (w.mouth) {
          const other = this.rafts.find(
            (r) => r.team !== 0 && r.zone === "sea",
          );
          if (other) this.swallowRaft(other);
        }
      }
    }
    if (
      this.player.zone === "belly" &&
      this.player.y >= 27 &&
      dist(this.player, { x: 0, z: -65 }) < 5
    )
      this.escape();
  }
  update(dt) {
    if (this.mode !== "playing") return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const p = this.player;
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    if (this.time > this.current.next) {
      const a = this.random() * TAU;
      this.current = {
        x: Math.sin(a) * 0.12,
        z: Math.cos(a) * 0.12,
        next: this.time + 25 + this.random() * 25,
      };
    }
    for (const r of this.rafts) {
      if (r.zone !== "sea") continue;
      if (!this.hasWheel(r)) {
        let dx = this.current.x * dt,
          dz = this.current.z * dt;
        this.translateRaft(
          r,
          clamp(r.x + dx, -WORLD, WORLD) - r.x,
          clamp(r.z + dz, -WORLD, WORLD) - r.z,
        );
      }
      for (const part of [...r.parts]) this.updateFire(r, part, dt);
    }
    for (const r of this.rafts.filter((r) => r.zone === "belly"))
      for (const part of [...r.parts]) this.updateFire(r, part, dt);
    const ix = this.input.x,
      iz = this.input.z,
      norm = Math.max(1, Math.hypot(ix, iz)),
      dx = (Math.cos(p.yaw) * ix + Math.sin(p.yaw) * iz) / norm,
      dz = (-Math.sin(p.yaw) * ix + Math.cos(p.yaw) * iz) / norm;
    if (p.steering) {
      const r = this.rafts.find((r) => r.id === p.steering);
      if (!r || !this.hasWheel(r) || r.zone === "belly") {
        p.steering = null;
      } else {
        let rx = dx * 14 * dt,
          rz = dz * 14 * dt;
        if (
          this.islands.some(
            (i) => Math.hypot(r.x + rx - i.x, r.z + rz - i.z) < i.r + 2,
          )
        ) {
          rx = 0;
          rz = 0;
        }
        this.translateRaft(
          r,
          clamp(r.x + rx, -WORLD, WORLD) - r.x,
          clamp(r.z + rz, -WORLD, WORLD) - r.z,
        );
      }
    } else
      this.move(
        p,
        dx * (p.y < 0 ? 4.32 : 5.4) * dt,
        dz * (p.y < 0 ? 4.32 : 5.4) * dt,
      );
    if (p.zone === "sea" && p.y < 0) p.swim += dt;
    else p.swim = 0;
    for (const res of this.resources)
      if (!res.active && res.regrow > 0) {
        res.regrow -= dt;
        if (res.regrow <= 0) {
          res.hp = 100;
          res.active = true;
        }
      }
    this.aiClock += dt;
    if (this.aiClock >= 0.1) {
      const aiDt = this.aiClock;
      this.aiClock = 0;
      this.updateBots(aiDt);
      this.updateGuards(aiDt);
      this.updateBoats(aiDt);
      this.updateSharks(aiDt);
    }
    this.updateProjectiles(dt);
    this.updateWhale(dt);
    this.updateHealing();
    this.events = this.events.filter((e) => e.until > this.time);
    this.effects = this.effects.filter((e) => (e.life -= dt) > 0);
  }
  updateFire(r, p, dt) {
    if (p.burning <= 0) return;
    p.burning -= dt;
    p.spread -= dt;
    if (p.spread <= 0) {
      p.spread = 0.65;
      for (const other of r.parts)
        if (
          other !== p &&
          Math.hypot(other.x - p.x, other.z - p.z, other.y - p.y) < 4.5
        )
          this.ignite(r, other);
    }
    if (p.burning <= 0) this.damagePart(r, p, 1000);
  }
  snapshot() {
    const p = this.player;
    const round = (n) => Math.round(n * 100) / 100;
    const pos = (a) => ({ x: round(a.x), y: round(a.y || 0), z: round(a.z) });
    const nearby = this.resources
      .filter((r) => r.active && r.zone === p.zone && dist(r, p) < 80)
      .map((r) => ({ id: r.id, kind: r.kind, ...pos(r), hp: r.hp }));
    return {
      version: VERSION,
      mode: this.mode,
      coordinates:
        "x east, z south, y up; north is negative z; first-person eye = feet + 1.65",
      time: round(this.time),
      daylight: this.night ? "night" : "day",
      lighting: this.cave ? "cave" : p.zone === "belly" ? "belly" : "sea",
      player: {
        ...pos(p),
        hp: p.hp,
        wood: p.wood,
        gold: p.gold,
        weapon: p.weapon,
        weapons: p.weapons,
        skin: p.skin,
        zone: p.zone,
        yaw: round(p.yaw),
        pitch: round(p.pitch),
        swimming: p.y < 0,
        swimSeconds: round(p.swim),
        steering: p.steering,
      },
      botCount: this.bots.length,
      islandCount: this.islands.length,
      replacements: this.replacements,
      buildMode: this.building,
      selectedBuild: this.selectedBuild,
      current: this.current,
      raft: this.raft
        ? {
            id: this.raft.id,
            x: round(this.raft.x),
            z: round(this.raft.z),
            zone: this.raft.zone,
            skin: this.raft.skin,
            hasWheel: this.hasWheel(this.raft),
            pieces: this.raft.parts.map((a) => ({
              id: a.id,
              type: a.type,
              x: a.x,
              z: a.z,
              y: a.y,
              rotation: a.rotation || 0,
              hp: a.hp,
              burning: round(a.burning),
            })),
          }
        : null,
      resources: nearby,
      guards: this.guards
        .filter((g) => g.team === 0 || (g.zone === p.zone && dist(g, p) < 80))
        .map((g) => ({
          id: g.id,
          team: g.team,
          hp: g.hp,
          weapon: g.weapon,
          zone: g.zone,
          escort: g.escort,
          boatId: g.boatId,
          ...pos(g),
        })),
      boats: this.boats
        .filter((b) => b.team === 0)
        .map((b) => ({
          id: b.id,
          hp: b.hp,
          zone: b.zone,
          crew: b.crew,
          target: b.target,
          ...pos(b),
        })),
      bots: this.bots
        .filter((b) => b.zone === p.zone && dist(b, p) < 180)
        .map((b) => ({
          id: b.id,
          hp: b.hp,
          team: b.team,
          weapon: b.weapon,
          ...pos(b),
        })),
      sharks: this.sharks
        .filter((s) => p.zone === "sea" && dist(s, p) < 100)
        .map((s) => ({ id: s.id, hp: s.hp, ...pos(s) })),
      whale: {
        phase: this.whale.phase,
        seconds: round(this.whale.timer),
        hp: "infinite",
        mouthOpen: this.whale.mouth,
        ...pos(this.whale),
      },
      mission: p.zone === "belly" ? "Ta dig ut genom blåshålet!" : null,
      rescued: this.rescued,
      arrows: this.arrows.length,
      toast: this.events.at(-1)?.message || null,
    };
  }
}
