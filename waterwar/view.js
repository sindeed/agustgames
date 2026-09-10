import * as THREE from "../war-of-kingdoms/vendor/three.module.js";
import { TAU, dist, BUILD, WEAPONS, clamp } from "./sim.js?v=20260910-3";
import { actorMotion } from "./actor-motion.js?v=20260910-3";
const colors = [
  0x348ee5, 0xc84a44, 0x885cc5, 0xe5a340, 0x3aaf81, 0xda769a, 0x5393aa,
];
export class View {
  constructor(canvas, sim) {
    this.sim = sim;
    this.canvas = canvas;
    this.models = new Map();
    this.staticModels = new Map();
    this.nearTimer = 0;
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.tmp = new THREE.Vector3();
    this.interactables = [];
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: !!navigator.webdriver,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x73c9f4);
    this.scene.fog = new THREE.Fog(0xaddff0, 250, 1150);
    this.camera = new THREE.PerspectiveCamera(73, 1, 0.035, 1800);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.world = new THREE.Group();
    this.belly = new THREE.Group();
    this.scene.add(this.world, this.belly);
    this.hemi = new THREE.HemisphereLight(0xc8efff, 0x405b52, 1.85);
    this.sun = new THREE.DirectionalLight(0xffefd1, 2.65);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -45,
      right: 45,
      top: 45,
      bottom: -45,
      near: 1,
      far: 160,
    });
    this.sun.shadow.bias = -0.0003;
    this.fill = new THREE.DirectionalLight(0x78bfff, 0.55);
    this.fill.position.set(32, 20, 40);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.fill);
    this.lantern = new THREE.PointLight(0xffd9af, 0, 35, 1);
    this.scene.add(this.lantern);
    this.materials = {};
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(1, 12, 8),
      rock: new THREE.DodecahedronGeometry(1, 0),
    };
    this.initMaterials();
    this.makeSea();
    this.makeBelly();
    this.whale = this.makeWhale();
    this.world.add(this.whale);
    this.makeSky();
    this.weaponRig = new THREE.Group();
    this.camera.add(this.weaponRig);
    this.weaponRig.position.set(0.5, -0.48, -0.92);
    this.weaponName = "";
    this.ghost = new THREE.Mesh(
      new THREE.BoxGeometry(2.96, 0.14, 2.96),
      new THREE.MeshBasicMaterial({
        color: 0x8cffb4,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    this.scene.add(this.ghost);
    this.ghost.visible = false;
    this.resize();
  }
  mat(name, color, options = {}) {
    return (
      this.materials[name] ??
      (this.materials[name] = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.83,
        ...options,
      }))
    );
  }
  initMaterials() {
    this.mat("wood", 0xc17a37, { map: this.woodTexture() });
    this.mat("darkWood", 0x5e3521);
    this.mat("sand", 0xeed68e);
    this.mat("grass", 0x8bd56d);
    this.mat("leaf", 0x48b14f);
    this.mat("leafLight", 0x91c957);
    this.mat("rock", 0x667783);
    this.mat("cave", 0x525e6d);
    this.mat("gold", 0xffcf3c, { roughness: 0.28, metalness: 0.62 });
    this.mat("iron", 0xb8c8d1, { roughness: 0.33, metalness: 0.72 });
    this.mat("darkIron", 0x263746, { roughness: 0.48, metalness: 0.5 });
    this.mat("skin", 0xefb98e);
    this.mat("rope", 0xdbba7a);
    this.mat("sofa", 0x328a93);
    this.mat("belly", 0x805d79, { side: THREE.BackSide, roughness: 1 });
    this.mat("bellyFloor", 0x947d91);
    this.mat("rib", 0xc391a1);
    this.mat("ramp", 0xb7a0b3);
    this.mat("shark", 0x527b94, { roughness: 0.45 });
    this.mat("whale", 0x275274, { roughness: 0.45 });
    this.mat("whaleBelly", 0x6f9eaa);
    this.mat("white", 0xf1f3df);
    this.mat("black", 0x101d29);
    this.mat("flame", 0xff981a, { emissive: 0xff5210, emissiveIntensity: 2 });
  }
  woodTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#e3bf80";
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 36; i++) {
      x.strokeStyle = i % 3 ? "#a16b2630" : "#6b432322";
      x.lineWidth = i % 4 === 0 ? 2 : 1;
      x.beginPath();
      const y = i * 3.6;
      x.moveTo(0, y);
      x.bezierCurveTo(32, y + 3, 84, y - 3, 128, y);
      x.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(
      geometry,
      typeof material === "string" ? this.materials[material] : material,
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(parent, x, y, z, w, h, d, mat) {
    const m = this.mesh(this.geometries.box, mat, parent, x, y, z);
    m.scale.set(w, h, d);
    return m;
  }
  sphere(parent, x, y, z, sx, sy, sz, mat) {
    const m = this.mesh(this.geometries.sphere, mat, parent, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }
  cylinder(parent, x, y, z, r, h, mat, segments = 8) {
    const key = `c${r}-${h}-${segments}`;
    const geo =
      this.geometries[key] ??
      (this.geometries[key] = new THREE.CylinderGeometry(r, r, h, segments));
    return this.mesh(geo, mat, parent, x, y, z);
  }
  group(parent) {
    const g = new THREE.Group();
    if (parent) parent.add(g);
    return g;
  }
  makeSea() {
    const geometry = new THREE.PlaneGeometry(3000, 3000, 140, 140);
    geometry.rotateX(-Math.PI / 2);
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        light: { value: 1 },
        direction: { value: new THREE.Vector2(0.6, 0.7) },
        eye: { value: new THREE.Vector3() },
      },
      vertexShader: `uniform float time; uniform vec2 direction; varying vec3 vWorld; varying float vWave; void main(){vec3 p=position;vec4 w=modelMatrix*vec4(p,1.0);float a=sin(dot(w.xz,direction)*.22-time*1.3);float b=sin(w.x*.15-w.z*.28+time*.8);p.y+=a*.14+b*.08;vWave=a+b*.3;vWorld=(modelMatrix*vec4(p,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
      fragmentShader: `uniform float light; uniform float time;uniform vec3 eye; varying vec3 vWorld;varying float vWave;void main(){vec3 base=mix(vec3(.025,.29,.44),vec3(.07,.57,.65),clamp(vWave*.38+.45,0.,1.));float small=sin(vWorld.x*2.4+sin(vWorld.z*.9)+time)*sin(vWorld.z*1.7+time*.7);float glint=pow(max(0.,small),22.);base+=vec3(.32,.46,.39)*glint*.48;float foam=smoothstep(1.20,1.3,vWave);base=mix(base,vec3(.57,.83,.80),foam*.6);float fog=clamp((distance(eye.xz,vWorld.xz)-190.)/850.,0.,1.);base=mix(base,vec3(.43,.73,.79),fog);base*=.38+light*.62;gl_FragColor=vec4(base,.94);}`,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
    this.sea = new THREE.Mesh(geometry, this.waterMaterial);
    this.sea.position.y = -0.05;
    this.world.add(this.sea);
  }
  makeSky() {
    this.sky = this.group(this.world);
    const cloud = this.mat("cloud", 0xf3fbff, { roughness: 1 });
    for (let i = 0; i < 17; i++) {
      const g = this.group(this.sky);
      g.position.set(
        Math.sin(i * 2.4) * 650,
        80 + (i % 3) * 19,
        Math.cos(i * 2.4) * 650,
      );
      for (let j = 0; j < 3; j++) {
        const c = this.sphere(g, j * 17, 0, 0, 23, 10 + (j % 2) * 5, 13, cloud);
        c.castShadow = false;
      }
    }
    this.sunOrb = this.sphere(
      this.sky,
      -300,
      260,
      -600,
      25,
      25,
      25,
      new THREE.MeshBasicMaterial({ color: 0xfff0bb }),
    );
  }
  makeIsland(i) {
    const g = this.group(this.world);
    g.position.set(i.x, 0, i.z);
    const sand = this.cylinder(g, 0, -0.7, 0, i.r, 2, "sand", 30);
    sand.scale.y = 1;
    this.cylinder(g, 0, 0.52, 0, i.r * 0.9, 1.1, "sand", 30);
    this.cylinder(g, 0, 1, 0, i.r * 0.67, 0.25, "grass", 22);
    for (let j = 0; j < 7; j++) {
      const a = j * 2.4;
      const rock = this.mesh(
        this.geometries.rock,
        "rock",
        g,
        Math.cos(a) * i.r * 0.83,
        1.1,
        Math.sin(a) * i.r * 0.82,
      );
      rock.scale.set(1.5 + (j % 2), 1.7 + (j % 3) * 0.5, 2);
      rock.rotation.set(j, j * 0.4, 0);
    }
    if (i.cave) {
      this.cylinder(g, 0, 1.145, -7, 19, 0.035, "bellyFloor", 24);
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 7;
        const b = this.mesh(
          this.geometries.rock,
          "cave",
          g,
          Math.cos(a) * 19,
          6 + Math.sin(a) * 2,
          -7 - Math.sin(a) * 16,
        );
        b.scale.set(8, 10, 8);
      }
      const ceiling = this.sphere(g, 0, 10, -9, 23, 9, 24, "cave");
      this.box(g, -16, 5, 6, 4, 10, 5, "darkWood");
      this.box(g, 16, 5, 6, 4, 10, 5, "darkWood");
      this.box(g, 0, 10, 6, 35, 2, 5, "wood");
      for (const x of [-13, 13]) {
        const torch = this.sphere(g, x, 5.5, 8, 0.22, 0.55, 0.22, "flame");
        torch.castShadow = false;
      }
      this.makeSign(g, "GULDGRUVAN", 0, 9, 9, 5);
      g.userData.cave = true;
    }
    return g;
  }
  makeSign(parent, text, x, y, z, size = 2) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#132e3e";
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = "#d8bc7e";
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, 502, 86);
    ctx.fillStyle = "#ffdea1";
    ctx.font = "bold 38px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 49);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const plane = this.mesh(
      new THREE.PlaneGeometry(size * 3, size * 0.56),
      new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }),
      parent,
      x,
      y,
      z,
    );
    return plane;
  }
  makeResource(r) {
    const g = this.group();
    g.userData.target = { kind: "resource", entity: r };
    if (r.kind === "palm") {
      for (let j = 0; j < 5; j++) {
        const trunk = this.cylinder(
          g,
          j * 0.08,
          0.9 + j * 1.15,
          0,
          0.32 - j * 0.025,
          1.3,
          "wood",
          7,
        );
        trunk.rotation.z = -0.06;
      }
      for (let j = 0; j < 7; j++) {
        const a = (j * TAU) / 7;
        const leaf = this.mesh(
          new THREE.ConeGeometry(1, 5.4, 3),
          "leaf",
          g,
          Math.sin(a) * 1.4,
          6.1,
          Math.cos(a) * 1.4,
        );
        leaf.rotation.set(Math.cos(a) * 1.1, a, Math.sin(a) * 1.1);
        leaf.scale.set(1, 0.8, 0.3);
      }
      for (let j = 0; j < 3; j++)
        this.sphere(
          g,
          Math.sin(j * 2) * 0.3,
          5.4,
          Math.cos(j * 2) * 0.3,
          0.25,
          0.28,
          0.25,
          "darkWood",
        );
    } else if (r.kind === "sofa") {
      this.box(g, 0, 0.48, 0, 2.6, 0.5, 1.15, "darkWood");
      this.box(g, 0, 0.85, 0.23, 2.5, 0.45, 0.96, "sofa");
      this.box(g, 0, 1.25, -0.45, 2.55, 0.95, 0.3, "sofa");
      for (const x of [-1.23, 1.23])
        this.box(g, x, 1, 0, 0.24, 0.65, 1.18, "sofa");
      for (const x of [-0.95, 0.95])
        for (const z of [-0.4, 0.4])
          this.box(g, x, 0.25, z, 0.14, 0.48, 0.14, "darkWood");
    } else if (r.kind === "table") {
      this.box(g, 0, 1.08, 0, 1.6, 0.2, 1.35, "wood");
      for (const x of [-0.6, 0.6])
        for (const z of [-0.48, 0.48])
          this.box(g, x, 0.52, z, 0.15, 1, 0.15, "darkWood");
    } else if (r.kind === "ore") {
      const rock = this.mesh(this.geometries.rock, "rock", g, 0, 0.4, 0);
      rock.scale.set(0.85, 0.6, 0.9);
      for (let i = 0; i < 3; i++) {
        const gold = this.box(
          g,
          Math.sin(i * 2.3) * 0.45,
          0.85 + (i % 2) * 0.15,
          Math.cos(i * 2.3) * 0.4,
          0.55,
          0.28,
          0.36,
          "gold",
        );
        gold.rotation.y = i * 0.6;
      }
    } else {
      this.box(g, 0, 0.45, 0, 1.6, 0.9, 1.15, "wood");
      this.box(g, 0, 0.93, 0, 1.65, 0.18, 1.2, "darkWood");
      for (const x of [-0.58, 0.58])
        this.box(g, x, 0.5, 0.6, 0.12, 0.92, 0.04, "gold");
      this.box(g, 0, 0.65, 0.62, 0.22, 0.25, 0.1, "gold");
    }
    return g;
  }
  makePart(p, raft) {
    const g = this.group();
    g.userData.target = { kind: "part", entity: p, raft };
    if (p.type === "floor") {
      for (let j = 0; j < 5; j++)
        this.box(g, (j - 2) * 0.58, 0.45, 0, 0.55, 0.46, 2.98, "wood");
      for (const z of [-1.05, 1.05]) {
        this.box(g, 0, 0.15, z, 3, 0.19, 0.18, "darkWood");
        this.box(g, 0, 0.697, z, 2.95, 0.025, 0.045, "rope");
      }
    } else if (p.type === "wall" || p.type === "strong") {
      for (let j = 0; j < 5; j++)
        this.box(
          g,
          (j - 2) * 0.58,
          2,
          0,
          0.55,
          2.5,
          0.22,
          p.type === "strong" ? "darkWood" : "wood",
        );
      for (const y of [1.1, 2.7])
        this.box(
          g,
          0,
          y,
          0.15,
          3,
          0.14,
          0.09,
          p.type === "strong" ? "iron" : "darkWood",
        );
      if (p.type === "strong")
        for (const x of [-1.2, 0, 1.2])
          for (const y of [1.1, 2.7])
            this.sphere(g, x, y, 0.23, 0.065, 0.065, 0.055, "gold");
    } else if (p.type === "stairs") {
      for (let j = 0; j < 8; j++)
        this.box(
          g,
          0,
          0.72 + ((j + 1) * 3) / 16,
          1.5 - ((j + 0.5) * 3) / 8,
          2.9,
          ((j + 1) * 3) / 8,
          0.37,
          "wood",
        );
      for (const x of [-1.3, 1.3]) {
        const support = this.box(g, x, 2, -0.1, 0.14, 4.1, 0.18, "darkWood");
        support.rotation.x = -Math.PI / 4;
      }
    } else if (p.type === "wheel") {
      this.box(g, 0, 1.22, 0, 0.23, 1.05, 0.28, "darkWood");
      const wheel = this.group(g);
      wheel.position.set(0, 1.9, 0);
      this.mesh(new THREE.TorusGeometry(0.53, 0.065, 8, 18), "wood", wheel);
      for (let i = 0; i < 6; i++) {
        const spoke = this.box(wheel, 0, 0, 0, 0.065, 1.4, 0.07, "wood");
        spoke.rotation.z = (i * Math.PI) / 3;
      }
      this.sphere(wheel, 0, 0, 0.05, 0.14, 0.14, 0.12, "gold");
      g.userData.wheel = wheel;
    }
    g.position.set(p.x, p.y, p.z);
    return g;
  }
  makeBoat(b) {
    const g = this.group();
    g.userData.target = { kind: "boat", entity: b };
    this.box(g, 0, 0.25, 0, 2.5, 0.5, 4.1, "darkWood");
    this.box(g, 0, 0.55, 0, 2.1, 0.22, 3.8, "wood");
    for (const x of [-1.2, 1.2])
      this.box(g, x, 0.7, 0, 0.15, 0.75, 4.3, "wood");
    for (const z of [-1.9, 1.9])
      this.box(g, 0, 0.7, z, 2.4, 0.65, 0.16, "wood");
    this.box(g, 0, 0.55, 0, 2.2, 0.22, 0.5, "darkWood");
    this.cylinder(g, 0, 2, 1, 0.055, 3, "darkWood");
    const sail = this.mesh(
      new THREE.PlaneGeometry(1.4, 1.6),
      this.mat(`team${b.team}`, colors[b.team % colors.length], {
        side: THREE.DoubleSide,
      }),
      g,
      0.65,
      2.4,
      1,
    );
    return g;
  }
  makeWeapon(type, parent) {
    const g = this.group(parent);
    if (type === "hammer") {
      this.box(g, 0, 0.25, 0, 0.1, 1, 0.1, "darkWood");
      this.box(g, 0, 0.77, 0, 0.7, 0.34, 0.32, "iron");
      this.box(g, 0, 0.77, 0, 0.18, 0.4, 0.36, "gold");
    } else if (type === "sword") {
      this.box(g, 0, 0.68, 0, 0.14, 1.5, 0.075, "iron");
      this.box(g, 0, -0.1, 0, 0.65, 0.1, 0.17, "gold");
      this.box(g, 0, -0.4, 0, 0.16, 0.5, 0.16, "darkWood");
    } else if (type === "spear") {
      this.box(g, 0, 0.5, 0, 0.08, 2.2, 0.08, "wood");
      this.mesh(new THREE.ConeGeometry(0.13, 0.48, 5), "iron", g, 0, 1.8, 0);
    } else {
      const arc = this.mesh(
        new THREE.TorusGeometry(0.58, 0.06, 7, 22, Math.PI * 1.45),
        type === "firebow" ? "darkWood" : "wood",
        g,
      );
      arc.rotation.z = -Math.PI * 0.73;
      const pts = [
        new THREE.Vector3(-0.42, -0.42, 0),
        new THREE.Vector3(0.02, 0, 0),
        new THREE.Vector3(-0.42, 0.42, 0),
      ];
      g.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0xe9e4d4 }),
        ),
      );
      this.box(g, 0, 0, 0, 0.025, 1.35, 0.025, "wood").rotation.z = Math.PI / 2;
      if (type === "firebow")
        this.sphere(g, 0.65, 0, 0, 0.12, 0.1, 0.09, "flame");
    }
    return g;
  }
  makeActor(a, kind) {
    const g = this.group();
    g.userData.target = { kind, entity: a };
    const cloth = this.mat(`team${a.team}`, colors[a.team % colors.length]);
    const dark = this.mat(
      `dark${a.team}`,
      new THREE.Color(colors[a.team % colors.length]).multiplyScalar(0.55),
    );
    const body = this.group(g);
    this.box(body, 0, 1.02, 0, 0.62, 0.87, 0.38, cloth);
    this.sphere(body, 0, 1.71, 0, 0.28, 0.29, 0.28, "skin");
    this.sphere(
      body,
      0,
      1.88,
      0.015,
      0.295,
      0.15,
      0.29,
      a.skin === "medieval" ? "iron" : "darkIron",
    );
    for (const x of [-0.1, 0.1])
      this.sphere(body, x, 1.75, -0.262, 0.028, 0.034, 0.024, "black");
    const [left, right] = [-0.43, 0.43].map((x) => {
      const shoulder = this.group(body);
      shoulder.position.set(x, 1.42, 0);
      this.box(shoulder, 0, -0.37, 0, 0.2, 0.83, 0.22, cloth);
      return shoulder;
    });
    const legs = [-0.16, 0.16].map((x) => {
      const hip = this.group(body);
      hip.position.set(x, 0.68, 0);
      this.box(hip, 0, -0.16, 0, 0.23, 0.32, 0.29, dark);
      const knee = this.group(hip);
      knee.position.y = -0.32;
      this.box(knee, 0, -0.17, 0, 0.23, 0.34, 0.29, dark);
      this.box(knee, 0, -0.30, -0.04, 0.25, 0.1, 0.36, "darkIron");
      hip.userData.knee = knee;
      return hip;
    });
    g.userData.legs = legs;
    g.userData.arms = [left, right];
    const weapon = this.makeWeapon(a.weapon, right);
    weapon.position.set(0.06, -0.79, -0.15);
    weapon.scale.setScalar(0.58);
    weapon.rotation.z = -0.3;
    if (kind === "bot") {
      this.mesh(
        new THREE.ConeGeometry(0.24, 0.32, 5),
        "gold",
        body,
        0,
        2.08,
        0,
      );
    }
    if (a.skin === "pirate") {
      this.box(body, 0, 1.96, 0, 0.9, 0.12, 0.5, "darkIron");
      this.box(body, -0.11, 1.77, -0.28, 0.13, 0.12, 0.025, "black");
    }
    g.userData.weapon = a.weapon;
    g.userData.skin = a.skin;
    return g;
  }
  makeShark() {
    const g = this.group();
    this.sphere(g, 0, -0.1, 0, 0.72, 0.6, 2.1, "shark");
    this.sphere(g, 0, -0.28, 1.1, 0.58, 0.27, 1, "white");
    const fin = this.mesh(
      new THREE.ConeGeometry(0.55, 1.2, 3),
      "shark",
      g,
      0,
      0.6,
      -0.2,
    );
    fin.scale.z = 0.2;
    for (const s of [-1, 1]) {
      const side = this.mesh(
        new THREE.ConeGeometry(0.5, 1.6, 3),
        "shark",
        g,
        s * 0.8,
        -0.18,
        0.4,
      );
      side.rotation.z = s * 1.1;
      side.scale.z = 0.25;
      this.sphere(g, s * 0.53, 0.08, 1.25, 0.095, 0.095, 0.065, "black");
    }
    const tail = this.mesh(
      new THREE.ConeGeometry(0.7, 1.8, 3),
      "shark",
      g,
      0,
      0,
      -2,
    );
    tail.scale.z = 0.22;
    return g;
  }
  makeWhale() {
    const g = this.group();
    this.sphere(g, 0, 0, 0, 34, 28, 90, "whale");
    this.sphere(g, 0, -14, 26, 28, 15, 58, "whaleBelly");
    this.sphere(g, 0, -5, 63, 30, 24, 30, "whale");
    const mouth = this.sphere(g, 0, -12, 86, 22, 12, 8, "black");
    g.userData.mouth = mouth;
    for (const side of [-1, 1]) {
      const fin = this.sphere(g, side * 33, -8, 0, 31, 3, 16, "whale");
      fin.rotation.z = side * 0.4;
      this.sphere(g, side * 26, 2, 66, 1.3, 1.4, 1.2, "black");
      const tail = this.sphere(g, side * 24, 0, -90, 30, 4, 14, "whale");
      tail.rotation.z = side * 0.1;
    }
    this.sphere(g, 0, 27.4, 18, 3, 0.6, 4, "black");
    return g;
  }
  makeBelly() {
    this.sphere(this.belly, 0, 28, 0, 59, 55, 106, "belly");
    this.box(this.belly, 0, -0.7, 0, 96, 1.4, 171, "bellyFloor");
    for (let j = 0; j < 10; j++) {
      const rib = this.mesh(
        new THREE.TorusGeometry(48, 1.25, 7, 30, Math.PI),
        "rib",
        this.belly,
        0,
        2,
        -77 + j * 17,
      );
      rib.rotation.z = 0;
      rib.scale.y = 0.85;
    }
    this.box(this.belly, 25, 14.5, -12.5, 14, 1, 109, "ramp").rotation.x =
      Math.atan(30 / 105);
    this.box(this.belly, 12, 29.6, -65, 40, 0.8, 12, "ramp");
    for (let j = 0; j < 24; j++) {
      const z = 38 - j * 4.5,
        y = clamp((40 - z) / 105, 0, 1) * 30;
      for (const x of [19.5, 31])
        this.sphere(
          this.belly,
          x,
          y + 0.5,
          z,
          0.36,
          0.24,
          0.55,
          this.mat("glow", 0xbce9e4, {
            emissive: 0x548685,
            emissiveIntensity: 0.65,
          }),
        );
    }
    for (let j = 0; j < 14; j++) {
      const rock = this.mesh(
        this.geometries.rock,
        "rib",
        this.belly,
        -35 + Math.sin(j * 2.4) * 8,
        1,
        65 - j * 10,
      );
      rock.scale.set(2, 2, 3);
    }
    this.makeSign(this.belly, "BLÅSHÅLET →", 8, 4, 38, 3.1);
    this.makeSign(this.belly, "↑ UT GENOM BLÅSHÅLET", 0, 34, -66, 3);
    const hole = this.cylinder(
      this.belly,
      0,
      32,
      -65,
      5,
      0.3,
      this.mat("exit", 0xe8fbff, { emissive: 0x74baff, emissiveIntensity: 1 }),
      24,
    );
    const shaft = this.cylinder(
      this.belly,
      0,
      43,
      -65,
      6.4,
      22,
      this.mat("shaft", 0x45616c, { side: THREE.BackSide }),
      24,
    );
    this.mouthLight = new THREE.PointLight(0xbceeff, 0, 180, 1);
    this.mouthLight.position.set(0, 15, 75);
    this.belly.add(this.mouthLight);
    this.mouthOpening = this.sphere(
      this.belly,
      0,
      15,
      92,
      22,
      14,
      1,
      new THREE.MeshBasicMaterial({ color: 0xc7efff }),
    );
    this.exitLight = new THREE.PointLight(0xc1eeff, 70, 40, 1);
    this.exitLight.position.set(0, 34, -65);
    this.belly.add(this.exitLight);
  }
  disposeModel(g) {
    g.traverse((o) => {
      if (o.isMesh) {
        const geo = o.geometry;
        if (!Object.values(this.geometries).includes(geo)) geo.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats)
          if (
            !Object.values(this.materials).includes(mat) &&
            mat !== this.waterMaterial
          ) {
            mat.map?.dispose();
            mat.dispose();
          }
      }
    });
    g.removeFromParent();
  }
  syncModel(id, create, parent) {
    let g = this.models.get(id);
    if (!g) {
      g = create();
      this.models.set(id, g);
    }
    if (g.parent !== parent) parent.add(g);
    return g;
  }
  sync() {
    const s = this.sim,
      p = s.player,
      zone = p.zone;
    this.world.visible = zone === "sea";
    this.belly.visible = zone === "belly";
    const live = new Set();
    for (const r of s.rafts) {
      if (r.zone !== zone || (dist(r, p) > 850 && s.mode !== "menu")) continue;
      live.add(r.id);
      const parent = r.zone === "sea" ? this.world : this.belly;
      const g = this.syncModel(r.id, () => this.group(), parent);
      g.position.set(r.x, 0, r.z);
      if (g.userData.skin !== r.skin) {
        if (g.userData.decoration) this.disposeModel(g.userData.decoration);
        g.userData.skin = r.skin;
        if (r.skin !== "sailor") {
          const flag = this.group(g);
          g.userData.decoration = flag;
          flag.userData.partId = "decoration";
          this.cylinder(flag, 0, 4, 0, 0.08, 7, "darkWood");
          const material = this.mat(
            r.skin === "pirate" ? "pirateFlag" : "royalFlag",
            r.skin === "pirate" ? 0x1b2532 : 0x347bd4,
            { side: THREE.DoubleSide },
          );
          this.mesh(
            new THREE.PlaneGeometry(2.3, 1.5),
            material,
            flag,
            1.2,
            6,
            0,
          );
          this.makeSign(
            flag,
            r.skin === "pirate" ? "PIRAT" : "⚜",
            1.2,
            6,
            0.025,
            0.6,
          );
        }
      }
      const children = new Map(g.children.map((c) => [c.userData.partId, c]));
      for (const part of r.parts) {
        let model = children.get(part.id);
        if (!model) {
          model = this.makePart(part, r);
          model.userData.partId = part.id;
          g.add(model);
        }
        children.delete(part.id);
        if (part.burning > 0) {
          if (!model.userData.fire) {
            const fire = this.group(model);
            for (let i = 0; i < 3; i++) {
              const cone = this.mesh(
                new THREE.ConeGeometry(0.4, 1.6, 5),
                "flame",
                fire,
                (i - 1) * 0.7,
                part.type === "wall" || part.type === "strong" ? 3.6 : 1.4,
                0.2,
              );
              cone.castShadow = false;
            }
            model.userData.fire = fire;
          }
          for (const flame of model.userData.fire.children)
            flame.scale.y = 0.9 + Math.sin(s.time * 17) * 0.2;
        } else if (model.userData.fire) {
          this.disposeModel(model.userData.fire);
          model.userData.fire = null;
        }
      }
      for (const [id, c] of children)
        if (id !== "decoration") this.disposeModel(c);
    }
    for (const b of s.boats) {
      if (b.zone !== zone || dist(b, p) > 800) continue;
      live.add(b.id);
      const g = this.syncModel(
        b.id,
        () => this.makeBoat(b),
        b.zone === "sea" ? this.world : this.belly,
      );
      g.position.set(b.x, Math.sin(s.time * 1.5) * 0.04, b.z);
    }
    for (const [kind, arr] of [
      ["bot", s.bots],
      ["guard", s.guards],
    ])
      for (const a of arr) {
        if (a.zone !== zone || dist(a, p) > 350) continue;
        live.add(a.id);
        let g = this.models.get(a.id);
        if (
          g &&
          (g.userData.weapon !== a.weapon || g.userData.skin !== a.skin)
        ) {
          this.disposeModel(g);
          this.models.delete(a.id);
        }
        g = this.syncModel(
          a.id,
          () => this.makeActor(a, kind),
          a.zone === "sea" ? this.world : this.belly,
        );
        const carrier = a.boatId
          ? s.boats.find((b) => b.id === a.boatId)
          : s.ground(a.x, a.z, a.zone, a.y).raft;
        const motion = actorMotion(g.userData.motion, a, carrier, s.time);
        g.userData.motion = motion;
        g.position.set(
          motion.x + (carrier?.x || 0), motion.y, motion.z + (carrier?.z || 0),
        );
        g.rotation.y = motion.yaw;
        g.userData.legs.forEach((leg, i) => {
          const swing = Math.sin(motion.phase + i * Math.PI) * motion.blend;
          leg.rotation.x = swing * 0.55;
          leg.userData.knee.rotation.x = -Math.max(0, -swing) * 0.5;
          g.userData.arms[i].rotation.x = -swing * 0.32;
        });
      }
    for (const a of s.sharks) {
      if (zone !== "sea" || dist(a, p) > 300) continue;
      live.add(a.id);
      const g = this.syncModel(
        a.id,
        () => {
          const g = this.makeShark();
          g.userData.target = { kind: "shark", entity: a };
          return g;
        },
        this.world,
      );
      g.position.set(a.x, -0.24 + Math.sin(s.time * 2) * 0.04, a.z);
      g.rotation.y = a.angle;
    }
    for (const a of s.arrows) {
      if (a.zone !== zone) continue;
      live.add(a.id);
      const g = this.syncModel(
        a.id,
        () => {
          const g = this.group();
          this.box(g, 0, 0, 0, 0.045, 0.045, 1.2, "wood");
          this.sphere(
            g,
            0,
            0,
            0.6,
            0.09,
            0.09,
            0.14,
            a.fire ? "flame" : "iron",
          );
          return g;
        },
        zone === "sea" ? this.world : this.belly,
      );
      g.position.set(a.x, a.y, a.z);
      g.lookAt(a.x + a.vx, a.y + a.vy, a.z + a.vz);
    }
    for (const [id, g] of this.models)
      if (!live.has(id)) {
        this.disposeModel(g);
        this.models.delete(id);
      }
    if (zone === "sea") {
      for (const i of s.islands) {
        let g = this.staticModels.get(i.id);
        const visible =
          dist(i, p) < 1600 ||
          (s.mode === "menu" && dist(i, { x: 0, z: 0 }) < 1000);
        if (visible && !g) {
          g = this.makeIsland(i);
          this.staticModels.set(i.id, g);
        }
        if (g) g.visible = visible;
      }
      for (const r of s.resources) {
        const visible =
          r.active && dist(r, s.mode === "menu" ? { x: 0, z: 0 } : p) < 250;
        let g = this.staticModels.get(r.id);
        if (visible && !g) {
          g = this.makeResource(r);
          this.world.add(g);
          this.staticModels.set(r.id, g);
        }
        if (g) {
          g.visible = visible;
          g.position.set(
            r.x,
            r.y +
              (r.kind === "sofa" || r.kind === "table"
                ? Math.sin(s.time * 1.5 + r.x) * 0.035
                : 0),
            r.z,
          );
        }
      }
    }
    this.whale.position.set(s.whale.x, s.whale.y, s.whale.z);
    this.whale.rotation.y = 0;
    this.whale.userData.mouth.scale.y = s.whale.mouth ? 12 : 1.2;
    this.mouthOpening.visible = s.whale.mouth;
    this.mouthLight.intensity = s.whale.mouth ? 100 : 0;
    this.interactables = [];
    for (const g of this.models.values())
      if (g.visible) this.interactables.push(g);
    for (const g of this.staticModels.values())
      if (zone === "sea" && g.visible && g.userData.target)
        this.interactables.push(g);
  }
  setWeapon() {
    const name = this.sim.player.weapon;
    const skin = this.sim.player.skin;
    if (name === this.weaponName && skin === this.weaponSkin) return;
    for (const child of [...this.weaponRig.children]) this.disposeModel(child);
    this.weaponName = name;
    this.weaponSkin = skin;
    this.sphere(
      this.weaponRig,
      0.02,
      -0.06,
      0.05,
      0.12,
      0.15,
      0.12,
      skin === "medieval" ? "iron" : "skin",
    );
    this.cylinder(
      this.weaponRig,
      0.02,
      -0.24,
      0.08,
      0.13,
      0.32,
      skin === "medieval"
        ? this.materials.iron
        : this.mat(`sleeve-${skin}`, skin === "pirate" ? 0xa43736 : 0x348ee5),
    );
    const w = this.makeWeapon(name, this.weaponRig);
    w.scale.setScalar(name === "spear" ? 0.48 : 0.55);
    w.position.set(0, 0.15, 0);
    w.rotation.z = -0.3;
  }
  pick(clientX = null, clientY = null) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      clientX === null ? 0 : ((clientX - rect.left) / rect.width) * 2 - 1,
      clientY === null ? 0 : (-(clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects(this.interactables, true);
    let result = null;
    for (const h of hits) {
      let obj = h.object;
      while (obj && !obj.userData.target) obj = obj.parent;
      if (obj) {
        result = {
          ...obj.userData.target,
          distance: h.distance,
          point: h.point,
        };
        break;
      }
    }
    // Broad furniture silhouettes make a hammer useful even when aiming between table legs.
    if (this.sim.player.weapon === "hammer" && this.sim.player.zone === "sea") {
      for (const r of this.sim.resources) {
        if (!r.active || !["table", "sofa", "palm"].includes(r.kind)) continue;
        const target = new THREE.Vector3(
            r.x,
            r.y + (r.kind === "palm" ? 1.6 : 1),
            r.z,
          ),
          delta = target.clone().sub(this.camera.position),
          distance = delta.length();
        if (
          distance < 4.5 &&
          delta.normalize().dot(this.ray.ray.direction) > 0.95 &&
          (!result || result.distance > distance)
        ) {
          result = { kind: "resource", entity: r, distance, point: target };
        }
      }
    }
    return result;
  }
  buildPoint(clientX = null, clientY = null) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      clientX === null ? 0 : ((clientX - rect.left) / rect.width) * 2 - 1,
      clientY === null ? 0 : (-(clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const p = this.sim.player;
    let level = Math.max(0, Math.floor((p.y - 0.3) / 3) * 3);
    const hits = this.ray.intersectObjects(this.interactables, true);
    const partHit = hits.find((h) => {
      let o = h.object;
      while (o && !o.userData.target) o = o.parent;
      return (
        o?.userData.target?.kind === "part" && o.userData.target.raft.team === 0
      );
    });
    if (
      partHit &&
      ["wheel", "wall", "strong", "stairs"].includes(this.sim.selectedBuild)
    ) {
      let o = partHit.object;
      while (o && !o.userData.target) o = o.parent;
      const target = o.userData.target;
      return {
        x: target.raft.x + target.entity.x,
        z: target.raft.z + target.entity.z,
        y: target.entity.y,
      };
    }
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(0.6 + level));
    const hit = new THREE.Vector3();
    if (
      this.ray.ray.intersectPlane(plane, hit) &&
      hit.distanceTo(this.camera.position) < 40
    )
      return { x: hit.x, z: hit.z, y: level };
    return null;
  }
  update(dt) {
    const s = this.sim,
      p = s.player;
    this.nearTimer -= dt;
    this.sync();
    this.setWeapon();
    const inside = p.zone === "belly" || s.cave;
    const daylight = s.daylight;
    const sky = new THREE.Color(0x73c9f4).lerp(
      new THREE.Color(0x122c51),
      1 - daylight,
    );
    this.scene.background.copy(
      p.zone === "belly" ? new THREE.Color(0x695269) : sky,
    );
    this.scene.fog.color.copy(
      p.zone === "belly" ? new THREE.Color(0x695269) : sky,
    );
    this.scene.fog.near = p.zone === "belly" ? 80 : 250;
    this.scene.fog.far = p.zone === "belly" ? 260 : 1150;
    this.hemi.intensity = inside ? 1.25 : 1 + daylight * 0.85;
    this.sun.intensity = inside ? 0.4 : 0.4 + daylight * 2.25;
    this.fill.intensity = inside ? 0.25 : 0.4;
    this.lantern.intensity = inside ? 8 : 0;
    this.lantern.position.set(p.x, p.y + 3, p.z);
    this.sun.position.set(p.x - 28, p.y + 65, p.z + 18);
    this.sun.target.position.set(p.x, p.y, p.z);
    this.sky.position.set(p.x * 0.75, 0, p.z * 0.75);
    this.sunOrb.visible = !s.night;
    this.waterMaterial.uniforms.time.value = s.time;
    this.waterMaterial.uniforms.light.value = daylight;
    this.waterMaterial.uniforms.direction.value.set(
      s.current.x * 7,
      s.current.z * 7,
    );
    this.waterMaterial.uniforms.eye.value.copy(this.camera.position);
    this.sea.position.x = Math.round(p.x / 20) * 20;
    this.sea.position.z = Math.round(p.z / 20) * 20;
    if (s.mode === "menu") {
      const t = performance.now() / 1000;
      this.camera.position.set(20 + Math.sin(t * 0.04) * 4, 13, 25);
      this.camera.lookAt(0, 0, -7);
      this.weaponRig.visible = false;
    } else {
      this.camera.position.set(
        p.x,
        p.y + 1.65 + Math.sin(s.time * 5) * (p.y < 0 ? 0.045 : 0.01),
        p.z,
      );
      this.camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
      this.weaponRig.visible = !s.building;
      const swing = p.cooldown / WEAPONS[p.weapon].cooldown;
      this.weaponRig.rotation.set(
        Math.sin(swing * Math.PI) * -0.5,
        0,
        Math.sin(swing * Math.PI) * -0.55,
      );
      this.weaponRig.position.y = -0.48 + Math.sin(s.time * 4) * 0.014;
    }
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld();
    this.ghost.visible = false;
    if (s.building) {
      const point = this.buildPoint();
      if (point) {
        const v = s.canBuild(s.selectedBuild, point.x, point.z, point.y);
        const r = s.raft;
        this.ghost.visible = true;
        this.ghost.material.color.set(v.ok ? 0x8cffb4 : 0xff7466);
        const x =
            v.ok && s.selectedBuild !== "boat"
              ? r.x + v.x
              : Math.round((point.x - r.x) / 3) * 3 + r.x,
          z =
            v.ok && s.selectedBuild !== "boat"
              ? r.z + v.z
              : Math.round((point.z - r.z) / 3) * 3 + r.z;
        this.ghost.position.set(x, 0.82 + point.y, z);
        this.ghost.scale.set(
          1,
          ["wall", "strong"].includes(s.selectedBuild) ? 15 : 1,
          1,
        );
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
