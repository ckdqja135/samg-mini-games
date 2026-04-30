'use client';

export type SfxName =
  | 'jump'
  | 'trampoline'
  | 'breakable'
  | 'fruit'
  | 'star'
  | 'combo'
  | 'gameOver'
  | 'newRecord'
  | 'select';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private initPromise: Promise<void> | null = null;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : 0.5;
    }
  }

  async ensure(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    if (this.initPromise) {
      await this.initPromise;
      return this.ctx;
    }

    this.initPromise = (async () => {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.5;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
    })();
    await this.initPromise;
    return this.ctx;
  }

  play(name: SfxName) {
    if (this.muted) return;
    void this.ensure().then((ctx) => {
      if (!ctx || !this.master || this.muted) return;
      const now = ctx.currentTime;
      switch (name) {
        case 'jump':
          this.tone(ctx, now, 'triangle', 320, 540, 0.12, 0.08);
          break;
        case 'trampoline':
          this.tone(ctx, now, 'square', 220, 880, 0.22, 0.1);
          break;
        case 'breakable':
          this.tone(ctx, now, 'sawtooth', 180, 90, 0.25, 0.06);
          break;
        case 'fruit':
          this.tone(ctx, now, 'sine', 880, 1320, 0.1, 0.1);
          break;
        case 'star':
          this.glissando(ctx, now, [880, 1175, 1568], 0.18);
          break;
        case 'combo':
          this.glissando(ctx, now, [660, 880, 1100], 0.2);
          break;
        case 'gameOver':
          this.glissando(ctx, now, [400, 300, 200, 120], 0.5, 'sawtooth');
          break;
        case 'newRecord':
          this.glissando(
            ctx,
            now,
            [523, 659, 784, 1047],
            0.7,
            'triangle'
          );
          break;
        case 'select':
          this.tone(ctx, now, 'sine', 700, 900, 0.06, 0.04);
          break;
      }
    });
  }

  private tone(
    ctx: AudioContext,
    when: number,
    type: OscillatorType,
    fromHz: number,
    toHz: number,
    durationSec: number,
    volume: number
  ) {
    if (!this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, when);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(toHz, 1),
      when + durationSec
    );
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);
    osc.connect(gain).connect(this.master);
    osc.start(when);
    osc.stop(when + durationSec + 0.05);
  }

  private glissando(
    ctx: AudioContext,
    when: number,
    notes: number[],
    totalSec: number,
    type: OscillatorType = 'triangle'
  ) {
    const stepDur = totalSec / notes.length;
    notes.forEach((freq, i) => {
      this.tone(
        ctx,
        when + i * stepDur,
        type,
        freq,
        freq * 1.05,
        stepDur * 0.95,
        0.08
      );
    });
  }
}

export const audio = new AudioEngine();
