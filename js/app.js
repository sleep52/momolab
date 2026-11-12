/* ============================================================
 * app.js · 启动、开场、导航与主循环接线
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;

  const $ = (id) => document.getElementById(id);
  let opening, intro, introStep = 0, worldScreen;

  const INTRO = (C.opening && C.opening.intro) || [];

  /* ---------- 开场 ---------- */
  function renderOpening() {
    const hasSave = M.state.started;
    $("opStart").textContent = hasSave ? "重新进入世界" : (C.opening.startLabel || "开始游戏");
    const cont = $("opContinue");
    if (hasSave) {
      cont.style.display = "";
      cont.textContent = C.opening.continueLabel || "继续游戏";
    } else {
      cont.style.display = "none";
    }
    $("opGameName").textContent = C.gameName;
    $("opSubtitle").textContent = C.gameSubtitle || "";
    $("opDesc").textContent = C.gameDescription || "";
    $("opTagline").textContent = C.gameTagline || "";
    $("opKeyArt").style.backgroundImage = `url("${C.opening.keyArt}")`;
    $("opPet").src = C.petAvatar;
    const credit = C.branding && C.branding.showCredit ? (C.branding.creatorCredit || "") : "";
    $("opCredit").textContent = credit;
    syncSoundIcon();
  }

  function syncSoundIcon() {
    const on = M.state.settings.music || M.state.settings.sfx;
    const btn = $("opSound");
    if (btn) btn.innerHTML = window.MOMO_ICONS[on ? "sound" : "mute"];
    const dockBtn = $("dockSound");
    if (dockBtn) dockBtn.innerHTML = window.MOMO_ICONS[on ? "sound" : "mute"];
  }

  function toggleSound() {
    const next = !(M.state.settings.music || M.state.settings.sfx);
    M.setSetting("music", next);
    M.setSetting("sfx", next);
    M.audio.applySettings();
    syncSoundIcon();
    M.toast(next ? "声音已打开" : "声音已关闭");
  }

  function showOpening() {
    opening.classList.add("show");
    opening.setAttribute("aria-hidden", "false");
    worldScreen.classList.add("is-hidden");
    renderOpening();
  }

  function hideOpening() {
    opening.classList.remove("show");
    opening.setAttribute("aria-hidden", "true");
    worldScreen.classList.remove("is-hidden");
  }

  /* ---------- 首次进入的引导 ---------- */
  function playIntro(onDone) {
    if (!INTRO.length || M.state.seen.intro) { onDone(); return; }
    introStep = 0;
    intro.classList.add("show");
    intro.setAttribute("aria-hidden", "false");
    paintIntro();
    const done = () => {
      intro.classList.remove("show");
      intro.setAttribute("aria-hidden", "true");
      M.state.seen.intro = true;
      M.save();
      onDone();
    };
    $("introSkip").onclick = () => { M.audio.sfx("close"); done(); };
    $("introNext").onclick = () => {
      M.audio.sfx("tap");
      introStep += 1;
      if (introStep >= INTRO.length) done();
      else paintIntro();
    };
  }

  function paintIntro() {
    const step = INTRO[Math.min(introStep, INTRO.length - 1)];
    $("introTitle").textContent = step.title;
    $("introText").textContent = step.text;
    $("introNext").textContent = introStep >= INTRO.length - 1 ? "进去了" : "下一步";
    $("introStep").textContent = `${introStep + 1} / ${INTRO.length}`;
    $("introDots").innerHTML = INTRO.map((_, i) => `<i class="${i === introStep ? "on" : ""}"></i>`).join("");
  }

  /* ---------- 进入世界 ---------- */
  function enterWorld() {
    M.audio.unlock();
    hideOpening();
    setActiveNav("world");
    const saved = M.state.scene || "home";
    // 存档停在一个已锁回去的区域时（比如当时解锁后来清档），回小屋，不能让画面空着
    const scene = M.areaUnlocked(saved) ? saved : "home";
    M.state.scene = scene;
    M.world.enter(scene, { force: true, silent: false });
    M.ui.hud.update();
    if (M.state.settings.music) M.audio.startBGM();
  }

  function startGame() {
    M.audio.unlock();
    M.state.started = true;
    M.save();
    const first = !M.state.seen.intro;
    if (first) playIntro(enterWorld);
    else enterWorld();
  }

  /* ---------- 导航 ---------- */
  function setActiveNav(name) {
    document.querySelectorAll(".dock-btn[data-nav]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-nav") === name);
    });
  }

  function bindNav() {
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nav = btn.getAttribute("data-nav");
        M.audio.sfx("tap");
        if (nav !== "settings") setActiveNav(nav === "world" ? "world" : nav);
        switch (nav) {
          case "world":
            M.ui.closePanel();
            M.ui.closeSheet();
            M.ui.hud.update();
            break;
          case "games": M.panels.games(); break;
          case "tasks": M.panels.tasks(); break;
          case "collection": M.panels.collection("all"); break;
          case "album": M.album.open(); break;
          case "settings": M.panels.settings(); break;
          case "pet": M.panels.pet(); break;
        }
      });
    });
  }

  function bindActions() {
    const map = {
      pet: () => M.interact.touchPet(),
      feed: () => M.interact.openFeed(),
      play: () => M.interact.openPlay(),
      call: () => M.interact.callPet(),
      rest: () => M.interact.restPet(),
      photo: () => M.interact.photo()
    };
    document.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        M.audio.unlock();
        const fn = map[btn.getAttribute("data-action")];
        if (fn) fn();
      });
    });

    const petWrap = $("petWrap");
    petWrap.addEventListener("click", (e) => {
      e.stopPropagation();
      if (M.pet.blockClick && M.pet.blockClick()) return; // 刚拖拽完，不算摸摸
      M.interact.touchPet();
    });

    $("areaBtn").addEventListener("click", () => M.world.openAreaMenu());
    $("opSound").addEventListener("click", toggleSound);
    $("dockSound").addEventListener("click", toggleSound);
    $("opStart").addEventListener("click", () => { M.audio.sfx("tap"); startGame(); });
    $("opContinue").addEventListener("click", () => { M.audio.sfx("tap"); enterWorld(); });
  }

  /* ---------- 事件接线 ---------- */
  function bindEvents() {
    M.on("attr", () => M.ui.hud.update());
    M.on("coins", () => M.ui.hud.update());
    M.on("item", (d) => { M.ui.hud.update(); });
    M.on("items-change", () => M.ui.hud.update());
    M.on("select-none", () => {});
    M.on("reset", () => { M.ui.hud.render(); M.pet.refreshDeco(); });
    M.on("settings", () => syncSoundIcon());

    document.addEventListener("visibilitychange", () => { if (document.hidden) M.save(true); });
    window.addEventListener("pagehide", () => M.save(true));
    document.addEventListener("touchstart", () => M.audio.unlock(), { once: true, passive: true });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    M.load();

    // 把 HTML 里声明的图标灌进对应按钮
    document.querySelectorAll("[data-icon]").forEach((el) => {
      if (el.getAttribute("data-icon")) el.innerHTML = window.MOMO_ICONS[el.getAttribute("data-icon")] || "";
    });

    opening = $("opening");
    intro = $("intro");
    worldScreen = $("worldScreen");

    M.ui.init({
      toastLayer: $("toastLayer"),
      sheetLayer: $("sheetLayer"),
      sheet: $("sheet"),
      panelLayer: $("panelLayer"),
      panel: $("panel"),
      hud: $("hud")
    });

    M.pet.init({
      actor: $("petActor"),
      deco: $("petDeco"),
      say: $("petSay"),
      fx: $("fxLayer"),
      wrap: $("petWrap")
    });

    M.world.init({
      bg: $("sceneBg"),
      hotspots: $("hotspots"),
      name: $("areaName"),
      sub: $("areaSub"),
      stage: $("stage"),
      areaMenu: $("areaMenu")
    });

    M.interact.init({ petWrap: $("petWrap"), flash: $("flash") });
    M.games.init({
      modal: $("playModal"),
      stage: $("playStage"),
      title: $("playTitle"),
      sub: $("playSub"),
      hud: $("playHud"),
      foot: $("playFoot"),
      quit: $("playQuit")
    });

    if (M.state.settings.quality === "low") document.body.classList.add("low-fx");

    bindNav();
    bindActions();
    bindEvents();
    renderOpening();
    showOpening();
    M.save(true);
  }

  M.app = {
    startGame, enterWorld, showOpening,
    openGames: () => M.panels.games(),
    reopenOpening: () => { renderOpening(); showOpening(); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
