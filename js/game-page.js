/* ============================================================
 * game-page.js · 独立整页小游戏的启动器
 * 复用主世界同一套引擎与存档：进去整屏玩，出来回小屋继续。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const $ = (id) => document.getElementById(id);

  function boot() {
    M.load();

    document.querySelectorAll("[data-icon]").forEach((el) => {
      el.innerHTML = window.MOMO_ICONS[el.getAttribute("data-icon")] || "";
    });

    M.ui.init({
      toastLayer: $("toastLayer"),
      sheetLayer: $("sheetLayer"),
      sheet: $("sheet"),
      panelLayer: $("panelLayer"),
      panel: $("panel"),
      hud: null
    });

    M.games.init({
      modal: $("playModal"),
      stage: $("playStage"),
      title: $("playTitle"),
      sub: $("playSub"),
      hud: $("playHud"),
      foot: $("playFoot"),
      quit: $("playQuit")
    });
    M.games.setExit(() => {
      M.save(true);
      location.href = "index.html?resume=1";
    });

    if (M.state.settings.quality === "low") document.body.classList.add("low-fx");

    const coinsEl = $("gpCoins");
    const paintCoins = () => {
      coinsEl.innerHTML = window.MOMO_ICONS.star + "<b>" + (M.state.coins || 0) + "</b>";
    };
    paintCoins();
    M.on("coins", () => {
      paintCoins();
      coinsEl.classList.remove("is-bump");
      void coinsEl.offsetWidth;
      coinsEl.classList.add("is-bump");
    });

    const unlock = () => M.audio.unlock();
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden) M.save(true); });
    window.addEventListener("pagehide", () => M.save(true));

    const id = new URLSearchParams(location.search).get("id") || "snack";
    const def = (C.minigames || []).find((g) => g.id === id);
    if (!def) { location.replace("index.html"); return; }
    document.title = def.name + " · " + C.gameName;
    $("gpBg").style.backgroundImage = `url("${C.sceneAssets[(def && def.scene) || "home"]}")`;

    M.games.open(id);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();