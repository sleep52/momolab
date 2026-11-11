/* ============================================================
 * ui.js · 界面基础件：提示、选择面板、大面板、HUD
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;

  let toastLayer, sheetLayer, sheetEl, panelLayer, panelEl, hudEl;
  let sheetOnMount = null;

  function icon(n) { return window.MOMO_ICONS[n] || ""; }

  /* ---------- Toast ---------- */
  function toast(text, tone) {
    if (!toastLayer || !text) return;
    const el = document.createElement("div");
    el.className = "toast " + (tone ? "tone-" + tone : "");
    el.textContent = text;
    toastLayer.appendChild(el);
    while (toastLayer.children.length > 3) toastLayer.removeChild(toastLayer.firstChild);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 420); }, 2400);
  }

  /* ---------- Sheet（底部/居中选择面板） ---------- */
  function sheet(opts) {
    if (!sheetEl) return;
    const actions = (opts.actions || []).map((a, i) =>
      `<button class="sheet-act ${a.primary ? "primary" : ""}" data-act="${i}">${a.label}</button>`).join("");
    sheetEl.innerHTML = `
      <div class="sheet-head">
        <div class="sheet-titles"><h3>${opts.title || ""}</h3>${opts.subtitle ? `<p>${opts.subtitle}</p>` : ""}</div>
        <button class="icon-btn sheet-close" aria-label="关闭">${icon("close")}</button>
      </div>
      <div class="sheet-body">${opts.body || ""}</div>
      ${actions ? `<div class="sheet-acts">${actions}</div>` : ""}`;
    sheetLayer.classList.add("open");
    sheetLayer.setAttribute("aria-hidden", "false");
    sheetEl.querySelector(".sheet-close").addEventListener("click", closeSheet);
    (opts.actions || []).forEach((a, i) => {
      const btn = sheetEl.querySelector(`[data-act="${i}"]`);
      if (btn) btn.addEventListener("click", () => { M.audio.sfx("tap"); a.onClick && a.onClick(); });
    });
    sheetOnMount = opts.onMount;
    if (opts.onMount) opts.onMount(sheetEl);
    if (opts.sfx !== false) M.audio.sfx("open");
  }

  function closeSheet() {
    if (!sheetLayer || !sheetLayer.classList.contains("open")) return;
    sheetLayer.classList.remove("open");
    sheetLayer.setAttribute("aria-hidden", "true");
    sheetOnMount = null;
    M.audio.sfx("close");
  }

  /* ---------- Panel（全屏内容面板） ---------- */
  function panel(opts) {
    if (!panelEl) return;
    panelEl.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn panel-close" aria-label="关闭">${icon("back")}</button>
        <div class="panel-titles"><h2>${opts.title || ""}</h2>${opts.subtitle ? `<p>${opts.subtitle}</p>` : ""}</div>
        <div class="panel-extra">${opts.extra || ""}</div>
      </header>
      <div class="panel-body ${opts.bodyClass || ""}">${opts.body || ""}</div>`;
    panelLayer.classList.add("open");
    panelLayer.setAttribute("aria-hidden", "false");
    panelEl.querySelector(".panel-close").addEventListener("click", () => {
      closePanel();
      if (opts.onClose) opts.onClose();
    });
    if (opts.onMount) opts.onMount(panelEl);
    if (opts.sfx !== false) M.audio.sfx("open");
  }

  function closePanel() {
    if (!panelLayer || !panelLayer.classList.contains("open")) return;
    panelLayer.classList.remove("open");
    panelLayer.setAttribute("aria-hidden", "true");
    M.audio.sfx("close");
  }

  /* ---------- HUD ---------- */
  function renderHud() {
    if (!hudEl) return;
    const attrs = C.attributes || [];
    const lv = M.level();
    const eq = (M.equippedList ? M.equippedList() : []);
    hudEl.innerHTML = `
      <div class="hud-card">
        <button class="hud-pet" data-open-pet>
          <img class="hud-avatar" src="${C.petAvatar}" alt="${C.petName}">
          <div class="hud-id">
            <b>${C.petName}</b>
            <i>Lv.${lv} · ${M.levelTitle(lv)}</i>
          </div>
        </button>
        <div class="hud-bars">
          ${attrs.map((a) => `
            <div class="hud-bar" data-key="${a.key}" title="${a.hint || ""}">
              <span class="hb-ic">${icon(a.icon)}</span>
              <span class="hb-track"><i style="width:${M.state.attrs[a.key]}%"></i></span>
              <em>${M.state.attrs[a.key]}</em>
            </div>`).join("")}
        </div>
        <div class="hud-meta">
          <span class="hud-coins">${icon("star")}<b>${M.state.coins || 0}</b></span>
          <span class="hud-deco">${eq.length ? "已佩戴 · " + eq.map((x) => x.def.name).join(" + ") : "未佩戴装饰"}</span>
        </div>
      </div>`;
    const petBtn = hudEl.querySelector("[data-open-pet]");
    if (petBtn) petBtn.addEventListener("click", () => M.panels.pet());
  }

  function updateHudValues() {
    if (!hudEl) return;
    (C.attributes || []).forEach((a) => {
      const row = hudEl.querySelector(`.hud-bar[data-key="${a.key}"]`);
      if (!row) return;
      row.querySelector("i").style.width = (M.state.attrs[a.key] || 0) + "%";
      row.querySelector("em").textContent = M.state.attrs[a.key] || 0;
    });
    const coins = hudEl.querySelector(".hud-coins b");
    if (coins) coins.textContent = M.state.coins || 0;
    const lvTxt = hudEl.querySelector(".hud-id i");
    if (lvTxt) {
      const lv = M.level();
      lvTxt.textContent = `Lv.${lv} · ${M.levelTitle(lv)}`;
    }
  }

  M.toast = toast;
  M.ui = {
    init(refs) {
      toastLayer = refs.toastLayer; sheetLayer = refs.sheetLayer; sheetEl = refs.sheet;
      panelLayer = refs.panelLayer; panelEl = refs.panel; hudEl = refs.hud;
      sheetLayer.addEventListener("click", (e) => { if (e.target === sheetLayer) closeSheet(); });
      panelLayer.addEventListener("click", (e) => { if (e.target === panelLayer) closePanel(); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { closeSheet(); closePanel(); }
      });
      renderHud();
    },
    sheet, closeSheet, panel, closePanel,
    hud: { render: renderHud, update: updateHudValues }
  };
})();
