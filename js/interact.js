/* ============================================================
 * interact.js · 与宠物的日常互动
 * 摸摸 / 喂食 / 陪玩 / 呼唤 / 休息 / 拍照
 * 每一次互动都会改动属性、推进任务、写进存档。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;

  let lastPet = 0, petWrap = null, flashEl = null;

  function ownedByCat(cat) {
    return (C.items || []).filter((i) => i.cat === cat && M.itemCount(i.id) > 0);
  }

  function itemRow(def, count, extra) {
    const visual = def.img
      ? `<img src="${def.img}" alt="" class="row-img">`
      : `<span class="row-ic">${window.MOMO_ICONS[def.icon] || window.MOMO_ICONS.spark}</span>`;
    return `<button class="pick-row" data-id="${def.id}">
      <span class="row-visual">${visual}</span>
      <span class="row-main"><b>${def.name}</b><i>${extra || def.desc || ""}</i></span>
      <span class="row-count">${count ? "× " + count : ""}</span>
    </button>`;
  }

  function touchPet() {
    const now = Date.now();
    if (now - lastPet < 650) return;
    lastPet = now;
    M.audio.unlock();
    M.pet.petAnim();
    M.pet.say(M.petLine("pet"));
    M.addAttr({ bond: 3, happy: 2 });
    M.state.stats.pet += 1;
    M.bump("pet", 1);
    M.save();
    M.emit("interact", { type: "pet" });
  }

  function callPet() {
    M.audio.unlock();
    M.pet.callAnim();
    M.pet.say(M.petLine("call"));
    M.addAttr({ bond: 2, happy: 1 });
    M.audio.sfx("happy");
    M.emit("interact", { type: "call" });
  }

  function restPet() {
    M.pet.restAnim(4200);
    M.pet.say(M.petLine("rest"));
    M.addAttr({ vigor: 14 });
    M.state.stats.rest += 1;
    M.save();
    M.toast("活力 +14，让她睡一会儿");
    M.audio.sfx("soft");
    M.emit("interact", { type: "rest" });
  }

  function openFeed() {
    const foods = ownedByCat("food");
    if (!foods.length) {
      M.ui.sheet({
        title: "喂食",
        subtitle: "口袋里没有零食了。去小游戏或任务里换一点回来。",
        body: `<p class="empty-tip">小鱼干可以通过「寻找零食」获得，鸡肉条和罐头来自任务奖励。</p>`,
        actions: [{ label: "去看看小游戏", primary: true, onClick: () => { M.ui.closeSheet(); M.app.openGames(); } }]
      });
      return;
    }
    M.ui.sheet({
      title: "喂点什么",
      subtitle: "选择一份食物，她会先闻两下",
      body: foods.map((f) => itemRow(f, M.itemCount(f.id), f.desc)).join(""),
      onMount: (el) => {
        el.querySelectorAll(".pick-row").forEach((row) => {
          row.addEventListener("click", () => { feed(row.getAttribute("data-id")); });
        });
      }
    });
  }

  function feed(id) {
    const def = M.itemDef(id);
    if (!def || !M.takeItem(id)) { M.toast("这份已经吃完了"); return; }
    M.ui.closeSheet();
    M.pet.feedAnim(def.img);
    setTimeout(() => M.pet.say(M.petLine("feed"), 3600), 900);
    const use = def.use || { happy: 8, vigor: 8 };
    M.addAttr({ happy: use.happy || 0, vigor: use.vigor || 0, bond: 2 });
    M.state.stats.feed += 1;
    M.bump("feed", 1);
    M.save();
    M.toast(`喂了${def.name}`);
    M.emit("interact", { type: "feed", id });
  }

  function openPlay() {
    const toys = ownedByCat("toy");
    if (!toys.length) {
      M.ui.sheet({
        title: "陪她玩",
        subtitle: "身边没有玩具。小屋的毛线球也许还能找回来。",
        body: `<p class="empty-tip">小游戏「接住玩具」会送出布偶鱼和弹弹球。</p>`,
        actions: [{ label: "去看看小游戏", primary: true, onClick: () => { M.ui.closeSheet(); M.app.openGames(); } }]
      });
      return;
    }
    M.ui.sheet({
      title: "挑一个玩具",
      subtitle: "她看到玩具的时候，瞳孔会放大",
      body: toys.map((t) => itemRow(t, M.itemCount(t.id), t.desc)).join(""),
      onMount: (el) => {
        el.querySelectorAll(".pick-row").forEach((row) => {
          row.addEventListener("click", () => play(row.getAttribute("data-id")));
        });
      }
    });
  }

  function play(id) {
    const def = M.itemDef(id);
    M.ui.closeSheet();
    M.pet.playAnim(def && def.img);
    setTimeout(() => M.pet.say(M.petLine("play"), 3600), 800);
    const use = (def && def.use) || { bond: 6, happy: 8 };
    M.addAttr({ bond: use.bond || 0, happy: use.happy || 0, vigor: -4 });
    M.state.stats.play += 1;
    M.bump("play", 1);
    M.save();
    M.toast(`陪她玩了${def ? def.name : "一会儿"}`);
    M.emit("interact", { type: "play", id });
  }

  /* ---------- 拍照 ---------- */
  function loadImage(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }

  async function composePhoto(areaId) {
    const W = 900, H = 1125;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    const scene = await loadImage((C.sceneAssets || {})[areaId]);
    if (scene) {
      // cover 裁切
      const sr = scene.width / scene.height, dr = W / H;
      let sw = scene.width, sh = scene.height, sx = 0, sy = 0;
      if (sr > dr) { sw = scene.height * dr; sx = (scene.width - sw) / 2; }
      else { sh = scene.width / dr; sy = (scene.height - sh) / 2; }
      ctx.drawImage(scene, sx, sy, sw, sh, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#efe6d6"; ctx.fillRect(0, 0, W, H);
    }

    const expr = M.pet.expression || "idle";
    const file = (C.petCharacterAssets.states[expr]) ? expr : "idle";
    const pet = await loadImage(C.petCharacterAssets.basePath + C.petCharacterAssets.states[file]);
    if (pet) {
      const pw = W * 0.56;
      ctx.drawImage(pet, (W - pw) / 2, H - pw - H * 0.03, pw, pw);
    }

    const decos = M.equippedList ? M.equippedList() : [];
    for (const it of decos) {
      const deco = it.def;
      if (!deco || !deco.img || !deco.overlay) continue;
      const dimg = await loadImage(deco.img);
      if (!dimg) continue;
      const dw = W * (deco.overlay.w / 100) * 0.56;
      const dh = dimg.height && dimg.width ? dw * (dimg.height / dimg.width) : dw;
      ctx.drawImage(dimg, W * (deco.overlay.x / 100) - dw / 2, H * (deco.overlay.y / 100) - dh / 2, dw, dh);
    }

    // 光晕 + 胶片边
    const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, "rgba(30,22,14,0)");
    grad.addColorStop(1, "rgba(24,18,12,0.72)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,248,236,0.9)";
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, W - 36, H - 36);

    const area = M.areaDef(areaId);
    ctx.fillStyle = "#FFF6E8";
    ctx.font = "600 46px 'Songti SC','STSong','Noto Serif SC',serif";
    ctx.fillText(C.petName + " · " + (area ? area.name : ""), 54, H - 118);
    ctx.font = "400 26px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillStyle = "rgba(255,246,232,0.78)";
    ctx.fillText(M.today() + "  ·  " + C.gameName, 54, H - 72);

    try { return canvas.toDataURL("image/jpeg", 0.72); }
    catch (e) { return null; }
  }

  async function photo() {
    M.audio.sfx("open");
    if (flashEl) { flashEl.classList.remove("go"); void flashEl.offsetWidth; flashEl.classList.add("go"); }
    M.pet.setExpr("shy", 2400);
    await new Promise((r) => setTimeout(r, 260));
    const data = await composePhoto(M.world.current);
    if (!data) {
      M.toast("拍照需要以本地服务方式打开：双击「启动游戏.bat」后再试", "warn");
      return;
    }
    const entry = {
      id: M.uid(),
      dataUrl: data,
      area: M.world.current,
      areaName: (M.areaDef(M.world.current) || {}).name || "",
      caption: C.petName + " @ " + ((M.areaDef(M.world.current) || {}).name || ""),
      date: M.today(),
      time: Date.now()
    };
    M.album.add(entry);
    M.state.stats.photo += 1;
    M.bump("photo", 1);
    M.save();
    M.audio.sfx("success");
    M.toast("已存入相册", "gold");
    setTimeout(() => M.album.open(null, entry.id), 900);
  }

  M.interact = {
    init(refs) { petWrap = refs.petWrap; flashEl = refs.flash; },
    touchPet, callPet, restPet, openFeed, feed, openPlay, play, photo
  };
})();
