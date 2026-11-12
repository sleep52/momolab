/* ============================================================
 * pet.js · 宠物角色控制器
 * 只用一套统一机位的立绘，靠表情切换 + 程序化动作 + 粒子完成表演。
 * 想换动作序列帧时，把 states 换成帧序列即可，接口不变。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const A = C.petCharacterAssets;

  const exprCache = {};
  let actor, decoEl, sayEl, fxF, wrap;
  let exprToken = 0, actToken = 0, sayTimer = null, idleTimer = null;
  let currentExpr = "idle";
  let dragBlock = false, stageEl = null;

  function src(name) {
    const file = (A.states && A.states[name]) || A.states.idle;
    return A.basePath + file;
  }

  function preload() {
    Object.keys(A.states || {}).forEach((k) => {
      const img = new Image();
      img.src = src(k);
      exprCache[k] = img;
    });
  }

  const PET_LINES = {};
  function line(key) {
    const arr = (C.storyContent && C.storyContent[key]) || [];
    return arr[Math.floor(Math.random() * arr.length)] || "";
  }
  M.petLine = line;

  function setExpr(name, holdMs) {
    if (!actor) return;
    const real = (A.states && A.states[name]) ? name : "idle";
    const token = ++exprToken;
    currentExpr = real;
    actor.classList.add("expr-swap");
    actor.src = src(real);
    setTimeout(() => actor && actor.classList.remove("expr-swap"), 220);
    if (holdMs) {
      setTimeout(() => {
        if (token !== exprToken) return;
        if (currentExpr !== "idle") setExpr("idle");
      }, holdMs);
    }
  }

  function action(type, duration) {
    if (!wrap) return;
    const token = ++actToken;
    const dur = duration || 1400;
    wrap.classList.remove("act-happy", "act-eat", "act-play", "act-sleep", "act-call", "act-rest", "act-walk", "act-shy");
    // 强制重排，保证同一个动作可以连续触发
    void wrap.offsetWidth;
    wrap.classList.add("act-" + type);
    setTimeout(() => {
      if (token !== actToken) return;
      wrap.classList.remove("act-" + type);
    }, dur);
    return dur;
  }

  function say(text, ms) {
    if (!sayEl || !text) return;
    clearTimeout(sayTimer);
    sayEl.textContent = text;
    sayEl.classList.add("show");
    const dur = ms || Math.max(2600, Math.min(6200, text.length * 110));
    sayTimer = setTimeout(() => sayEl && sayEl.classList.remove("show"), dur);
  }

  function icon(name, extraClass) {
    return `<span class="fx ${extraClass || ""}">${(window.MOMO_ICONS[name] || "")}</span>`;
  }

  function burst(kind, count) {
    if (!fxF) return;
    const n = count || 6;
    const icons = kind === "star" ? "star" : kind === "paw" ? "paw" : "heart";
    for (let i = 0; i < n; i++) {
      const el = document.createElement("span");
      el.className = "fx burst fx-" + kind;
      el.innerHTML = window.MOMO_ICONS[icons] || "";
      const x = 22 + Math.random() * 56;
      const scale = 0.6 + Math.random() * 0.7;
      el.style.left = x + "%";
      el.style.bottom = 30 + Math.random() * 24 + "%";
      el.style.animationDelay = (i * 0.08).toFixed(2) + "s";
      el.style.setProperty("--s", scale.toFixed(2));
      el.style.setProperty("--dx", ((Math.random() - 0.5) * 60).toFixed(0) + "px");
      fxF.appendChild(el);
      setTimeout(() => el.remove(), 1900);
    }
  }

  function zzz() {
    if (!fxF) return;
    for (let i = 0; i < 3; i++) {
      const el = document.createElement("span");
      el.className = "fx zz";
      el.textContent = "z";
      el.style.left = 52 + i * 7 + "%";
      el.style.bottom = 58 + i * 7 + "%";
      el.style.animationDelay = i * 0.5 + "s";
      fxF.appendChild(el);
      setTimeout(() => el.remove(), 2600);
    }
  }

  function refreshDeco() {
    if (!decoEl) return;
    const list = (M.equippedList ? M.equippedList() : []);
    decoEl.innerHTML = "";
    list.forEach((it) => {
      const def = it.def;
      if (!def || !def.img || !def.overlay) return;
      const img = document.createElement("img");
      img.className = "pet-deco-item";
      img.src = def.img;
      img.alt = def.name;
      img.style.left = def.overlay.x + "%";
      img.style.top = def.overlay.y + "%";
      img.style.width = def.overlay.w + "%";
      if (def.overlay.rot) img.style.transform = `translate(-50%,-50%) rotate(${def.overlay.rot}deg)`;
      img.style.zIndex = String(3 + (def.cat === "deco" ? 1 : 0));
      decoEl.appendChild(img);
    });
    decoEl.style.display = list.length ? "block" : "none";
  }

  function equipToggle(id) {
    const def = M.itemDef(id);
    if (!def) return null;
    const slot = def.slot || "neck";
    const now = M.setSlot(slot, id);
    refreshDeco();
    if (now) {
      action("shy", 1200);
      setExpr("proud", 1800);
      say("戴上之后，她照了好一会儿镜子。");
      M.audio.sfx("happy");
    } else {
      say("她把" + def.name + "拱到一边，还是喜欢身上什么都不挂。");
    }
    return now;
  }

  /* 从一组表情里随机挑一个，让同一件事每次反应不完全一样 */
  function pick(list) {
    if (!list || !list.length) return "idle";
    return list[Math.floor(Math.random() * list.length)];
  }

  /* 空闲时的小动作：轻轻换个表情、说一句无关紧要的话 */
  function startIdle() {
    stopIdle();
    const tick = () => {
      idleTimer = setTimeout(() => {
        if (!document.hidden && wrap && !wrap.classList.contains("act-sleep")) {
          const pool = [["idle", "proud", "shy", "mischief", "curious", "laugh", "lick", "sleepy", "eat-meow"]];
          const pick = pool[0][Math.floor(Math.random() * pool[0].length)];
          if (pick !== "idle") setExpr(pick, 2400);
          if (Math.random() < 0.55) say(line("idle"), 3200);
          wrap.classList.remove("act-breathe");
          void wrap.offsetWidth;
          wrap.classList.add("act-breathe");
        }
        tick();
      }, 7000 + Math.random() * 6000);
    };
    tick();
  }
  function stopIdle() { clearTimeout(idleTimer); idleTimer = null; }

  /* ---------- 主界面拖拽：把小猫放到喜欢的位置 ---------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function applyPos(xPct, yPct) {
    if (!wrap) return;
    wrap.style.left = xPct + "%";
    wrap.style.bottom = yPct + "%";
  }

  function restorePos() {
    const p = M.state && M.state.petPos;
    if (p && typeof p.x === "number" && typeof p.y === "number") applyPos(p.x, p.y);
  }

  function resetPos(quiet) {
    applyPos(50, 25);
    M.state.petPos = { x: 50, y: 25 };
    M.save();
    if (!quiet) {
      action("walk", 900);
      setExpr("proud", 1500);
      say("她走回惯常待的那块地板，趴下来。");
    }
  }

  function setupDrag() {
    if (!wrap) return;
    stageEl = wrap.closest(".stage") || document.getElementById("stage");
    if (!stageEl) return;
    let dragging = false, pid = null;
    let sx = 0, sy = 0, offX = 0, offY = 0, wr = null, sr = null, bd = null;

    // 拖拽范围：不遮住底部互动条和顶部区域按钮
    function bounds() {
      const w = wr.width, h = wr.height;
      const ab = stageEl.querySelector(".actionbar");
      const tb = stageEl.querySelector(".topbar");
      const abR = ab ? ab.getBoundingClientRect() : null;
      const tbR = tb && tb.offsetHeight ? tb.getBoundingClientRect() : null;
      const minY = abR ? (sr.bottom - abR.top) + 8 : 0;
      const maxY = Math.max(minY, sr.height - h - (tbR ? (tbR.bottom - sr.top) + 8 : 0));
      return { minX: w / 2, maxX: Math.max(w / 2, sr.width - w / 2), minY, maxY };
    }

    const move = (e) => {
      if (!dragging) {
        if (Math.hypot(e.clientX - sx, e.clientY - sy) < 7) return;
        dragging = true;
        wrap.classList.add("is-dragging");
        setExpr(pick(["curious", "mischief", "focus"]), 6000);
        try { wrap.setPointerCapture(pid); } catch (err) {}
      }
      const w = wr.width, h = wr.height;
      const cx = clamp(e.clientX - offX + w / 2 - sr.left, bd.minX, bd.maxX);
      const by = clamp(sr.bottom - (e.clientY - offY + h), bd.minY, bd.maxY);
      wrap.style.left = cx + "px";
      wrap.style.bottom = by + "px";
    };

    const end = () => {
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerup", end);
      wrap.removeEventListener("pointercancel", end);
      if (!dragging) return;
      dragging = false;
      try { wrap.releasePointerCapture(pid); } catch (err) {}
      wrap.classList.remove("is-dragging");
      wrap.classList.add("is-drop");
      setTimeout(() => wrap && wrap.classList.remove("is-drop"), 520);
      const cx = parseFloat(wrap.style.left) || wr.width / 2;
      const by = parseFloat(wrap.style.bottom) || 0;
      const px = +(cx / sr.width * 100).toFixed(2);
      const py = +(by / sr.height * 100).toFixed(2);
      M.state.petPos = { x: px, y: py };
      applyPos(px, py);
      M.save();
      dragBlock = true; // 拖完松手那一下不算摸摸
      M.audio.sfx("soft");
      // 落点附近有热点就让她回应一句，像是被放到了那个东西旁边
      const cx2 = parseFloat(wrap.style.left) || 0;
      const by2 = parseFloat(wrap.style.bottom) || 0;
      const hot = nearestHotspot(cx2, by2);
      if (hot) {
        setExpr(hot.type === "rest" ? "sleepy" : hot.type === "story" ? "shy" : "curious", 2200);
        say(hot.speech || ("她在" + hot.label + "旁边坐下了。"), 3600);
      } else {
        setExpr(pick(["proud", "laugh", "curious"]), 2000);
        say(M.petLine("idle"), 3000);
      }
    };

    function nearestHotspot(pxLeft, pxBottom) {
      const area = M.areaDef(M.world && M.world.current);
      if (!area || !(area.hotspots || []).length) return null;
      let best = null, bestD = 92; // 像素半径，贴近才算
      area.hotspots.forEach((s) => {
        const hx = sr.width * (s.x / 100);
        const hy = sr.height * (1 - s.y / 100);
        const d = Math.hypot(hx - pxLeft, hy - (sr.height - pxBottom - wr.height * 0.35));
        if (d < bestD) { bestD = d; best = s; }
      });
      return best;
    }

    wrap.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // 双击 / 连点两下：回到默认位置
      const now = Date.now();
      if (now - (wrap._lastTap || 0) < 320 && Math.hypot(e.clientX - (wrap._lastTapX || 0), e.clientY - (wrap._lastTapY || 0)) < 28) {
        wrap._lastTap = 0;
        M.audio.sfx("tap");
        resetPos();
        dragBlock = true;
        return;
      }
      wrap._lastTap = now; wrap._lastTapX = e.clientX; wrap._lastTapY = e.clientY;
      pid = e.pointerId;
      sx = e.clientX; sy = e.clientY;
      wr = wrap.getBoundingClientRect();
      sr = stageEl.getBoundingClientRect();
      offX = e.clientX - wr.left;
      offY = e.clientY - wr.top;
      bd = bounds();
      dragging = false;
      wrap.addEventListener("pointermove", move);
      wrap.addEventListener("pointerup", end);
      wrap.addEventListener("pointercancel", end);
    });
  }

  function blockClick() { const b = dragBlock; dragBlock = false; return b; }

  M.pet = {
    init(refs) {
      actor = refs.actor; decoEl = refs.deco; sayEl = refs.say; fxF = refs.fx; wrap = refs.wrap;
      preload();
      refreshDeco();
      restorePos();
      setupDrag();
      startIdle();
    },
    setExpr, action, say, burst, zzz, refreshDeco, equipToggle,
    line, blockClick,
    resetPos,
    get expression() { return currentExpr; },
    resetIdle: () => { stopIdle(); startIdle(); },
    walkTo(xPct, ms) {
      if (!wrap) return;
      applyPos(xPct, M.state.petPos ? M.state.petPos.y : 25);
      M.state.petPos = { x: xPct, y: M.state.petPos ? M.state.petPos.y : 25 };
      M.save();
      action("walk", ms || 900);
    },
    setExpression(name, holdMs) { setExpr(name, holdMs); },
    feedAnim(foodImg) {
      action("eat", 3400);
      setExpr("eat-wait");
      setTimeout(() => { if (wrap && wrap.classList.contains("act-eat")) setExpr("eat-bite"); }, 600);
      setTimeout(() => { if (wrap && wrap.classList.contains("act-eat")) setExpr("eat-chew"); }, 1200);
      setTimeout(() => { if (wrap && wrap.classList.contains("act-eat")) setExpr("eat-swallow"); }, 1800);
      setTimeout(() => { if (wrap && wrap.classList.contains("act-eat")) setExpr("eat-lick"); }, 2400);
      setTimeout(() => { if (wrap && wrap.classList.contains("act-eat")) setExpr(pick(["happy", "laugh"]), 1600); }, 3000);
      if (foodImg && fxF) {
        const el = document.createElement("img");
        el.className = "fx foodfly";
        el.src = foodImg;
        fxF.appendChild(el);
        setTimeout(() => el.remove(), 2400);
      }
      M.audio.sfx("purr");
    },
    playAnim(toyImg) {
      action("play", 3000);
      setExpr("act-jump");
      setTimeout(() => { if (wrap && wrap.classList.contains("act-play")) setExpr("act-land"); }, 900);
      setTimeout(() => { if (wrap && wrap.classList.contains("act-play")) setExpr(pick(["mischief", "laugh"]), 1600); }, 1700);
      if (toyImg && fxF) {
        const el = document.createElement("img");
        el.className = "fx toyfly";
        el.src = toyImg;
        fxF.appendChild(el);
        setTimeout(() => el.remove(), 3000);
      }
      M.audio.sfx("happy");
    },
    petAnim() {
      action("happy", 1800);
      setExpr(pick(["laugh", "happy", "shy"]), 2200);
      burst("heart", 6);
      M.audio.sfx("purr");
    },
    callAnim() {
      action("call", 1800);
      setExpr("eat-meow", 1800);
      M.audio.sfx("happy");
    },
    sleepAnim(ms) {
      action("sleep", ms || 4200);
      setExpr("sleep", ms || 4200);
      zzz();
    },
    restAnim(ms) {
      action("rest", ms || 2600);
      setExpr("sleepy", 2400);
      setTimeout(() => { setExpr("yawn", 1400); }, 2400);
      zzz();
    }
  };
})();
