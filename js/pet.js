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
          const pool = [["idle", "proud", "shy", "mischief", "curious", "laugh", "lick", "sleepy"]];
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

  M.pet = {
    init(refs) {
      actor = refs.actor; decoEl = refs.deco; sayEl = refs.say; fxF = refs.fx; wrap = refs.wrap;
      preload();
      refreshDeco();
      startIdle();
    },
    setExpr, action, say, burst, zzz, refreshDeco, equipToggle,
    line,
    get expression() { return currentExpr; },
    resetIdle: () => { stopIdle(); startIdle(); },
    walkTo(xPct, ms) {
      if (!wrap) return;
      wrap.style.setProperty("--px", xPct + "%");
      action("walk", ms || 900);
    },
    setExpression(name, holdMs) { setExpr(name, holdMs); },
    feedAnim(foodImg) {
      action("eat", 2600);
      setExpr("lick", 1500);
      setTimeout(() => { if (wrap && wrap.classList.contains("act-eat")) setExpr(pick(["happy", "laugh"]), 1600); }, 1500);
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
      setExpr(pick(["mischief", "focus", "laugh"]), 3000);
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
      setExpr(pick(["curious", "excited", "greet"]), 2000);
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
