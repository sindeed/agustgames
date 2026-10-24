const TRACK_URL = new URL('./music/circuit-resolve.mp3', import.meta.url).href;
const VOLUME = 0.16;

export class FactoryMusic {
  constructor() {
    this.enabled = true;
    this.active = false;
    this.wanted = false;
    this.pageHidden = false;
    this.error = null;
    this.pending = null;
    try { this.enabled = localStorage.getItem('where-is-exit-music') !== 'off'; } catch {}
    document.addEventListener('visibilitychange', () => this.sync());
    window.addEventListener('pagehide', () => { this.pageHidden = true; this.sync(); });
    window.addEventListener('pageshow', () => { this.pageHidden = false; this.sync(true); });
  }

  unlock(prime = false) {
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.context.destination);
        // Stream one reusable MP3 player; do not buffer the full song in iPad RAM.
        this.element = new Audio(TRACK_URL);
        this.element.preload = 'none';
        this.element.loop = true;
        this.source = this.context.createMediaElementSource(this.element);
        this.source.connect(this.gain);
        this.element.addEventListener('playing', () => this.setGain());
        this.element.addEventListener('error', () => { this.error = 'MediaError'; });
      }
      if (this.context.state !== 'running') this.context.resume().catch(() => {});
      this.sync(true);
      // Prime Safari silently inside the Intro tap so playback can start when
      // the film ends, without adding another button or playing over the film.
      if (prime && this.enabled && !this.wanted) this.play();
    } catch (error) { this.error = error.name; }
  }

  setGain() {
    if (!this.context || !this.gain) return;
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    if (!this.wanted) this.gain.gain.setValueAtTime(0, now);
    else {
      this.gain.gain.setValueAtTime(this.gain.gain.value, now);
      this.gain.gain.setTargetAtTime(VOLUME, now, 0.18);
    }
  }

  play() {
    if (!this.element || this.pending) return;
    this.error = null;
    this.pending = this.element.play()
      .then(() => { if (!this.wanted) this.element.pause(); })
      .catch(error => { if (error.name !== 'AbortError') this.error = error.name; })
      .finally(() => {
        this.pending = null;
        if (this.wanted && this.element.paused && !this.error) this.play();
      });
  }

  sync(retry = false) {
    const wanted = this.active && this.enabled && !document.hidden && !this.pageHidden;
    if (wanted === this.wanted && !retry) return;
    this.wanted = wanted;
    this.setGain();
    if (!this.element) return;
    if (!wanted) this.element.pause();
    else {
      if (this.context.state !== 'running') this.context.resume().catch(() => {});
      this.play();
    }
  }

  setActive(active) { this.active = active; this.sync(); }

  restart() {
    if (this.element) {
      this.element.pause();
      this.element.currentTime = 0;
    }
    this.active = true;
    this.unlock();
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('where-is-exit-music', this.enabled ? 'on' : 'off'); } catch {}
    this.unlock();
    return this.enabled;
  }

  snapshot() {
    return {
      track: 'Circuit Resolve', enabled: this.enabled, active: this.active,
      playing: Boolean(this.wanted && this.element && !this.element.paused && this.context?.state === 'running'),
      volume: VOLUME, loop: this.element?.loop ?? true,
      currentTime: Number((this.element?.currentTime || 0).toFixed(2)),
      contextState: this.context?.state || 'not-started', error: this.error,
    };
  }
}
