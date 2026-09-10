import { Simulation, BUILD, WEAPONS, clamp, dist } from "./sim.js?v=20260910-1";
import { View } from "./view.js?v=20260910-1";
const $ = (id) => document.getElementById(id);
let sim = new Simulation(),
  view,
  lastTime = performance.now(),
  manual = false,
  held = false,
  dispatchGuard = null,
  keys = new Set(),
  look = null,
  stickPointer = null,
  stickInput = { x: 0, z: 0 };
const icons = {
  floor: "▦",
  wall: "▥",
  stairs: "▟",
  strong: "▣",
  boat: "⛵",
  wheel: "☸",
};
const order = ["hammer", "sword", "spear", "bow", "firebow"];
try {
  view = new View($("game"), sim);
  $("loading").textContent = "Ett spel av Agust";
} catch (error) {
  $("error").hidden = false;
  $("error").textContent =
    "Havet kunde inte starta. Ladda om sidan och försök igen. Om det behövs, öppna spelet i Safari. " +
    error.message;
  throw error;
}
function clearInput() {
  held = false;
  keys.clear();
  stickInput = { x: 0, z: 0 };
  stickPointer = null;
  look = null;
  $("stick").style.transform = "";
  sim.input = { x: 0, z: 0 };
}
function newGame() {
  clearInput();
  for (const g of view.models.values()) view.disposeModel(g);
  for (const g of view.staticModels.values()) view.disposeModel(g);
  view.models.clear();
  view.staticModels.clear();
  sim = new Simulation();
  view.sim = sim;
  sim.start();
  renderUI();
}
$("start").onclick = () => {
  clearInput();
  sim.start();
  renderUI();
};
$("retry").onclick = newGame;
$("restart").onclick = newGame;
function setPause() {
  if (sim.mode === "playing") {
    sim.mode = "paused";
    clearInput();
    renderUI();
  }
}
$("pause").onclick = setPause;
$("resume").onclick = () => {
  sim.mode = "playing";
  renderUI();
};
$("fullscreen").onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
};
function toggleBuild() {
  if (sim.mode !== "playing") return;
  sim.building = !sim.building;
  sim.player.steering = null;
  held = false;
  renderUI();
}
$("build").onclick = toggleBuild;
$("close-build").onclick = () => {
  sim.building = false;
  renderUI();
};
$("shop").onclick = () => {
  if (sim.mode !== "playing") return;
  sim.mode = "shop";
  clearInput();
  renderShop();
  renderUI();
};
$("close-shop").onclick = () => {
  sim.mode = "playing";
  renderUI();
};
function switchWeapon() {
  const owned = order.filter((w) => sim.player.weapons.includes(w)),
    i = owned.indexOf(sim.player.weapon);
  sim.player.weapon = owned[(i + 1) % owned.length];
  renderUI();
}
$("switch").onclick = switchWeapon;
function hit() {
  if (sim.building) {
    const p = view.buildPoint();
    if (p) sim.build(sim.selectedBuild, p.x, p.z, p.y);
    return;
  }
  const target = view.pick();
  const direction = view.camera.getWorldDirection(view.tmp);
  sim.attack(target, { x: direction.x, y: direction.y, z: direction.z });
  renderUI();
}
$("hit").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (sim.mode !== "playing") return;
  held = true;
  $("hit").setPointerCapture(e.pointerId);
  hit();
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("hit").addEventListener(event, () => (held = false));
$("dispatch").onclick = () => {
  if (dispatchGuard) sim.dispatchGuard(dispatchGuard);
  renderUI();
};
for (const [type, item] of Object.entries(BUILD)) {
  const button = document.createElement("button");
  button.dataset.build = type;
  button.innerHTML = `<span>${icons[type]} &nbsp;${item.name}</span><small>${item.cost} trä</small>`;
  button.onclick = () => {
    sim.selectedBuild = type;
    renderUI();
  };
  $("build-items").append(button);
}
function renderShop() {
  const p = sim.player;
  $("shop-money").textContent = `Du har ${p.gold} guldklimpar`;
  $("shop-items").replaceChildren();
  for (const type of ["sword", "spear", "bow", "firebow"]) {
    const w = WEAPONS[type],
      row = document.createElement("div");
    row.className = "shop-row";
    const owned = p.weapons.includes(type);
    row.innerHTML = `<strong>${w.icon} ${w.name}</strong><small>${type === "spear" ? "Längre räckvidd" : type === "bow" ? "Oändligt med pilar" : type === "firebow" ? "Eldpilar · oändligt med pilar" : "Vanliga svärdslag"}</small><div class="buy-actions"></div>`;
    const buy = document.createElement("button");
    buy.dataset.buy = type;
    buy.textContent = owned ? "Äger" : `Vapen · ${w.cost} guld`;
    buy.disabled = owned || p.gold < w.cost;
    buy.onclick = () => {
      sim.buy(type);
      renderShop();
      renderUI();
    };
    const guard = document.createElement("button");
    guard.dataset.guard = type;
    guard.textContent = `Vakt · ${w.guard} guld`;
    guard.disabled = p.gold < w.guard;
    guard.onclick = () => {
      sim.buy(type, true);
      renderShop();
      renderUI();
    };
    row.querySelector(".buy-actions").append(buy, guard);
    $("shop-items").append(row);
  }
  const floors = sim.raft?.parts.filter((p) => p.type === "floor").length || 0;
  $("skin-items").innerHTML =
    `<p class="skin-title">${floors >= 25 ? "Välj skin till din stora flotte" : "Piratskin och medeltidsskin · bygg en stor flotte med 25 plattor"}</p>`;
  for (const [skin, label] of [
    ["pirate", "Piratskin"],
    ["medieval", "Medeltidsskin"],
  ]) {
    const button = document.createElement("button");
    button.textContent = (p.skin === skin ? "✓ " : "") + label;
    button.dataset.skin = skin;
    button.disabled = floors < 25;
    button.onclick = () => {
      sim.setSkin(skin);
      renderShop();
    };
    $("skin-items").append(button);
  }
}
const joystick = $("joystick");
joystick.addEventListener("pointerdown", (e) => {
  if (sim.mode !== "playing" || stickPointer !== null) return;
  e.preventDefault();
  stickPointer = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  updateStick(e);
});
function updateStick(e) {
  const r = joystick.getBoundingClientRect(),
    dx = e.clientX - (r.left + r.width / 2),
    dy = e.clientY - (r.top + r.height / 2),
    limit = r.width * 0.32,
    d = Math.hypot(dx, dy),
    scale = Math.min(1, limit / (d || 1));
  stickInput = { x: (dx * scale) / limit, z: (dy * scale) / limit };
  $("stick").style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
}
joystick.addEventListener("pointermove", (e) => {
  if (e.pointerId === stickPointer) updateStick(e);
});
for (const evt of ["pointerup", "pointercancel", "lostpointercapture"])
  joystick.addEventListener(evt, (e) => {
    if (e.pointerId === stickPointer) {
      stickPointer = null;
      stickInput = { x: 0, z: 0 };
      $("stick").style.transform = "";
    }
  });
$("game").addEventListener("pointerdown", (e) => {
  if (sim.mode !== "playing" || look) return;
  e.preventDefault();
  look = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    startX: e.clientX,
    startY: e.clientY,
    moved: 0,
  };
  $("game").setPointerCapture(e.pointerId);
});
$("game").addEventListener("pointermove", (e) => {
  if (!look || look.id !== e.pointerId) return;
  const dx = e.clientX - look.x,
    dy = e.clientY - look.y;
  look.moved += Math.abs(dx) + Math.abs(dy);
  if (look.moved > 5) {
    sim.player.yaw -= dx * 0.0045;
    sim.player.pitch = clamp(sim.player.pitch - dy * 0.004, -1.3, 1.25);
  }
  look.x = e.clientX;
  look.y = e.clientY;
});
$("game").addEventListener("pointerup", (e) => {
  if (!look || look.id !== e.pointerId) return;
  if (sim.building && look.moved < 9) {
    const point = view.buildPoint(e.clientX, e.clientY);
    if (point) sim.build(sim.selectedBuild, point.x, point.z, point.y);
    else sim.event("Tryck på vattnet intill flotten eller på en platta.");
  }
  look = null;
});
$("game").addEventListener("pointercancel", () => (look = null));
window.addEventListener("keydown", (e) => {
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "Tab",
    ].includes(e.code)
  )
    e.preventDefault();
  if (e.code === "Escape") {
    if (sim.mode === "shop") $("close-shop").click();
    else if (sim.building) $("close-build").click();
    else if (sim.mode === "paused") $("resume").click();
    else setPause();
    return;
  }
  if (sim.mode === "menu" && e.code === "Enter") $("start").click();
  if (sim.mode !== "playing") return;
  if (!e.repeat) {
    if (e.code === "KeyB") toggleBuild();
    if (e.code === "KeyE" || e.code === "Tab") switchWeapon();
    if (e.code === "KeyP") $("shop").click();
    if (e.code === "KeyF") $("fullscreen").click();
    if (e.code === "Space") {
      held = true;
      hit();
    }
  }
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "Space") held = false;
});
window.addEventListener("blur", () => {
  clearInput();
  if (sim.mode === "playing") setPause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInput();
    if (sim.mode === "playing") setPause();
  }
});
window.addEventListener("resize", () => view.resize());
function renderUI() {
  const p = sim.player;
  $("menu").hidden = sim.mode !== "menu";
  $("hud").hidden = sim.mode === "menu" || sim.mode === "dead";
  $("shop-screen").hidden = sim.mode !== "shop";
  $("pause-screen").hidden = sim.mode !== "paused";
  $("dead-screen").hidden = sim.mode !== "dead";
  $("gallery").hidden = !sim.building || sim.mode !== "playing";
  $("build").classList.toggle("active", sim.building);
  $("hp").textContent = Math.ceil(p.hp);
  $("hp-fill").style.width = p.hp + "%";
  $("wood").textContent = p.wood;
  $("gold").textContent = p.gold;
  $("weapon-name").textContent = WEAPONS[p.weapon].name;
  $("weapon-icon").textContent = WEAPONS[p.weapon].icon;
  $("daylight").textContent = sim.night ? "Natt" : "Dag";
  let a = ((((-p.yaw * 180) / Math.PI) % 360) + 360) % 360;
  $("compass").textContent = ["N", "NÖ", "Ö", "SÖ", "S", "SV", "V", "NV"][
    Math.round(a / 45) % 8
  ];
  $("warning").hidden = sim.whale.phase !== "warning" || p.zone === "belly";
  $("mission").hidden = p.zone !== "belly";
  $("mode-label").textContent = p.steering
    ? "STYR FLOTTEN"
    : p.zone === "belly"
      ? "VALENS MAGE"
      : sim.cave
        ? "GULDGRUVAN"
        : p.y < 0
          ? "SIMMAR"
          : sim.ground(p.x, p.z, p.zone, p.y).raft
            ? "PÅ FLOTTEN"
            : "PÅ ÖN";
  const event = sim.events.at(-1);
  $("toast").hidden = !event;
  if (event) $("toast").textContent = event.message;
  for (const b of $("build-items").children) {
    b.classList.toggle("selected", b.dataset.build === sim.selectedBuild);
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.build === sim.selectedBuild),
    );
  }
  dispatchGuard =
    sim.guards
      .filter((g) => sim.canDispatch(g))
      .sort((a, b) => dist(a, p) - dist(b, p))[0] || null;
  $("dispatch").hidden =
    !dispatchGuard || sim.building || sim.mode !== "playing";
  if (sim.mode !== "playing") return;
  const target = view.pick();
  let context = "";
  if (p.steering) context = "Styr med spaken · Slå för att släppa ratten";
  else if (sim.building) context = "Tryck där du vill bygga";
  else if (target && target.distance < 8) {
    if (target.kind === "resource") {
      const r = target.entity,
        name = {
          sofa: "Soffa · 2 trä",
          table: "Bord · 1 trä",
          palm: "Palm · 1 trä",
          ore: "Guld",
          chest: "Kista · 5 guldklimpar",
        }[r.kind];
      context = `${name} · ${Math.max(0, r.hp)} liv · Använd hammaren`;
    } else if (target.kind === "part") {
      context =
        BUILD[target.entity.type].name +
        ` · ${Math.ceil(target.entity.hp)} liv`;
      if (target.entity.type === "wheel" && target.raft.team === 0)
        context = "Slå vid ratten för att styra";
    } else if (
      target.kind === "guard" &&
      target.entity.team !== 0 &&
      p.zone === "belly" &&
      p.weapon === "hammer"
    )
      context = "Hjälp vakten · Slå med hammaren";
    else if (target.kind === "guard" || target.kind === "bot")
      context = `${target.entity.team === 0 ? "Din vakt" : "Annan besättning"} · ${target.entity.hp} liv`;
    else if (target.kind === "shark") context = `Haj · ${target.entity.hp} liv`;
    else if (target.kind === "boat")
      context = "Liten båt · " + target.entity.hp + " liv";
  }
  $("context").textContent = context;
}
function tick(dt) {
  sim.input.x =
    stickInput.x +
    (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
    (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  sim.input.z =
    stickInput.z +
    (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
    (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  if (held && sim.player.cooldown <= 0 && !sim.building) hit();
  sim.update(dt);
}
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (!manual) tick(dt);
  view.update(dt);
  renderUI();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.render_game_to_text = () => JSON.stringify(sim.snapshot());
window.advanceTime = (ms) => {
  manual = true;
  const frames = Math.max(1, Math.ceil(ms / (1000 / 60)));
  for (let i = 0; i < frames; i++) tick(ms / frames / 1000);
  view.update(0);
  renderUI();
};
window.__waterwar = {
  get sim() {
    return sim;
  },
  get view() {
    return view;
  },
  newGame,
  render: () => {
    view.update(0);
    renderUI();
  },
  resumeClock: () => {
    manual = false;
    lastTime = performance.now();
  },
};
