/* ============================================================
 * store.js · 存档与全局状态
 * 第一版用 localStorage；接口抽象成 load/save，方便以后换成云端存档。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const KEY = "momolab.save.v1";
  const ALBUM_KEY = "momolab.album.v1";

  /* ---------- 事件总线 ---------- */
  const handlers = {};
  M.on = function (evt, fn) { (handlers[evt] || (handlers[evt] = [])).push(fn); };
  M.off = function (evt, fn) { handlers[evt] = (handlers[evt] || []).filter((f) => f !== fn); };
  M.emit = function (evt, data) {
    (handlers[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.warn("[emit]", evt, e); } });
    (handlers["*"] || []).forEach((fn) => { try { fn(evt, data); } catch (e) {} });
  };

  M.today = function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  M.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------- 默认存档 ---------- */
  M.defaultState = function () {
    const areas = {};
    (C.areas || []).forEach((a) => { areas[a.id] = { visited: false, flags: {}, taken: {} }; });
    areas.home.visited = true;

    const items = { "food-fish": 3, "food-kibble": 2, "toy-ball": 1, "toy-sock": 1 };
    const discovered = {};
    Object.keys(items).forEach((k) => { discovered[k] = true; });

    return {
      v: 1,
      createdAt: Date.now(),
      started: false,
      scene: "home",
      attrs: Object.assign({}, C.initialAttributes),
      coins: 12,
      items: items,
      discovered: discovered,
      equip: { deco: null, head: null, neck: null, body: null },
      petPos: null,               // { x, y } 百分比，主界面拖拽后的落点
      decoPos: {},                 // { [itemId]: { dx, dy } } 手动挪衣服的偏移，百分比
      areas: areas,
      games: {},                  // { [gameId]: { best, plays, wins, completed } }
      quiz: { best: 0, plays: 0, last: 0 },
      daily: { date: "", counters: {}, seen: {} },
      mood: { date: "", key: "", liked: [], rewarded: false },
      claimed: {},                // { [taskId]: true }
      settings: { music: true, sfx: true, quality: "auto" },
      seen: { intro: false, welcome: false },
      stats: { pet: 0, feed: 0, play: 0, collect: 0, photo: 0, games: 0, rest: 0 },
      lastSave: Date.now()
    };
  };

  /* ---------- 读写 ---------- */
  M.ensureDaily = function () {
    const today = M.today();
    if (M.state.daily.date !== today) {
      M.state.daily = { date: today, counters: {}, seen: {} };
      M.save();
    }
  };

  M.load = function () {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { raw = null; }
    const base = M.defaultState();
    if (!raw || typeof raw !== "object") {
      M.state = base;
    } else {
      // 合并：配置升级后新字段不丢，老存档继续可用
      const merged = Object.assign({}, base, raw);
      merged.attrs = Object.assign({}, base.attrs, raw.attrs || {});
      merged.settings = Object.assign({}, base.settings, raw.settings || {});
      merged.stats = Object.assign({}, base.stats, raw.stats || {});
      merged.equip = Object.assign({}, base.equip, raw.equip || {});
      // 老存档只有一个 deco 字段：按物品槽位迁移到新结构
      if (merged.equip.deco && !merged.equip.head && !merged.equip.neck && !merged.equip.body) {
        const d = (C.items || []).find((i) => i.id === merged.equip.deco);
        if (d && d.slot) merged.equip[d.slot] = d.id;
      }
      merged.seen = Object.assign({}, base.seen, raw.seen || {});
      merged.items = Object.assign({}, raw.items || {});
      merged.discovered = Object.assign({}, raw.discovered || {});
      merged.areas = Object.assign({}, base.areas, raw.areas || {});
      Object.keys(base.areas).forEach((id) => {
        merged.areas[id] = Object.assign({}, base.areas[id], (raw.areas || {})[id] || {});
        merged.areas[id].flags = Object.assign({}, (raw.areas || {})[id] && raw.areas[id].flags || {});
        merged.areas[id].taken = Object.assign({}, (raw.areas || {})[id] && raw.areas[id].taken || {});
      });
      merged.daily = Object.assign({ date: "", counters: {}, seen: {} }, raw.daily || {});
      M.state = merged;
    }
    M.ensureDaily();
    M.ensureMood();
    return M.state;
  };

  let saveTimer = null;
  M.save = function (immediate) {
    const write = () => {
      try {
        M.state.lastSave = Date.now();
        localStorage.setItem(KEY, JSON.stringify(M.state));
      } catch (e) { console.warn("[save] 存档失败", e); }
    };
    if (immediate) { clearTimeout(saveTimer); saveTimer = null; write(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(write, 220);
  };

  M.reset = function () {
    M.state = M.defaultState();
    M.ensureMood();
    try { localStorage.removeItem(ALBUM_KEY); } catch (e) {}
    M.save(true);
    M.emit("reset");
  };

  /* ---------- 属性 ---------- */
  M.setAttr = function (key, value, silent) {
    const min = 0, max = 100;
    const next = Math.max(min, Math.min(max, Math.round(value)));
    const delta = next - (M.state.attrs[key] || 0);
    M.state.attrs[key] = next;
    if (!silent) { M.emit("attr", { key, value: next, delta }); M.save(); }
    return delta;
  };

  M.addAttr = function (map) {
    if (!map) return;
    Object.keys(map).forEach((k) => {
      const cur = M.state.attrs[k] || 0;
      M.state.attrs[k] = Math.max(0, Math.min(100, Math.round(cur + map[k])));
    });
    M.emit("attr", {});
    M.save();
  };

  M.attrTotal = function () {
    const a = M.state.attrs;
    return (a.happy || 0) + (a.bond || 0) + (a.vigor || 0) + (a.explore || 0);
  };

  M.level = function () { return Math.min(9, 1 + Math.floor(M.attrTotal() / 72)); };

  M.levelTitle = function (lv) {
    return ["初识", "熟悉", "亲近", "默契", "形影不离", "彼此的世界", "老搭档", "家人", "唯一"][Math.min(lv - 1, 8)] || "初识";
  };

  /* ---------- 星星 ---------- */
  M.addCoins = function (n) {
    if (!n) return;
    M.state.coins = Math.max(0, (M.state.coins || 0) + n);
    M.emit("coins", { value: M.state.coins, delta: n });
    M.save();
  };

  /* ---------- 物品 ---------- */
  M.itemDef = function (id) { return (C.items || []).find((i) => i.id === id) || null; };
  M.itemCount = function (id) { return M.state.items[id] || 0; };
  M.hasItem = function (id) { return (M.state.items[id] || 0) > 0; };

  M.addItem = function (id, n) {
    n = n || 1;
    const def = M.itemDef(id);
    if (!def) return;
    M.state.items[id] = (M.state.items[id] || 0) + n;
    const isNew = !M.state.discovered[id];
    M.state.discovered[id] = true;
    M.emit("item", { id, def, count: M.state.items[id], isNew, delta: n });
    M.save();
    M.checkMilestones();
    return isNew;
  };

  /* 收藏里程碑：集齐 8 种收藏品解锁蝴蝶结 */
  M.checkMilestones = function () {
    const s = M.state;
    s.flags = s.flags || {};
    const kinds = Object.keys(s.discovered || {}).length;
    if (!s.flags.decoBowtie && kinds >= 8) {
      s.flags.decoBowtie = 1;
      M.addItem("deco-bowtie", 1);
      if (M.toast) M.toast("收藏到 8 种了，解锁「奶油蝴蝶结」", "gold");
    }
  };

  M.takeItem = function (id, n) {
    n = n || 1;
    if ((M.state.items[id] || 0) < n) return false;
    M.state.items[id] -= n;
    if (M.state.items[id] <= 0) delete M.state.items[id];
    M.emit("items-change", { id });
    M.save();
    return true;
  };

  M.itemsByCat = function (cat) {
    return (C.items || []).filter((i) => i.cat === cat);
  };

  M.ownedItems = function () {
    return (C.items || []).filter((i) => (M.state.items[i.id] || 0) > 0);
  };

  M.unlockedDeco = function () {
    return (C.items || []).filter((i) => i.cat === "deco" && M.state.discovered[i.id]);
  };

  /* ---------- 每日心情 ---------- */
  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  M.moods = function () { return C.moods || []; };

  /* 每天固定一次心情：同一天刷新页面也不会变，第二天自动换 */
  M.ensureMood = function () {
    const today = M.today();
    const s = M.state;
    if (!s.mood || s.mood.date !== today || !s.mood.key) {
      const pool = M.moods();
      if (!pool.length) return null;
      const def = pool[hashStr(today) % pool.length];
      // 今天偏爱的两件：优先推这个位置已拥有的，不够再从全部装饰里补
      const owned = (C.items || []).filter((i) => i.cat === "deco" && (s.items[i.id] || 0) > 0);
      const prefer = owned.filter((i) => (i.slot || "neck") === def.preferSlot);
      const rest = owned.filter((i) => (i.slot || "neck") !== def.preferSlot);
      const liked = prefer.concat(rest).slice(0, 2).map((i) => i.id);
      s.mood = { date: today, key: def.key, liked: liked, rewarded: false };
      M.save();
    }
    return s.mood;
  };

  M.mood = function () {
    const m = M.ensureMood();
    if (!m) return null;
    const def = M.moods().find((x) => x.key === m.key) || M.moods()[0];
    return { key: m.key, def: def, liked: (m.liked || []).filter((id) => M.itemDef(id)), rewarded: !!m.rewarded };
  };

  M.moodLikes = function (id) {
    const m = M.mood();
    return !!(m && m.liked.some((x) => x === id));
  };

  /* 今天穿了她喜欢的衣服：一天只奖励一次 */
  M.checkMoodReward = function () {
    const m = M.ensureMood();
    if (!m || m.rewarded) return false;
    const eq = M.equippedList();
    const hit = eq.some((x) => m.liked.indexOf(x.def.id) >= 0);
    if (!hit) return false;
    m.rewarded = true;
    const r = C.moodReward || { bond: 2, coins: 6 };
    M.addAttr({ bond: r.bond || 2 });
    M.addCoins(r.coins || 0);
    M.save();
    if (M.toast) M.toast(`穿到她今天喜欢的了 · 亲密 +${r.bond || 2}、星星 +${r.coins || 0}`, "gold");
    return true;
  };

  /* ---------- 换装 ---------- */
  M.decoSlots = function () { return C.decoSlots || [{ id: "neck", label: "颈部" }]; };
  M.equippedId = function (slot) { return (M.state.equip && M.state.equip[slot]) || null; };
  M.equippedList = function () {
    return M.decoSlots()
      .map((s) => ({ slot: s.id, def: M.itemDef(M.equippedId(s.id)) }))
      .filter((x) => x.def);
  };
  M.isEquipped = function (id) { return M.equippedList().some((x) => x.def.id === id); };
  M.setSlot = function (slot, id) {
    if (!M.state.equip) M.state.equip = {};
    M.state.equip[slot] = M.state.equip[slot] === id ? null : id;
    if (M.state.equip[slot]) M.state.equip.deco = M.state.equip[slot];
    M.save();
    if (M.pet) M.pet.refreshDeco();
    M.emit("equip", { slot, id: M.state.equip[slot] });
    return M.state.equip[slot];
  };
  /* 用星星解锁一件装饰，返回 true 表示解锁成功 */
  M.buyDeco = function (id) {
    const def = M.itemDef(id);
    if (!def || def.cat !== "deco") return false;
    if (M.state.discovered[id]) return false;
    const price = def.price || 0;
    if (price > (M.state.coins || 0)) { M.toast("星星不够，再玩两局就攒够了", "warn"); return false; }
    M.addCoins(-price);
    M.addItem(id, 1);
    M.audio.sfx("success");
    M.toast(`解锁了${def.name}`, "gold");
    return true;
  };

  /* ---------- 区域 ---------- */
  M.areaDef = function (id) { return (C.areas || []).find((a) => a.id === id) || null; };

  M.minigameWins = function () {
    const g = M.state.games || {};
    return (C.minigames || []).filter((m) => g[m.id] && g[m.id].completed).length;
  };

  M.areaUnlocked = function (id) {
    const a = M.areaDef(id);
    if (!a || !a.unlock) return true;
    const u = a.unlock;
    if (u.type === "minigames") return M.minigameWins() >= (u.count || 1);
    if (u.type === "allGames") return M.minigameWins() >= (u.count || (C.minigames || []).length);
    if (u.type === "item") return M.hasItem(u.item);
    if (u.type === "task") return !!(M.state.claimed && M.state.claimed[u.task]);
    return true;
  };

  M.areaLockHint = function (id) {
    const a = M.areaDef(id);
    return a && a.unlock ? a.unlock.hint : "";
  };

  M.flag = function (areaId, key) {
    const area = M.state.areas[areaId];
    return !!(area && area.flags && area.flags[key]);
  };

  M.setFlag = function (areaId, key) {
    const area = M.state.areas[areaId] || (M.state.areas[areaId] = { visited: false, flags: {}, taken: {} });
    area.flags = area.flags || {};
    if (area.flags[key]) return false;
    area.flags[key] = true;
    M.save();
    return true;
  };

  M.markTaken = function (areaId, spotId) {
    const area = M.state.areas[areaId] || (M.state.areas[areaId] = { visited: false, flags: {}, taken: {} });
    area.taken = area.taken || {};
    area.taken[spotId] = true;
    M.save();
  };

  M.isTaken = function (areaId, spotId) {
    const area = M.state.areas[areaId];
    return !!(area && area.taken && area.taken[spotId]);
  };

  /* ---------- 每日计数 ---------- */
  M.bump = function (metric, n) {
    M.ensureDaily();
    const d = M.state.daily;
    d.counters[metric] = (d.counters[metric] || 0) + (n || 1);
    M.emit("daily", { metric, value: d.counters[metric] });
    M.save();
    return d.counters[metric];
  };

  M.dailyCount = function (metric) {
    M.ensureDaily();
    return M.state.daily.counters[metric] || 0;
  };

  M.markDailySeen = function (key) {
    M.ensureDaily();
    if (M.state.daily.seen[key]) return false;
    M.state.daily.seen[key] = true;
    M.save();
    return true;
  };

  /* ---------- 小游戏成绩 ---------- */
  M.gameRecord = function (id) {
    if (!M.state.games[id]) M.state.games[id] = { best: 0, plays: 0, wins: 0, completed: false, last: 0 };
    return M.state.games[id];
  };

  M.recordGame = function (id, score, win) {
    const g = M.gameRecord(id);
    g.plays += 1;
    g.last = score;
    if (win) { g.wins += 1; g.completed = true; }
    if (score > g.best) g.best = score;
    M.state.stats.games += 1;
    M.save();
    M.bump("game", 1);
    M.emit("game", { id, score, win, record: g });
    return g;
  };

  /* ---------- 相册 ---------- */
  M.loadAlbum = function () {
    try { return JSON.parse(localStorage.getItem(ALBUM_KEY) || "[]"); } catch (e) { return []; }
  };
  M.saveAlbum = function (list) {
    try { localStorage.setItem(ALBUM_KEY, JSON.stringify(list)); }
    catch (e) {
      // 空间满：丢掉最早的两张再试一次
      try { localStorage.setItem(ALBUM_KEY, JSON.stringify(list.slice(-8))); } catch (e2) { console.warn("相册已满"); }
    }
    M.emit("album", list);
  };

  /* ---------- 设置 ---------- */
  M.setSetting = function (key, value) {
    M.state.settings[key] = value;
    M.save();
    M.emit("settings", { key, value });
  };

  /* ---------- 只读视图 ---------- */
  M.canUse = function (itemId) { return M.hasItem(itemId); };
})();
