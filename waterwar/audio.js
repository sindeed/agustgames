const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const tune = [60, 64, 67, null, 69, 67, 64, null, 62, 64, 67, 64, 60, null, 55, null];
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

export class GameAudio {
  constructor() {
    this.enabled = true;
    this.music = true;
    this.active = false;
    this.voices = 0;
    this.note = 0;
    this.nextNote = 0;
    this.played = {};
    try {
      const saved = JSON.parse(localStorage.getItem("waterwar-audio") || "null");
      if (saved) {
        this.enabled = saved.enabled !== false;
        this.music = saved.music !== false;
      }
    } catch {}
  }
  unlock() {
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -16;
        limiter.ratio.value = 8;
        this.master.connect(limiter).connect(this.context.destination);
        this.musicBus = this.context.createGain();
        this.musicBus.gain.value = this.music ? 0.13 : 0;
        this.musicBus.connect(this.master);
        this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.context.state !== "running") this.context.resume().catch(() => {});
    } catch {
      // Audio must never prevent the game from starting.
    }
  }
  save() {
    try {
      localStorage.setItem("waterwar-audio", JSON.stringify({ enabled: this.enabled, music: this.music }));
    } catch {}
  }
  toggleSound() {
    this.enabled = !this.enabled;
    this.save();
    this.unlock();
  }
  toggleMusic() {
    this.music = !this.music;
    this.save();
    if (this.context) this.musicBus.gain.setTargetAtTime(this.music ? 0.13 : 0, this.context.currentTime, 0.05);
  }
  voice(source, destination, volume, duration, when) {
    if (this.voices >= 32) return false;
    const ctx = this.context, gain = ctx.createGain();
    source.connect(gain).connect(destination);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    this.voices++;
    source.onended = () => {
      this.voices--;
      source.disconnect();
      gain.disconnect();
    };
    source.start(when);
    source.stop(when + duration + 0.02);
    return true;
  }
  tone(frequency, duration, volume, type = "sine", end = frequency, destination = this.master, when = this.context.currentTime) {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), when + duration);
    this.voice(oscillator, destination, volume, duration, when);
  }
  noise(duration, volume, frequency, destination) {
    const source = this.context.createBufferSource(), filter = this.context.createBiquadFilter();
    source.buffer = this.noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    filter.connect(destination);
    if (!this.voice(source, filter, volume, duration, this.context.currentTime)) {
      filter.disconnect();
      return;
    }
    const cleanup = source.onended;
    source.onended = () => { cleanup?.(); filter.disconnect(); };
  }
  effect(event, player) {
    const dx = event.x - player.x, dz = event.z - player.z,
      distance = Math.hypot(dx, dz), volume = 1 / (1 + (distance / 12) ** 2);
    if (distance > 65 || volume < 0.02 || this.voices > 26) return;
    const pan = this.context.createStereoPanner?.() || this.context.createGain();
    if (pan.pan) pan.pan.value = clamp((dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw)) / Math.max(4, distance), -0.8, 0.8);
    pan.connect(this.master);
    const t = (f, d, v, type = "sine", end = f) => this.tone(f, d, v * volume, type, end, pan),
      n = (d, v, f) => this.noise(d, v * volume, f, pan);
    switch (event.kind) {
      case "step": n(0.065, 0.18, 500); t(95, 0.09, 0.11, "sine", 55); break;
      case "splash": n(0.24, 0.15, 1700); t(180, 0.12, 0.025, "sine", 70); break;
      case "swing": n(0.13, 0.13, 2400); break;
      case "chop": n(0.09, 0.24, 2200); t(155, 0.13, 0.16, "triangle", 70); break;
      case "metal": t(920, 0.25, 0.10); t(1390, 0.16, 0.035); n(0.045, 0.12, 3800); break;
      case "hit": n(0.07, 0.14, 750); t(105, 0.12, 0.14, "sine", 45); break;
      case "bite": n(0.22, 0.30, 1100); t(110, 0.21, 0.18, "triangle", 40); break;
      case "bow": n(0.06, 0.12, 3200); t(390, 0.15, 0.08, "triangle", 120); break;
      case "break": n(0.32, 0.24, 1700); t(120, 0.26, 0.12, "triangle", 40); break;
      case "build": t(220, 0.16, 0.12, "triangle"); t(330, 0.24, 0.06); break;
      case "whale": t(180, 1.1, 0.19, "sine", 55); t(90, 0.8, 0.09, "triangle", 48); break;
      case "escape": [60, 64, 67, 72].forEach((note, i) => this.tone(hz(note), 0.3, 0.10 * volume, "sine", hz(note), pan, this.context.currentTime + i * 0.1)); break;
    }
    this.played[event.kind] = (this.played[event.kind] || 0) + 1;
    // Every sound is shorter than this tail, so detached pans cannot accumulate.
    setTimeout(() => pan.disconnect(), 1600);
  }
  update(sim) {
    const events = sim.sounds.splice(0);
    if (!this.context || this.context.state !== "running") return;
    const active = this.enabled && sim.mode === "playing" && !document.hidden;
    if (active !== this.active) {
      this.active = active;
      this.master.gain.setTargetAtTime(active ? 0.65 : 0, this.context.currentTime, 0.035);
      this.nextNote = this.context.currentTime;
    }
    if (!active) return;
    for (const event of events.slice(-12))
      if (event.zone === sim.player.zone) this.effect(event, sim.player);
    if (!this.music) return;
    const now = this.context.currentTime;
    if (this.nextNote < now - 0.2) this.nextNote = now;
    if (this.nextNote < now + 0.08) {
      const note = tune[this.note % tune.length];
      if (note !== null) this.tone(hz(note), 0.65, 0.28, "sine", hz(note), this.musicBus, this.nextNote);
      if (this.note % 4 === 0) this.tone(hz(this.note % 16 < 8 ? 48 : 45), 1.2, 0.20, "triangle", hz(this.note % 16 < 8 ? 48 : 45), this.musicBus, this.nextNote);
      this.note++;
      this.nextNote += 0.65;
    }
  }
}
