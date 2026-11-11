/* ============================================================
 * tasks.js · 任务系统
 * 每日任务（按本地日期重置）+ 探索任务（永久）
 * 进度来自真实游戏行为，奖励只能领一次。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;

  function dailyProgress(metric) {
    return M.dailyCount(metric);
  }

  function exploreProgress(metric) {
    switch (metric) {
      case "visit-forest": return M.state.areas.forest && M.state.areas.forest.__entryDone ? 1 : 0;
      case "chest": return M.isTaken("forest", "chest") ? 1 : 0;
      case "lake": return M.areaUnlocked("lake") ? 1 : 0;
      case "allgames": return M.minigameWins();
      default: return 0;
    }
  }

  function evaluate(def) {
    const daily = def.type !== "explore";
    const raw = daily ? dailyProgress(def.metric) : exploreProgress(def.metric);
    const progress = Math.min(def.target, raw);
    return {
      def,
      raw,
      progress,
      complete: raw >= def.target,
      claimed: !!M.state.claimed[def.id]
    };
  }

  function all() {
    const daily = (C.tasks.daily || []).map((d) => Object.assign(evaluate(d), { type: "daily" }));
    const explore = (C.tasks.explore || []).map((d) => Object.assign(evaluate(Object.assign({ type: "explore" }, d)), { type: "explore" }));
    return { daily, explore };
  }

  function claim(id) {
    const every = all();
    const item = every.daily.concat(every.explore).find((t) => t.def.id === id);
    if (!item) return false;
    if (!item.complete || item.claimed) {
      M.toast(item.claimed ? "这份奖励已经领过了" : "任务还没完成");
      M.audio.sfx("fail");
      return false;
    }
    M.state.claimed[id] = true;
    const reward = item.def.reward || {};
    if (reward.coins) M.addCoins(reward.coins);
    if (reward.items) reward.items.forEach((iid) => M.addItem(iid, 1));
    M.addAttr({ explore: item.type === "explore" ? 6 : 1 });
    M.save();
    M.audio.sfx("success");
    M.pet.setExpr("excited", 1600);
    M.pet.burst("star", 5);
    M.toast("奖励已领取：" + (reward.coins ? reward.coins + " 星星" : "") + (reward.items ? " · 物品" : ""), "gold");
    M.emit("task", { id, def: item.def, type: item.type });
    return true;
  }

  function completedCount() {
    const every = all();
    return every.daily.filter((t) => t.complete).length + "/" + every.daily.length;
  }

  M.tasks = { all, claim, completedCount, evaluate };
})();
