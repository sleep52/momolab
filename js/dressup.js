/* ============================================================
 * dressup.js · 换装间（V1.2）
 * 三槽位可同时穿；支持点击试穿 + 把衣服直接拖到小猫身上。
 * 小猫在镜子里的表情跟着「今日心情」走，心情还会偏爱某几件衣服。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const icon = (n) => window.MOMO_ICONS[n] || "";

  let activeSlot = "head";

  const MOOD_EXPR = {
    cheerful: "laugh",
    lazy: "sleepy",
    clingy: "shy",
    proud: "proud",
    curious: "curious"
  };

  function decoItems(slot) {
    return (C.items || []).filter((i) => i.cat === "deco" && (i.slot || "neck") === slot);
  }

  function mood() { return M.mood ? M.mood() : null; }

  function moodSprite() {
    // 换装间里她要显得开心：心情是“雀跃”时笑得更开，其余一律用开心脸
    const m = mood();
    const key = m && m.key === "cheerful" ? "laugh" : "happy";
    const A = C.petCharacterAssets;
    const file = (A.states && A.states[key]) || A.states.happy || A.states.idle;
    return A.basePath + file;
  }

  function overlayStyle(def) {
    const o = def.overlay || {};
    const rot = o.rot || 0;
    const rx = def.slot === "head" ? 6 : 8;
    return `left:${o.x || 50}%;top:${o.y || 70}%;width:${o.w || 30}%;` +
      `transform:translate(-50%,-50%) rotate(${rot}deg) perspective(520px) rotateX(${rx}deg);`;
  }

  function previewLayer() {
    const eq = M.equippedList();
    const sprite = moodSprite();
    const headUrl = sprite
      .replace(/\.png$/i, "__head.png")
      .replace(/\/([^/]+__head\.png)$/, "/layers/$1");
    const headImg = `<img class="dw-cat dw-head" src="${headUrl}" alt="">`;
    const low = eq.filter((it) => it.def.slot !== "head")
      .map((it) => `<img class="dw-item" src="${it.def.img}" style="${overlayStyle(it.def)}" alt="">`).join("");
    const top = eq.filter((it) => it.def.slot === "head")
      .map((it) => `<img class="dw-item" src="${it.def.img}" style="${overlayStyle(it.def)}" alt="">`).join("");
    return `<div class="dw-stage">
      <div class="dw-shadow"></div>
      <img class="dw-cat" src="${sprite}" alt="${C.petName}">
      ${low}
      ${headImg}
      ${top}
      <span class="dw-tip">${eq.length ? "现在身上的搭配" : "把衣服拖到她身上试试"}</span>
    </div>`;
  }

  function moodBar() {
    const m = mood();
    if (!m) return "";
    const liked = m.liked.map((id) => M.itemDef(id)).filter(Boolean);
    return `<div class="dw-mood">
      <div class="dm-head">
        <span class="dm-ic">${icon(m.def.icon || "heart")}</span>
        <div class="dm-txt"><b>今日心情 · ${m.def.label}</b><i>${m.def.desc || ""}</i></div>
      </div>
      <div class="dm-likes">
        ${liked.length
          ? `<span class="dm-label">今天喜欢</span>${liked.map((d) => `<span class="dm-chip">${d.name}</span>`).join("")}`
          : `<span class="dm-label">衣柜还空着，先去收集几件</span>`}
        ${m.rewarded ? `<span class="dm-done">今天已经奖励过</span>` : `<span class="dm-hint">穿对一件，亲密 +${(C.moodReward || {}).bond || 2}</span>`}
      </div>
    </div>`;
  }

  function lookLine() {
    const eq = M.equippedList();
    if (!eq.length) return "什么都没戴";
    return eq.map((x) => x.def.name).join(" + ");
  }

  function afterWear(def) {
    const m = mood();
    const liked = M.moodLikes(def.id);
    const expr = liked ? (M.state.attrs.happy > 70 ? "laugh" : "happy") : (m && MOOD_EXPR[m.key]) || "happy";
    M.pet.setExpr(expr, 2200);
    M.pet.action(liked ? "happy" : "shy", 1300);
    M.pet.burst(liked ? "heart" : "star", liked ? 6 : 4);
    M.pet.say(liked ? "她今天正好想穿这件，尾巴翘得很高。" : "她照了照镜子，勉强接受了。");
    M.audio.sfx(liked ? "success" : "happy");
    M.checkMoodReward();
    if (M.ui.hud) M.ui.hud.update();
  }

  /* 拖拽穿戴：把已解锁的装饰拖到预览小猫身上即穿上 */
  function equipFromDrag(def) {
    const slot = def.slot || "neck";
    const already = M.equippedId(slot) === def.id;
    if (!already) M.setSlot(slot, def.id);
    M.pet.refreshDeco();
    if (!already) afterWear(def);
    else { M.toast("这件已经穿在身上了"); M.audio.sfx("tap"); }
    wardrobe();
  }

  function bindDrag(el) {
    const stage = el.querySelector(".dw-stage");
    if (!stage) return;
    el.querySelectorAll(".dw-cell").forEach((cell) => {
      const id = cell.getAttribute("data-deco");
      const def = M.itemDef(id);
      if (!def || !M.state.discovered[id] || !def.img) return; // 未解锁的不能拖
      let dragging = false, pid = null, sx = 0, sy = 0, ghost = null, over = false;

      const move = (e) => {
        if (!dragging) {
          if (Math.hypot(e.clientX - sx, e.clientY - sy) < 7) return;
          dragging = true;
          cell.classList.add("is-source");
          ghost = document.createElement("img");
          ghost.className = "dw-ghost";
          ghost.src = def.img;
          ghost.alt = "";
          ghost.style.width = ((def.overlay || {}).w || 30) + "%";
          document.body.appendChild(ghost);
          try { cell.setPointerCapture(pid); } catch (err) {}
        }
        ghost.style.left = e.clientX + "px";
        ghost.style.top = e.clientY + "px";
        const r = stage.getBoundingClientRect();
        over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        stage.classList.toggle("is-drop", over);
      };

      const end = () => {
        cell.removeEventListener("pointermove", move);
        cell.removeEventListener("pointerup", end);
        cell.removeEventListener("pointercancel", end);
        if (!dragging) return;
        dragging = false;
        try { cell.releasePointerCapture(pid); } catch (err) {}
        cell.classList.remove("is-source");
        stage.classList.remove("is-drop");
        if (ghost) { ghost.remove(); ghost = null; }
        cell._dragBlock = true; // 拖完松手那一下不触发点击
        if (over) equipFromDrag(def);
      };

      cell.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pid = e.pointerId; sx = e.clientX; sy = e.clientY;
        dragging = false; over = false;
        cell.addEventListener("pointermove", move);
        cell.addEventListener("pointerup", end);
        cell.addEventListener("pointercancel", end);
      });
    });
  }

  function cell(def) {
    const owned = !!M.state.discovered[def.id];
    const wearing = M.equippedId(def.slot || "neck") === def.id;
    const price = def.price || 0;
    const liked = owned && M.moodLikes(def.id);
    return `<button class="dw-cell ${wearing ? "is-on" : ""} ${owned ? "" : "is-locked"}" data-deco="${def.id}">
      ${liked ? `<span class="dw-like">${icon("heart")}今天喜欢</span>` : ""}
      <span class="dw-visual">${owned ? `<img src="${def.img}" alt="">` : icon("lock")}</span>
      <span class="dw-name">${owned ? def.name : (price ? price + " 星星" : "未解锁")}</span>
      <span class="dw-state">${wearing ? "佩戴中" : owned ? "点一下 / 拖到她身上" : (price ? "点击解锁" : "继续探索")}</span>
    </button>`;
  }

  function wardrobe() {
    const slots = M.decoSlots();
    const list = decoItems(activeSlot);
    const ownedCount = (C.items || []).filter((i) => i.cat === "deco" && M.state.discovered[i.id]).length;
    const total = (C.items || []).filter((i) => i.cat === "deco").length;

    M.ui.panel({
      title: "换装间",
      subtitle: `装饰 ${ownedCount}/${total} 件 · 当前：${lookLine()}`,
      extra: `<span class="panel-count">${M.state.coins} ★</span>`,
      body: `
        ${moodBar()}
        <div class="dw-top">
          ${previewLayer()}
          <div class="dw-side">
            <div class="dw-slots">
              ${slots.map((s) => `<button class="dw-slot ${s.id === activeSlot ? "is-active" : ""}" data-slot="${s.id}">
                <b>${s.label}</b><i>${M.equippedId(s.id) ? M.itemDef(M.equippedId(s.id)).name : "空"}</i>
              </button>`).join("")}
            </div>
            <div class="dw-acts">
              <button class="btn small primary" data-lucky>随机搭一套</button>
              <button class="btn small ghost" data-strip>全部摘下</button>
            </div>
          </div>
        </div>
        <div class="section-title"><h3>${(slots.find((s) => s.id === activeSlot) || {}).label || ""}可选</h3><span>点一下试穿，或拖到小猫身上</span></div>
        <div class="dw-grid">${list.map(cell).join("") || `<p class="empty-tip">这个位置还没有装饰。</p>`}</div>
        <p class="set-foot">穿的造型会自动保存，也会一起拍进相册。拖到哪个位置就穿哪个位置。星星来自小游戏、任务和默契测试。</p>`,
      onMount: (el) => {
        el.querySelectorAll("[data-slot]").forEach((b) => {
          b.addEventListener("click", () => { activeSlot = b.getAttribute("data-slot"); wardrobe(); });
        });
        el.querySelectorAll("[data-deco]").forEach((b) => {
          b.addEventListener("click", () => {
            if (b._dragBlock) { b._dragBlock = false; return; } // 刚拖拽完，不算点击
            const id = b.getAttribute("data-deco");
            const def = M.itemDef(id);
            if (!def) return;
            if (!M.state.discovered[id]) {
              if (!def.price) { M.toast("这件要靠在世界里收集解锁", "warn"); return; }
              M.ui.sheet({
                title: "解锁「" + def.name + "」",
                subtitle: `需要 ${def.price} 星星，你现在有 ${M.state.coins} 颗。`,
                body: `<div class="dw-buy"><img src="${def.img}" alt=""><p>${def.desc || ""}</p></div>`,
                actions: [
                  { label: `花 ${def.price} 星星解锁`, primary: true, onClick: () => { if (M.buyDeco(id)) { M.ui.closeSheet(); wardrobe(); } else M.ui.closeSheet(); } },
                  { label: "再想想", onClick: () => M.ui.closeSheet() }
                ]
              });
              return;
            }
            const wearing = M.isEquipped(id);
            M.pet.equipToggle(id);
            M.audio.sfx("tap");
            if (!wearing) { setTimeout(() => afterWear(def), 60); }
            wardrobe();
          });
        });
        el.querySelector("[data-lucky]").addEventListener("click", () => {
          const m = mood();
          M.decoSlots().forEach((s) => {
            const pool = decoItems(s.id).filter((d) => M.state.discovered[d.id]);
            let pick = null;
            if (pool.length) {
              const liked = m ? pool.filter((d) => m.liked.indexOf(d.id) >= 0) : [];
              const useLiked = liked.length && Math.random() < 0.6;
              const from = useLiked ? liked : pool;
              pick = from[Math.floor(Math.random() * from.length)];
            }
            M.state.equip[s.id] = pick ? pick.id : null;
          });
          const eq = M.equippedList();
          M.state.equip.deco = eq.length ? eq[0].def.id : null;
          M.save();
          M.pet.refreshDeco();
          M.checkMoodReward();
          const expr = (m && MOOD_EXPR[m.key]) || "happy";
          M.pet.setExpr(expr, 2000);
          M.pet.action("happy", 1400);
          M.pet.burst("star", 6);
          M.pet.say("这一套她好像还挺满意。");
          M.audio.sfx("happy");
          wardrobe();
        });
        el.querySelector("[data-strip]").addEventListener("click", () => {
          M.decoSlots().forEach((s) => { M.state.equip[s.id] = null; });
          M.state.equip.deco = null;
          M.save();
          M.pet.refreshDeco();
          M.audio.sfx("tap");
          wardrobe();
        });
        bindDrag(el);
      }
    });
  }

  M.dressup = { open: wardrobe };
})();
