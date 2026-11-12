/* ============================================================
 * world.js · 场景与区域探索
 * 负责：进入区域、场景切换动效、可交互热点的生成与反馈、区域解锁
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;

  let bgEl, hotspotEl, nameEl, subEl, stageEl, areaMenuEl;
  let currentId = null;
  let busy = false;

  function icon(name) { return window.MOMO_ICONS[name] || ""; }

  function pickLine(areaId) {
    const areas = C.storyContent.areas || {};
    return areas[areaId] || "";
  }

  function renderHotspots(area) {
    hotspotEl.innerHTML = "";
    (area.hotspots || []).forEach((spot, idx) => {
      if (spot.type === "collect" && M.isTaken(area.id, spot.id)) return;
      const btn = document.createElement("button");
      btn.className = "hotspot hs-" + spot.type;
      btn.style.left = spot.x + "%";
      btn.style.top = spot.y + "%";
      btn.style.animationDelay = (idx * 0.35).toFixed(2) + "s";
      btn.setAttribute("aria-label", spot.label);

      const locked = spot.requires && !M.flag(area.id, spot.requires);
      const inner = `
        <span class="hs-ring"></span>
        <span class="hs-core">${icon(locked ? "lock" : spot.icon || "spark")}</span>
        <span class="hs-label">${spot.label}</span>`;
      btn.innerHTML = inner;
      if (locked) btn.classList.add("is-locked");
      if (spot.type === "water" && M.flag(area.id, "watered")) btn.classList.add("is-done");

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleSpot(area, spot, btn, locked);
      });
      hotspotEl.appendChild(btn);
    });
  }

  function handleSpot(area, spot, btn, locked) {
    M.audio.unlock();
    if (locked) {
      const need = spot.requires === "watered" ? "得先给花圃浇水" : "还差一点条件";
      M.toast(need);
      M.audio.sfx("fail");
      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 500);
      return;
    }

    switch (spot.type) {
      case "collect": {
        const def = M.itemDef(spot.item);
        const isNew = M.addItem(spot.item, 1);
        M.markTaken(area.id, spot.id);
        M.audio.sfx("coin");
        M.pet.setExpr("excited", 1600);
        M.pet.burst("star", 5);
        M.pet.say(spot.speech || ("收下了" + (def ? def.name : "一件东西") + "。"));
        M.addAttr({ explore: 1, happy: 2 });
        M.bump("collect", 1);
        M.emit("collect", { id: spot.item, def, isNew });
        M.toast(isNew ? `新收藏：${def ? def.name : spot.label}` : `又收到一件：${def ? def.name : spot.label}`, "gold");
        refresh();
        break;
      }
      case "water": {
        if (M.flag(area.id, "watered")) {
          M.toast("花圃已经浇过水了，花开得很好。");
          return;
        }
        M.setFlag(area.id, "watered");
        M.audio.sfx("splash");
        M.pet.say(spot.speech);
        M.addAttr({ happy: 3, vigor: 2 });
        M.toast("花圃浇好了，郁金香能采了", "sage");
        refresh();
        break;
      }
      case "rest": {
        M.pet.restAnim(3200);
        M.pet.say(spot.speech);
        M.addAttr({ vigor: 10, happy: 2 });
        M.bump("rest", 1);
        M.toast("活力 +10");
        break;
      }
      case "story": {
        M.pet.setExpr("shy", 2400);
        M.pet.say(spot.speech);
        M.audio.sfx("soft");
        break;
      }
      case "travel": {
        if (!M.areaUnlocked(spot.target)) {
          M.toast(M.areaLockHint(spot.target));
          M.audio.sfx("fail");
          return;
        }
        enter(spot.target);
        break;
      }
      case "minigame": {
        M.pet.say(spot.speech);
        setTimeout(() => M.games.open(spot.target), 500);
        break;
      }
      default:
        M.pet.say(spot.speech || "她看了你一眼。");
    }
  }

  function refresh() {
    const area = M.areaDef(currentId);
    if (!area) return;
    renderHotspots(area);
  }

  function updateChrome(area) {
    nameEl.textContent = area.name;
    subEl.textContent = area.subtitle || "";
    stageEl.setAttribute("data-area", area.id);
  }

  function enter(id, opts) {
    opts = opts || {};
    const area = M.areaDef(id);
    if (!area) return;

    if (!M.areaUnlocked(id)) {
      M.toast(M.areaLockHint(id));
      M.audio.sfx("fail");
      return;
    }
    if (busy) return;

    const first = !M.state.areas[id].visited || !M.state.areas[id].visited;
    if (currentId === id && !opts.force) { refresh(); if (areaMenuEl) areaMenuEl.classList.remove("open"); return; }

    busy = true;
    const swap = () => {
      const sceneUrl = (C.sceneAssets || {})[id] || "";
      bgEl.style.backgroundImage = `url("${sceneUrl}")`;
      stageEl.style.setProperty("--scene", `url("${sceneUrl}")`);
      updateChrome(area);
      currentId = id;
      M.state.scene = id;
      M.state.areas[id].visited = true;
      renderHotspots(area);
      bgEl.classList.remove("is-out");
      busy = false;

      if (!opts.silent) {
        const wasNew = M.state.areas[id].visited && !M.state.areas[id].__entryDone;
        if (!M.state.areas[id].__entryDone) {
          M.state.areas[id].__entryDone = true;
          M.addAttr({ explore: 4 });
        }
        M.pet.action("walk", 760);
        M.pet.setExpr("excited", 1500);
        setTimeout(() => M.pet.say(pickLine(id) || area.intro, 4200), 420);
        M.emit("area", { id, area });
        if (id === "garden") M.bump("garden", 1);
        if (id === "forest" && !M.state.areas.forest.__taskCounted) {
          M.state.areas.forest.__taskCounted = true;
        }
        M.audio.sfx("step");
        if (id === "lake") {
          M.state.flags = M.state.flags || {};
          if (!M.state.flags.decoScarf) {
            M.state.flags.decoScarf = 1;
            M.addItem("deco-scarf", 1);
            setTimeout(() => M.toast("沙滩上捡到一条格纹围巾", "gold"), 800);
          }
        }
      }
      M.save();
      if (areaMenuEl) { areaMenuEl.classList.remove("open"); areaMenuEl.setAttribute("aria-hidden", "true"); }
    };

    if (!currentId) { swap(); return; }
    bgEl.classList.add("is-out");
    setTimeout(swap, 320);
  }

  function buildAreaMenu() {
    if (!areaMenuEl) return;
    const list = (C.areas || []).map((a) => {
      const unlocked = M.areaUnlocked(a.id);
      const isCur = a.id === currentId;
      return `<button class="area-row ${isCur ? "is-current" : ""} ${unlocked ? "" : "is-locked"}" data-area="${a.id}">
        <span class="area-ic">${icon(unlocked ? a.icon : "lock")}</span>
        <span class="area-txt"><b>${a.name}</b><i>${unlocked ? (a.subtitle || "") : (M.areaLockHint(a.id) || "尚未解锁")}</i></span>
        <span class="area-go">${isCur ? "此刻" : (unlocked ? "前往" : "未解锁")}</span>
      </button>`;
    }).join("");
    areaMenuEl.innerHTML = `<div class="area-menu-head"><h3>选择区域</h3><button class="icon-btn area-close" aria-label="关闭">${icon("close")}</button></div>
      <div class="area-list">${list}</div>`;
    areaMenuEl.querySelector(".area-close").addEventListener("click", () => {
      areaMenuEl.classList.remove("open");
      areaMenuEl.setAttribute("aria-hidden", "true");
      M.audio.sfx("close");
    });
    areaMenuEl.querySelectorAll(".area-row").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-area");
        if (!M.areaUnlocked(id)) {
          M.toast(M.areaLockHint(id));
          M.audio.sfx("fail");
          return;
        }
        M.audio.sfx("tap");
        closeAreaMenu();
        enter(id);
      });
    });
  }

  function closeAreaMenu() {
    if (!areaMenuEl || !areaMenuEl.classList.contains("open")) return;
    areaMenuEl.classList.remove("open");
    areaMenuEl.setAttribute("aria-hidden", "true");
    M.audio.sfx("close");
  }

  function openAreaMenu() {
    buildAreaMenu();
    areaMenuEl.classList.add("open");
    areaMenuEl.setAttribute("aria-hidden", "false");
    M.audio.sfx("open");
  }

  M.world = {
    init(refs) {
      bgEl = refs.bg; hotspotEl = refs.hotspots; nameEl = refs.name; subEl = refs.sub; stageEl = refs.stage; areaMenuEl = refs.areaMenu;
      document.addEventListener("click", (e) => {
        if (areaMenuEl && areaMenuEl.classList.contains("open") && !areaMenuEl.contains(e.target) && !e.target.closest("[data-open-areas]")) {
          areaMenuEl.classList.remove("open");
          areaMenuEl.setAttribute("aria-hidden", "true");
        }
      });
    },
    enter, refresh, openAreaMenu,
    get current() { return currentId; },
    travel(step) {
      const list = C.areas.map((a) => a.id);
      const i = list.indexOf(currentId);
      const next = list[(i + step + list.length) % list.length];
      enter(next);
    }
  };
})();
