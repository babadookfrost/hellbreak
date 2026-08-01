export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static lastShootTime: number = 0;

  public static init(scene: Phaser.Scene) {
    if (scene.sound) {
      const soundManager = scene.sound as any;
      if (soundManager.context) {
        this.ctx = soundManager.context as AudioContext;
      }
    }
  }

  private static getSFXVolume(): number {
    const sm = (window as any).SettingsManager;
    return sm && typeof sm.sfxVol === 'number' ? sm.sfxVol : 0.5;
  }

  public static playHit(isCrit: boolean) {
    const audioCtx = this.ctx;
    if (!audioCtx || audioCtx.state === 'suspended') return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = isCrit ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isCrit ? 800 : 400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        isCrit ? 1200 : 200,
        audioCtx.currentTime + 0.05
      );

      const vol = this.getSFXVolume();
      gain.gain.setValueAtTime(
        (isCrit ? 0.2 : 0.1) * (vol / 0.5),
        audioCtx.currentTime
      );
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
      console.warn('Failed to play hit procedural sound:', e);
    }
  }

  public static playDeath(type: string) {
    const audioCtx = this.ctx;
    if (!audioCtx || audioCtx.state === 'suspended') return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sawtooth';
      let dur = 0.2;
      const vol = this.getSFXVolume();
      const v = vol / 0.5;

      if (type === 'boss') {
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5);
        dur = 0.5;
        gain.gain.setValueAtTime(0.3 * v, audioCtx.currentTime);
      } else if (type === 'tank') {
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.25);
        dur = 0.25;
        gain.gain.setValueAtTime(0.15 * v, audioCtx.currentTime);
      } else {
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
        dur = 0.15;
        gain.gain.setValueAtTime(0.1 * v, audioCtx.currentTime);
      }

      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);

      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {
      console.warn('Failed to play death procedural sound:', e);
    }
  }

  public static playShoot(weaponId: string) {
    const now = Date.now();
    if (now - this.lastShootTime < 40) return;
    this.lastShootTime = now;

    const audioCtx = this.ctx;
    if (!audioCtx || audioCtx.state === 'suspended') return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      let dur = 0.1;
      let vol = 0.1;

      if (weaponId === 'shotgun') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
        dur = 0.2;
        vol = 0.15;
      } else if (weaponId === 'rocket') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3);
        dur = 0.3;
        vol = 0.2;
      } else if (weaponId === 'bow') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.1);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      }

      const sfxVol = this.getSFXVolume();
      gain.gain.setValueAtTime(vol * (sfxVol / 0.5), audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);

      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {
      console.warn('Failed to play shoot procedural sound:', e);
    }
  }
}
