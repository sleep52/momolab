/* ============================================================
 * dressup.js · 换装间
 * 三个槽位（头部 / 颈部 / 身体）可以同时戴，穿好的造型直接出现在世界里。
 * 未解锁的装饰可以用星星兑换。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const icon = (n) => window.MOMO_ICONS[n] || "";

  let activeSlot = "head";

  function decoItems(slot) {
    return (C.items || []).filter((i) => i.cat === "deco" && (i.slot || "neck") === slot);
  }

  function previewLayer() {
    const eq = M.equippedList();
    const imgs = eq.map((it) => {
      const o = it.def.overlay || {};
      return `<img class="dw-item" src="${it.def.img}" style="left:${o.x || 50}%;top:${o.y || 70}%;width:${o.w || 30}%" alt="">`;
    }).join("");
    return `<div class="dw-stage">
      <div class="dw-shadow"></div>
      <img class="dw-cat" src="${C.petAvatar}" alt="${C.petName}">
      ${imgs}
      <span class="dw-tip">${eq.length ? "现在身上的搭配" : "她身上什么都没戴"}</span>
    </div>`;
  }

  function lookLine() {
    const eq = M.equippedList();
    if (!eq.length) return "什么都没戴";
    return eq.map((x) => x.def.name).join(" + ");
  }

  function cell(def) {
    const owned = !!M.state.discovered[def.id];
    const wearing = M.equippedId(def.slot || "neck") === def.id;
    const price = def.price || 0;
    return `<button class="dw-cell ${wearing ? "is-on" : ""} ${owned ? "" : "is-locked"}" data-deco="${def.id}">
      <span class="dw-visual">${owned ? `<img src="${def.img}" alt="">` : icon("lock")}</span>
      <span class="dw-name">${owned ? def.name : (price ? price + " 星星" : "未解锁")}</span>
      <span class="dw-state">${wearing ? "佩戴中" : owned ? "点一下换上" : (price ? "点击解锁" : "继续探索")}</span>
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
        <div class="section-title"><h3>${(slots.find((s) => s.id === activeSlot) || {}).label || ""}可选</h3><span>点一下就能试</span></div>
        <div class="dw-grid">${list.map(cell).join("") || `<p class="empty-tip">这个位置还没有装饰。</p>`}</div>
        <p class="set-foot">穿的造型会自动保存，也会一起拍进相册。星星来自小游戏、任务和默契测试。</p>`,
      onMount: (el) => {
        el.querySelectorAll("[data-slot]").forEach((b) => {
          b.addEventListener("click", () => { activeSlot = b.getAttribute("data-slot"); wardrobe(); });
        });
        el.querySelectorAll("[data-deco]").forEach((b) => {
          b.addEventListener("click", () => {
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
            M.pet.equipToggle(id);
            M.audio.sfx("tap");
            wardrobe();
          });
        });
        el.querySelector("[data-lucky]").addEventListener("click", () => {
          M.decoSlots().forEach((s) => {
            const pool = decoItems(s.id).filter((d) => M.state.discovered[d.id]);
            const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
            M.state.equip[s.id] = pick ? pick.id : null;
          });
          M.state.equip.deco = M.equippedList().length ? M.equippedList()[0].def.id : null;
          M.save();
          M.pet.refreshDeco();
          M.pet.setExpr("proud", 1800);
          M.pet.action("shy", 1200);
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
      }
    });
  }

  M.dressup = { open: wardrobe };
})();
