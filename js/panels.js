/* ============================================================
 * panels.js · 内容面板：小游戏中心 / 任务 / 收藏 / 设置 / 宠物资料 / 关于
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const icon = (n) => window.MOMO_ICONS[n] || "";

  function attrRows() {
    return (C.attributes || []).map((a) => `
      <div class="p-attr">
        <span class="pa-ic">${icon(a.icon)}</span>
        <div class="pa-main">
          <div class="pa-top"><b>${a.label}</b><em>${M.state.attrs[a.key]}</em></div>
          <div class="pa-track"><i style="width:${M.state.attrs[a.key]}%"></i></div>
          <p>${a.hint || ""}</p>
        </div>
      </div>`).join("");
  }

  /* ---------- 小游戏中心 ---------- */
  function games() {
    const cards = (C.minigames || []).map((g) => {
      const rec = M.gameRecord(g.id);
      return `<article class="game-card accent-${g.accent || "sage"}">
        <div class="gc-top">
          <span class="gc-ic">${icon(g.icon)}</span>
          <span class="gc-state ${rec.completed ? "done" : ""}">${rec.completed ? "已通关" : "未通关"}</span>
        </div>
        <h3>${g.name}</h3>
        <p class="gc-tag">${g.tagline || ""}</p>
        <p class="gc-desc">${g.desc || ""}</p>
        <div class="gc-foot">
          <span class="gc-best">最好成绩 <b>${rec.best || 0}</b></span>
          <button class="btn small primary" data-game="${g.id}">${rec.plays ? "再玩一次" : "开始"}</button>
        </div>
      </article>`;
    }).join("");

    M.ui.panel({
      title: "小游戏中心",
      subtitle: `${(C.minigames || []).length} 款都能反复玩，成绩会记住`,
      body: `${cards}
        <div class="hub-tools">
          <button class="hub-tool" data-open-quiz>
            <span class="ht-ic">${icon("heart")}</span>
            <span class="ht-main"><b>默契测试</b><i>八道题，看看你有多懂她 · 最好 ${(M.state.quiz && M.state.quiz.best) || 0} 分</i></span>
            <span class="ht-arrow">${icon("next")}</span>
          </button>
          <button class="hub-tool" data-open-wardrobe>
            <span class="ht-ic">${icon("gem")}</span>
            <span class="ht-main"><b>换装间</b><i>头部 / 颈部 / 身体，可以同时戴三件</i></span>
            <span class="ht-arrow">${icon("next")}</span>
          </button>
        </div>
        <div class="hub-note">
          <h4>进度</h4>
          <p>已通关 <b>${M.minigameWins()}/${(C.minigames || []).length}</b> 款。通关任意两款可以从花园走到湖边，任意五款之后秘境会打开。</p>
        </div>`,
      onMount: (el) => {
        el.querySelectorAll("[data-game]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-game");
            M.ui.closePanel();
            setTimeout(() => M.games.open(id), 320);
          });
        });
        el.querySelector("[data-open-quiz]").addEventListener("click", () => M.quiz.open());
        el.querySelector("[data-open-wardrobe]").addEventListener("click", () => M.dressup.open());
      }
    });
  }

  /* ---------- 任务 ---------- */
  function taskCard(t) {
    const pct = Math.round((t.progress / t.def.target) * 100);
    const state = t.claimed ? "claimed" : (t.complete ? "done" : "doing");
    const reward = t.def.reward || {};
    const rewardTxt = [
      reward.coins ? `${reward.coins} 星星` : null,
      reward.items ? (reward.items.map((i) => (M.itemDef(i) || {}).name || "物品").join(" + ")) : null
    ].filter(Boolean).join(" · ");
    return `<article class="task-card ${state}">
      <div class="tk-main">
        <div class="tk-top"><h4>${t.def.title}</h4><span class="tk-badge">${t.claimed ? "已领取" : t.complete ? "可领取" : "进行中"}</span></div>
        <p>${t.def.desc || ""}</p>
        <div class="tk-bar"><i style="width:${pct}%"></i></div>
        <span class="tk-num">${t.progress}/${t.def.target}</span>
      </div>
      <div class="tk-side">
        <span class="tk-reward">${icon("star")} ${rewardTxt}</span>
        <button class="btn small ${t.complete && !t.claimed ? "primary" : "ghost"}" data-claim="${t.def.id}"
          ${t.complete && !t.claimed ? "" : "disabled"}>${t.claimed ? "已领取" : "领取"}</button>
      </div>
    </article>`;
  }

  function tasks() {
    const every = M.tasks.all();
    M.ui.panel({
      title: "任务",
      subtitle: `每日 ${every.daily.filter((t) => t.complete).length}/${every.daily.length} 完成 · 探索 ${every.explore.filter((t) => t.complete).length}/${every.explore.length}`,
      body: `
        <div class="section-title"><h3>每日任务</h3><span>每天零点刷新</span></div>
        <div class="task-list">${every.daily.map(taskCard).join("")}</div>
        <div class="section-title"><h3>探索任务</h3><span>一世界一次</span></div>
        <div class="task-list">${every.explore.map(taskCard).join("")}</div>`,
      onMount: (el) => {
        el.querySelectorAll("[data-claim]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-claim");
            if (M.tasks.claim(id)) {
              setTimeout(() => tasks(), 600);
            }
          });
        });
      }
    });
  }

  /* ---------- 收藏 ---------- */
  const CATS = [
    { id: "all", label: "全部" },
    { id: "food", label: "食物" },
    { id: "toy", label: "玩具" },
    { id: "deco", label: "装饰" },
    { id: "home", label: "家园" },
    { id: "plant", label: "花园" },
    { id: "souvenir", label: "纪念品" },
    { id: "hidden", label: "隐藏" }
  ];

  function collection(cat) {
    const cur = cat || "all";
    const items = (C.items || []).filter((i) => cur === "all" || i.cat === cur);
    const owned = (C.items || []).filter((i) => M.state.discovered[i.id]).length;

    const cell = (def) => {
      const got = M.state.discovered[def.id];
      const count = M.itemCount(def.id);
      const equipped = M.isEquipped(def.id);
      const visual = def.img
        ? `<img src="${def.img}" alt="">`
        : `<span class="ci-ic">${icon(def.icon || "star")}</span>`;
      return `<button class="coll-cell ${got ? "" : "is-locked"} ${equipped ? "is-equipped" : ""}" data-item="${def.id}">
        <span class="cc-visual">${got ? visual : icon("lock")}</span>
        <span class="cc-name">${got ? def.name : "未解锁"}</span>
        ${count > 1 ? `<span class="cc-count">×${count}</span>` : ""}
        ${equipped ? `<span class="cc-eq">佩戴中</span>` : ""}
      </button>`;
    };

    M.ui.panel({
      title: "收藏",
      subtitle: `已收集 ${owned}/${(C.items || []).length} 件`,
      extra: `<span class="panel-count">${Math.round((owned / (C.items || []).length) * 100)}%</span>`,
      body: `
        <div class="coll-tabs">${CATS.map((c) => `<button class="tab ${c.id === cur ? "is-active" : ""}" data-cat="${c.id}">${c.label}</button>`).join("")}</div>
        <div class="coll-grid">${items.map(cell).join("")}</div>`,
      onMount: (el) => {
        el.querySelectorAll("[data-cat]").forEach((tab) => {
          tab.addEventListener("click", () => collection(tab.getAttribute("data-cat")));
        });
        el.querySelectorAll("[data-item]").forEach((btn) => {
          btn.addEventListener("click", () => itemDetail(btn.getAttribute("data-item")));
        });
      }
    });
  }

  function itemDetail(id) {
    const def = M.itemDef(id);
    if (!def) return;
    const got = M.state.discovered[id];
    const count = M.itemCount(id);
    const visual = def.img ? `<img src="${def.img}" alt="">` : `<span class="big-ic">${icon(def.icon || "star")}</span>`;
    const actions = [];
    if (got && def.cat === "deco") {
      actions.push({
        label: M.isEquipped(id) ? "取下这件" : "戴上试试", primary: true,
        onClick: () => { M.pet.equipToggle(id); M.ui.closeSheet(); collection("deco"); }
      });
    }
    if (got && def.cat === "food" && count > 0) {
      actions.push({ label: "喂给她", primary: true, onClick: () => { M.ui.closeSheet(); M.interact.feed(id); } });
    }
    if (got && def.cat === "toy") {
      actions.push({ label: "陪她玩", primary: true, onClick: () => { M.ui.closeSheet(); M.interact.play(id); } });
    }
    M.ui.sheet({
      title: got ? def.name : "还没有找到这件",
      subtitle: got ? `${count > 1 ? "持有 ×" + count + " · " : ""}${def.source || ""}` : (def.source || "继续探索"),
      body: `<div class="item-detail ${got ? "" : "is-locked"}">
          <div class="id-visual">${got ? visual : icon("lock")}</div>
          <p class="id-desc">${got ? def.desc || "" : "这件物品还没有被发现。"}</p>
          <div class="id-source"><span>获取方式</span><b>${def.source || "探索世界"}</b></div>
        </div>`,
      actions
    });
  }

  /* ---------- 设置 ---------- */
  function toggleRow(key, label, desc, value) {
    return `<div class="set-row">
      <div class="sr-main"><b>${label}</b><p>${desc}</p></div>
      <button class="switch ${value ? "on" : ""}" data-toggle="${key}" aria-label="${label}"><i></i></button>
    </div>`;
  }

  function settings() {
    const s = M.state.settings;
    M.ui.panel({
      title: "设置",
      subtitle: "音乐、音效与游戏进度",
      body: `
        <div class="set-block">
          ${toggleRow("music", "背景音乐", "很轻的环境音乐，关掉也不影响玩法", s.music)}
          ${toggleRow("sfx", "音效", "互动、收集和小游戏的反馈音", s.sfx)}
        </div>
        <div class="set-block">
          <div class="set-row">
            <div class="sr-main"><b>画面粒子</b><p>关闭后可以减少低配设备的动画负担</p></div>
            <button class="switch ${s.quality !== "low" ? "on" : ""}" data-toggle="quality" aria-label="画面粒子"><i></i></button>
          </div>
        </div>
        <div class="set-block">
          <button class="set-link" data-open-pet><span>${icon("paw")} 宠物资料</span><em>${icon("next")}</em></button>
          <button class="set-link" data-open-about><span>${icon("info")} 关于游戏</span><em>${icon("next")}</em></button>
        </div>
        <div class="set-block danger">
          <button class="set-link" data-restart><span>${icon("restart")} 重新开始</span><em>清空存档</em></button>
        </div>
        <p class="set-foot">存档保存在这台设备的浏览器里（localStorage）。清理浏览器数据会一起清掉。</p>`,
      onMount: (el) => {
        el.querySelectorAll("[data-toggle]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-toggle");
            if (key === "quality") {
              const low = M.state.settings.quality === "low";
              M.setSetting("quality", low ? "auto" : "low");
              btn.classList.toggle("on", !low);
              document.body.classList.toggle("low-fx", !low);
            } else {
              const next = !M.state.settings[key];
              M.setSetting(key, next);
              btn.classList.toggle("on", next);
              M.audio.applySettings();
            }
            M.audio.sfx("tap");
          });
        });
        el.querySelector("[data-open-pet]").addEventListener("click", () => pet());
        el.querySelector("[data-open-about]").addEventListener("click", () => about());
        el.querySelector("[data-restart]").addEventListener("click", () => {
          M.ui.sheet({
            title: "要重新开始吗",
            subtitle: "当前的世界、收藏和相册都会清空，这个动作不能撤销。",
            body: "",
            actions: [
              { label: "确认清空", primary: true, onClick: () => {
                  M.ui.closeSheet();
                  M.reset();
                  M.pet.refreshDeco();
                  M.album.list();
                  M.ui.hud.render();
                  M.ui.closePanel();
                  M.toast("已经重新开始", "warn");
                  setTimeout(() => M.app.reopenOpening(), 400);
                } },
              { label: "算了", onClick: () => M.ui.closeSheet() }
            ]
          });
        });
      }
    });
  }

  /* ---------- 宠物资料 ---------- */
  function pet() {
    const lv = M.level();
    const eq = M.equippedList();
    M.ui.panel({
      title: C.petName,
      subtitle: `${C.petType} · ${C.petBreed}`,
      extra: `<span class="panel-badge">Lv.${lv} ${M.levelTitle(lv)}</span>`,
      body: `
        <div class="pet-hero">
          <div class="ph-img"><img src="${C.petAvatar}" alt="${C.petName}"></div>
          <div class="ph-meta">
            <p class="ph-quote">“${C.petPersonality}”</p>
            <div class="ph-list">
              <span><i>年龄</i><b>${C.petAge}</b></span>
              <span><i>生日</i><b>${C.petBirthday}</b></span>
              <span><i>装饰</i><b>${eq.length ? eq.map((x) => x.def.name).join(" + ") : "没有佩戴"}</b></span>
            </div>
            <div class="ph-acts">
              <button class="btn small primary" data-go-wardrobe>去换装间</button>
              <button class="btn small ghost" data-go-quiz>测默契</button>
            </div>
          </div>
        </div>
        <p class="pet-intro">${C.petIntro}</p>
        <div class="section-title"><h3>成长</h3><span>总进度 ${M.attrTotal()}/400</span></div>
        <div class="p-attrs">${attrRows()}</div>
        <div class="pet-stats">
          <div><b>${M.state.stats.pet}</b><i>摸摸次数</i></div>
          <div><b>${M.state.stats.feed}</b><i>喂食次数</i></div>
          <div><b>${M.state.stats.games}</b><i>小游戏</i></div>
          <div><b>${(M.state.quiz && M.state.quiz.best) || 0}</b><i>默契分数</i></div>
        </div>`,
      onMount: (el) => {
        el.querySelector("[data-go-wardrobe]").addEventListener("click", () => M.dressup.open());
        el.querySelector("[data-go-quiz]").addEventListener("click", () => M.quiz.open());
      }
    });
  }

  /* ---------- 关于 ---------- */
  function about() {
    const b = C.branding || {};
    M.ui.panel({
      title: "关于",
      subtitle: C.gameDescription,
      body: `
        <div class="about-card">
          <span class="about-mark">${C.gameName}</span>
          <p>${C.gameSubtitle || ""}</p>
          <div class="about-rows">
            <span><i>产品类型</i><b>个性化宠物互动冒险</b></span>
            <span><i>版本</i><b>V1.0 · MVP</b></span>
            <span><i>存档</i><b>本机浏览器 localStorage</b></span>
            <span><i>进度</i><b>${M.levelTitle(M.level())} · ${M.level()}/9</b></span>
          </div>
        </div>
        ${b.showCredit ? `<div class="credit-card">
          <p class="credit-line">${b.creatorCredit || C.creatorCredit}</p>
          <p class="credit-sub">这只宠物的专属世界，由 ${b.studioName || "Momolab"} 定制。</p>
          ${b.supportContact ? `<p class="credit-contact">${b.supportContact}</p>` : ""}
        </div>` : ""}
        <p class="about-foot">游戏内容与角色素材均为本案例定制；替换配置中的宠物资料与场景素材即可生成新的定制版本。</p>`,
    });
  }

  M.panels = { games, tasks, collection, itemDetail, settings, pet, about };
})();
