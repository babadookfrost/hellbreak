class SettingsManagerClass {
  constructor() {
    this.zoom = 1.0;
    this.fps = 0;
    this.gfx = "high";
    this.musicVol = 0.5;
    this.sfxVol = 0.5;
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem("myasorubka_settings_v1");
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.zoom === "number") this.zoom = data.zoom;
        if (typeof data.fps === "number") this.fps = data.fps;
        if (typeof data.gfx === "string") this.gfx = data.gfx;
        if (typeof data.musicVol === "number") this.musicVol = data.musicVol;
        if (typeof data.sfxVol === "number") this.sfxVol = data.sfxVol;
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
    }
  }

  save() {
    try {
      localStorage.setItem(
        "myasorubka_settings_v1",
        JSON.stringify({
          zoom: this.zoom,
          fps: this.fps,
          gfx: this.gfx,
          musicVol: this.musicVol,
          sfxVol: this.sfxVol,
        }),
      );
    } catch (e) {
      console.warn("Failed to save settings", e);
    }
  }
}

window.SettingsManager = new SettingsManagerClass();
