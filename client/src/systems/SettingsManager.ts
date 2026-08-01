export class SettingsManagerClass {
  public zoom: number = 1.0;
  public fps: number = 0;
  public gfx: string = 'high';
  public musicVol: number = 0.5;
  public sfxVol: number = 0.5;

  constructor() {
    this.load();
  }

  public load() {
    try {
      const saved = localStorage.getItem('myasorubka_settings_v1');
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.zoom === 'number') this.zoom = data.zoom;
        if (typeof data.fps === 'number') this.fps = data.fps;
        if (typeof data.gfx === 'string') this.gfx = data.gfx;
        if (typeof data.musicVol === 'number') this.musicVol = data.musicVol;
        if (typeof data.sfxVol === 'number') this.sfxVol = data.sfxVol;
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  }

  public save() {
    try {
      localStorage.setItem(
        'myasorubka_settings_v1',
        JSON.stringify({
          zoom: this.zoom,
          fps: this.fps,
          gfx: this.gfx,
          musicVol: this.musicVol,
          sfxVol: this.sfxVol
        })
      );
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  }
}

export const SettingsManager = new SettingsManagerClass();
(window as any).SettingsManager = SettingsManager;
