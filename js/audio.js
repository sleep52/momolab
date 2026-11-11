/* ============================================================
 * audio.js · WebAudio 实时合成的背景音乐与音效
 * 不依赖任何音频文件，方便直接静态部署。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  let ctx = null, master = null, musicBus = null, sfxBus = null;
  let bgmTimer = null, bgmStep = 0, started = false;

  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77];
  const PAD = [130.81, 164.81, 196.0];

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = M.state.settings.music ? 0.55 : 0;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = M.state.settings.sfx ? 0.9 : 0;
    sfxBus.connect(master);
    return ctx;
  }

  function tone(opts) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opts.type || "sine";
    o.frequency.value = opts.freq;
    g.gain.value = 0;
    o.connect(g);
    g.connect(opts.bus || sfxBus);
    const t = ctx.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.3;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(opts.gain == null ? 0.35 : opts.gain, t + Math.min(0.14, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(opts) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * (opts.dur || 0.5));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter || "lowpass";
    filter.frequency.value = opts.freq || 900;
    filter.Q.value = opts.q || 1;
    const g = ctx.createGain();
    g.gain.value = opts.gain == null ? 0.18 : opts.gain;
    src.connect(filter); filter.connect(g); g.connect(opts.bus || sfxBus);
    src.start();
  }

  const SFX = {
    tap: () => { tone({ freq: 720, dur: 0.12, gain: 0.18, type: "triangle" }); },
    soft: () => { tone({ freq: 520, dur: 0.22, gain: 0.14, type: "sine" }); },
    happy: () => {
      tone({ freq: 523.25, dur: 0.22, gain: 0.3 });
      tone({ freq: 783.99, dur: 0.32, gain: 0.26, delay: 0.12 });
    },
    purr: () => {
      noise({ dur: 0.75, freq: 260, q: 2.4, gain: 0.12 });
      tone({ freq: 96, dur: 0.5, gain: 0.12, type: "sawtooth", bus: sfxBus });
    },
    coin: () => {
      tone({ freq: 1046.5, dur: 0.16, gain: 0.24, type: "triangle" });
      tone({ freq: 1568, dur: 0.2, gain: 0.18, type: "triangle", delay: 0.1 });
    },
    success: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, dur: 0.4, gain: 0.26, delay: i * 0.1 }));
    },
    fail: () => {
      tone({ freq: 330, dur: 0.28, gain: 0.22, type: "triangle" });
      tone({ freq: 220, dur: 0.4, gain: 0.18, type: "triangle", delay: 0.16 });
    },
    open: () => { tone({ freq: 440, dur: 0.3, gain: 0.16, type: "sine" }); tone({ freq: 660, dur: 0.3, gain: 0.12, delay: 0.06 }); },
    close: () => { tone({ freq: 380, dur: 0.22, gain: 0.14, type: "sine" }); },
    splash: () => { noise({ dur: 0.45, freq: 1600, gain: 0.16 }); },
    step: () => { noise({ dur: 0.16, freq: 500, gain: 0.08 }); }
  };

  M.audio = {
    unlock() {
      ensure();
      if (ctx && ctx.state === "suspended") {
        const p = ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
      this.applySettings();
    },
    applySettings() {
      if (!ctx) return;
      musicBus.gain.value = M.state.settings.music ? 0.55 : 0;
      sfxBus.gain.value = M.state.settings.sfx ? 0.9 : 0;
      if (M.state.settings.music) this.startBGM(); else this.stopBGM();
    },
    sfx(name) {
      ensure();
      if (!ctx || !M.state.settings.sfx) return;
      if (ctx.state !== "running") return;
      const fn = SFX[name] || SFX.tap;
      try { fn(); } catch (e) {}
    },
    startBGM() {
      ensure();
      if (!ctx || !M.state.settings.music || started) return;
      started = true;
      const loop = () => {
        if (!ctx) return;
        const bar = bgmStep++;
        // 低音铺底：每 4 小节换一次
        if (bar % 4 === 0) {
          const pad = PAD[(bar / 4) % PAD.length];
          tone({ freq: pad, dur: 4.2, gain: 0.1, type: "sine", bus: musicBus });
          tone({ freq: pad * 2, dur: 4.0, gain: 0.05, type: "triangle", bus: musicBus, delay: 0.1 });
        }
        // 上方旋律：随机但克制
        const pick = PENTA[(bar * 3 + Math.floor(Math.random() * 2)) % PENTA.length];
        tone({ freq: pick, dur: 1.5, gain: 0.07, type: "sine", bus: musicBus, delay: 0.15 });
        if (bar % 3 === 0) tone({ freq: PENTA[(bar + 2) % PENTA.length], dur: 1.1, gain: 0.05, type: "triangle", bus: musicBus, delay: 0.7 });
        bgmTimer = setTimeout(loop, 2000);
      };
      loop();
    },
    stopBGM() {
      started = false;
      clearTimeout(bgmTimer);
      bgmTimer = null;
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) M.audio.stopBGM();
    else if (M.state && M.state.settings.music && M.state.started) M.audio.startBGM();
  });
})();
