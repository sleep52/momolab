/* ============================================================
 * minigames.js · 小游戏中心
 * 四款小游戏：寻找零食 / 接住玩具（Canvas）/ 记忆翻牌 / 森林寻宝
 * 每款都有完整结算、最好成绩与奖励，可以重复游玩。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;

  const PROP = (n) => "assets/props/" + n + ".png";
  const SNACK_IMGS = ["snack-fish", "snack-cookie", "snack-kibble", "snack-strips", "snack-toyfish"].map(PROP);
  const TOY_IMGS = ["snack-ball", "snack-dropball", "snack-toyfish", "prop-socks", "prop-gift", "prop-pillow"].map(PROP);
  const MEM_IMGS = ["snack-fish", "snack-cookie", "snack-kibble", "snack-strips", "snack-ball", "snack-toyfish", "prop-socks", "prop-gift"].map(PROP);

  let modal, stageEl, titleEl, subEl, hudEl, footEl, quitBtn;
  let cleanups = [];
  let currentId = null;
  const imgCache = {};

  function preload(urls) {
    return Promise.all(urls.map((u) => new Promise((res) => {
      if (imgCache[u]) return res(imgCache[u]);
      const img = new Image();
      img.onload = () => { imgCache[u] = img; res(img); };
      img.onerror = () => res(null);
      img.src = u;
    })));
  }

  const icon = (n) => window.MOMO_ICONS[n] || "";
  const gameDef = (id) => (C.minigames || []).find((g) => g.id === id);

  /* ---------- 小猫出镜 ---------- */
  const A = C.petCharacterAssets;
  const catSrc = (name) => A.basePath + ((A.states && A.states[name]) || A.states.idle);
  function catBadge(expr, cls) {
    return `<div class="sg-cat ${cls || ""}"><img src="${catSrc(expr || "happy")}" alt="${C.petName}"></div>`;
  }
  function setCat(el, expr, holdMs) {
    if (!el) return;
    const img = el.querySelector("img");
    if (!img) return;
    img.src = catSrc(expr);
    el.classList.remove("is-react");
    void el.offsetWidth;
    el.classList.add("is-react");
    clearTimeout(el._t);
    if (holdMs) el._t = setTimeout(() => { img.src = catSrc(el.dataset.base || "happy"); }, holdMs);
    else el.dataset.base = expr;
  }
  function catSays(text) { if (M.pet && M.pet.say) M.pet.say(text, 3200); }

  function hud(html) { if (hudEl) hudEl.innerHTML = html; }

  function countdown(seconds, render, onEnd) {
    let remain = seconds;
    render(remain);
    const iv = setInterval(() => {
      remain -= 1;
      render(Math.max(0, remain));
      if (remain <= 0) { clearInterval(iv); onEnd(); }
    }, 1000);
    cleanups.push(() => clearInterval(iv));
    return {
      stop: () => clearInterval(iv),
      add: (s) => { remain = Math.max(0, remain + s); render(remain); },
      get remain() { return remain; }
    };
  }

  function cleanup() {
    cleanups.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanups = [];
  }

  /* ---------- 结算 ---------- */
  function finish(opts) {
    cleanup();
    const def = gameDef(currentId);
    const win = opts.win;
    const score = Math.round(opts.score || 0);
    const rec = M.recordGame(currentId, score, win);
    let coins = 0;
    if (win) {
      coins = 18 + Math.round(score / 8);
      M.addCoins(coins);
      if (def && def.rewardItem) M.addItem(def.rewardItem, 1);
      M.audio.sfx("success");
      M.pet.setExpr("excited", 1600);
    } else {
      coins = 4;
      M.addCoins(coins);
      M.audio.sfx("fail");
    }

    const rewardName = def && def.rewardItem ? (M.itemDef(def.rewardItem) || {}).name : "";
    const overlay = document.createElement("div");
    overlay.className = "play-result " + (win ? "is-win" : "is-lose");
    overlay.innerHTML = `
      <div class="result-card">
        <span class="result-badge">${win ? "通关" : "再试一次"}</span>
        <h2>${opts.title || (win ? "完成得很漂亮" : "差一点点")}</h2>
        <p class="result-sub">${opts.subtitle || ""}</p>
        <div class="result-stats">
          <div><i>本次得分</i><b>${score}</b></div>
          <div><i>最好成绩</i><b>${rec.best}</b></div>
          <div><i>星星奖励</i><b>+${coins}</b></div>
        </div>
        ${win && rewardName ? `<div class="result-item">获得物品 · <b>${rewardName}</b></div>` : ""}
        <div class="result-acts">
          <button class="btn primary" data-again>再玩一次</button>
          <button class="btn ghost" data-back>回到世界</button>
        </div>
      </div>`;
    stageEl.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    overlay.querySelector("[data-again]").addEventListener("click", () => start(currentId));
    overlay.querySelector("[data-back]").addEventListener("click", close);

    const wins = M.minigameWins();
    if (win) {
      const total = (C.minigames || []).length;
      M.state.flags = M.state.flags || {};
      if (wins >= total && !M.state.flags.decoBeret) {
        M.state.flags.decoBeret = 1;
        M.addItem("deco-beret", 1);
        setTimeout(() => M.toast(`${total} 款小游戏都通关，她把贝雷帽戴上了`, "gold"), 900);
      }
      setTimeout(() => {
        M.pet.burst("star", 6);
        if (wins >= total) M.toast(`${total} 款小游戏都完成了，秘境的门开了`, "gold");
        else if (wins >= 2 && !M.areaUnlocked("lake")) M.toast("湖边的路开了", "gold");
      }, 600);
    }
    M.ui.hud.update();
  }

  /* ---------- 小游戏一：寻找零食 ---------- */
  function gameSnack() {
    const TOTAL = 5, TIME = 60;
    stageEl.innerHTML = `
      <div class="sg-scene" style="background-image:url('${C.sceneAssets.home}')"></div>
      <div class="sg-shade"></div>
      <div class="sg-layer"></div>
      ${catBadge("curious", "sg-cat-bl")}
      <div class="sg-hint">把藏在屋里的 ${TOTAL} 份零食都找出来，她在旁边盯着你</div>`;
    const layer = stageEl.querySelector(".sg-layer");
    const catEl = stageEl.querySelector(".sg-cat");
    const positions = [];
    const rnd = () => {
      for (let tries = 0; tries < 60; tries++) {
        const x = 10 + Math.random() * 80;
        const y = 20 + Math.random() * 56;
        if (positions.every((p) => Math.hypot(p.x - x, p.y - y) > 14)) { positions.push({ x, y }); return { x, y }; }
      }
      const p = { x: 10 + Math.random() * 80, y: 20 + Math.random() * 56 };
      positions.push(p); return p;
    };

    let found = 0;
    const spots = [];
    for (let i = 0; i < TOTAL; i++) {
      const p = rnd();
      const img = SNACK_IMGS[i % SNACK_IMGS.length];
      const btn = document.createElement("button");
      btn.className = "snack-spot";
      btn.style.left = p.x + "%";
      btn.style.top = p.y + "%";
      btn.style.animationDelay = (i * 0.2) + "s";
      btn.innerHTML = `<span class="snack-halo"></span><img src="${img}" alt="">`;
      btn.addEventListener("click", () => {
        if (btn.classList.contains("found")) return;
        btn.classList.add("found");
        found += 1;
        M.audio.sfx("coin");
        setCat(catEl, found % 2 ? "laugh" : "excited", 1600);
        if (found === Math.floor(TOTAL / 2)) catSays("她已经凑过来闻了，进度过半。");
        hud(`<span class="ph-item">${icon("fish")} 已找到 <b>${found}/${TOTAL}</b></span>`);
        if (found >= TOTAL) {
          timer.stop();
          setCat(catEl, "laugh");
          finish({
            win: true,
            title: "零食全找到了",
            subtitle: `还剩 ${timer.remain} 秒，她一直在旁边看着你翻。`,
            score: found * 20 + timer.remain * 2
          });
        }
      });
      layer.appendChild(btn);
      spots.push(btn);
    }

    hud(`<span class="ph-item">${icon("fish")} 已找到 <b>0/${TOTAL}</b></span>`);
    const timer = countdown(TIME, (r) => {
      const t = hudEl.querySelector(".ph-time b");
      if (t) t.textContent = r;
      else hudEl.insertAdjacentHTML("beforeend", `<span class="ph-item ph-time">${icon("timer")} <b>${r}</b>s</span>`);
    }, () => finish({ win: false, title: "时间到了", subtitle: "还有零食没找到，它们藏得挺深的。", score: found * 20 }));
  }

  /* ---------- 小游戏二：接住玩具（Canvas） ---------- */
  function gameCatch() {
    const TIME = 30, TARGET = 12;
    stageEl.innerHTML = `<canvas class="sg-canvas"></canvas><div class="sg-hint">拖动底部接住玩具 · 连击有额外分</div>`;
    const cv = stageEl.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const W = 900, H = 1125;
    cv.width = W; cv.height = H;

    hud(`<span class="ph-item">${icon("paw")} 接住 <b>0</b></span>`);

    const state = {
      toys: [], particles: [], catcherX: W / 2, targetX: W / 2,
      score: 0, caught: 0, combo: 0, bestCombo: 0, spawnAt: 0, elapsed: 0,
      running: true, speedBase: 260
    };

    preload(TOY_IMGS.concat([C.sceneAssets.lake, catSrc("happy")])).then(() => {
      const bg = imgCache[C.sceneAssets.lake];
      const bgImg = bg;
      const catImg = imgCache[catSrc("happy")];
      let last = performance.now();

      function spawn() {
        const img = TOY_IMGS[Math.floor(Math.random() * TOY_IMGS.length)];
        const size = 96 + Math.random() * 34;
        state.toys.push({
          img, x: 60 + Math.random() * (W - 120), y: -size,
          vy: state.speedBase + Math.random() * 90 + state.elapsed * 8,
          size, rot: (Math.random() - 0.5) * 0.6, alpha: 1
        });
      }

      function drawBg() {
        if (bgImg && bgImg.width) {
          const sr = bgImg.width / bgImg.height, dr = W / H;
          let sw = bgImg.width, sh = bgImg.height, sx = 0, sy = 0;
          if (sr > dr) { sw = bgImg.height * dr; sx = (bgImg.width - sw) / 2; }
          else { sh = bgImg.width / dr; sy = (bgImg.height - sh) / 2; }
          ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);
        } else { ctx.fillStyle = "#e8dcc6"; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = "rgba(20,16,10,0.45)";
        ctx.fillRect(0, 0, W, H);
      }

      function drawCatcher() {
        const y = H - 130;
        const w = 250, h = 74;
        // 小猫蹲在篮子后面，两只前爪搭在篮沿上
        if (catImg) {
          const cs = 236;
          ctx.save();
          ctx.translate(state.catcherX, y + h * 0.55);
          ctx.rotate(-0.02);
          ctx.drawImage(catImg, -cs / 2, -cs, cs, cs);
          ctx.restore();
        }
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, "#D9A96B"); g.addColorStop(1, "#A9763F");
        ctx.save();
        ctx.translate(state.catcherX, y);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.quadraticCurveTo(-w / 2 - 10, h, -w / 2 + 26, h);
        ctx.lineTo(w / 2 - 26, h);
        ctx.quadraticCurveTo(w / 2 + 10, h, w / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,238,210,0.75)";
        ctx.lineWidth = 4;
        ctx.stroke();
        // 猫爪在篮子中间
        ctx.fillStyle = "rgba(255,245,228,0.55)";
        ctx.beginPath();
        ctx.arc(-30, h * 0.42, 11, 0, Math.PI * 2);
        ctx.arc(0, h * 0.3, 11, 0, Math.PI * 2);
        ctx.arc(30, h * 0.42, 11, 0, Math.PI * 2);
        ctx.ellipse(0, h * 0.62, 30, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function frame(now) {
        if (!state.running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        state.elapsed += dt;
        state.catcherX += (state.targetX - state.catcherX) * Math.min(1, dt * 12);

        if (state.elapsed * 1000 > state.spawnAt) {
          spawn();
          state.spawnAt += Math.max(320, 780 - state.elapsed * 14);
        }

        drawBg();

        // 玩具
        state.toys.forEach((t) => {
          t.y += t.vy * dt;
          t.rot += dt * 0.7;
          const img = imgCache[t.img];
          ctx.save();
          ctx.globalAlpha = t.alpha;
          ctx.translate(t.x, t.y);
          ctx.rotate(t.rot);
          if (img) ctx.drawImage(img, -t.size / 2, -t.size / 2, t.size, t.size);
          else { ctx.fillStyle = "#c9a06a"; ctx.beginPath(); ctx.arc(0, 0, t.size / 2, 0, 7); ctx.fill(); }
          ctx.restore();

          const catchY = H - 150;
          if (!t.done && t.y > catchY && Math.abs(t.x - state.catcherX) < 150) {
            t.done = true;
            state.caught += 1;
            state.combo += 1;
            state.bestCombo = Math.max(state.bestCombo, state.combo);
            const bonus = state.combo >= 3 ? Math.min(4, Math.floor(state.combo / 3)) : 0;
            state.score += 1 + bonus;
            for (let i = 0; i < 8; i++) {
              state.particles.push({ x: t.x, y: catchY, vx: (Math.random() - .5) * 300, vy: -Math.random() * 260 - 40, life: 0.7, size: 5 + Math.random() * 6 });
            }
            M.audio.sfx("coin");
            hud(`<span class="ph-item">${icon("paw")} 接住 <b>${state.caught}</b></span><span class="ph-item">${icon("star")} <b>${state.score}</b></span>${state.combo > 1 ? `<span class="ph-combo">连击 ×${state.combo}</span>` : ""}`);
          }
          if (!t.done && t.y > H + 80) {
            t.done = true;
            state.combo = 0;
          }
        });
        state.toys = state.toys.filter((t) => !t.done);

        // 粒子
        state.particles.forEach((p) => {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = "#FFE9B0";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        });
        state.particles = state.particles.filter((p) => p.life > 0);

        drawCatcher();
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      cleanups.push(() => { state.running = false; });
    });

    const timer = countdown(TIME, (r) => {
      let el = hudEl.querySelector(".ph-time b");
      if (el) el.textContent = r;
      else hudEl.insertAdjacentHTML("beforeend", `<span class="ph-item ph-time">${icon("timer")} <b>${r}</b>s</span>`);
    }, () => {
      state.running = false;
      const win = state.score >= TARGET;
      finish({
        win,
        title: win ? "接得稳稳的" : "玩具掉了一地",
        subtitle: `接住 ${state.caught} 个，最高连击 ${state.bestCombo}`,
        score: state.score
      });
    });

    function moveTo(e) {
      const rect = cv.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      state.targetX = Math.max(140, Math.min(W - 140, x));
    }
    cv.addEventListener("pointermove", moveTo);
    cv.addEventListener("pointerdown", moveTo);
    cleanups.push(() => { cv.removeEventListener("pointermove", moveTo); cv.removeEventListener("pointerdown", moveTo); });

    const keyHandler = (e) => {
      if (e.key === "ArrowLeft") state.targetX = Math.max(140, state.targetX - 90);
      if (e.key === "ArrowRight") state.targetX = Math.min(W - 140, state.targetX + 90);
    };
    window.addEventListener("keydown", keyHandler);
    cleanups.push(() => window.removeEventListener("keydown", keyHandler));
    cleanups.push(() => timer.stop());
  }

  /* ---------- 小游戏三：记忆翻牌 ---------- */
  function gameMemory() {
    const PAIRS = 8;
    const deck = [];
    MEM_IMGS.slice(0, PAIRS).forEach((img, i) => { deck.push({ img, key: i }); deck.push({ img, key: i }); });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }

    stageEl.innerHTML = `
      <div class="mm-wrap"><div class="mm-grid"></div></div>
      ${catBadge("focus", "sg-cat-br")}
      <div class="sg-hint">翻开两张一样的牌，她在旁边一起盯着</div>`;
    const grid = stageEl.querySelector(".mm-grid");
    const catEl = stageEl.querySelector(".sg-cat");
    grid.style.setProperty("--cols", 4);

    let matched = 0, moves = 0, open = [], locked = false;
    const started = performance.now();

    deck.forEach((c) => {
      const card = document.createElement("button");
      card.className = "mm-card";
      card.innerHTML = `<span class="mm-inner">
          <span class="mm-face mm-back">${icon("paw")}</span>
          <span class="mm-face mm-front"><img src="${c.img}" alt=""></span>
        </span>`;
      card.dataset.key = c.key;
      card.addEventListener("click", () => {
        if (locked || card.classList.contains("is-open") || card.classList.contains("is-matched")) return;
        card.classList.add("is-open");
        M.audio.sfx("tap");
        open.push(card);
        if (open.length === 2) {
          moves += 1;
          const [a, b] = open;
          if (a.dataset.key === b.dataset.key) {
            a.classList.add("is-matched"); b.classList.add("is-matched");
            matched += 1;
            M.audio.sfx("coin");
            setCat(catEl, matched >= PAIRS ? "laugh" : "happy", 1500);
            open = [];
            hud(`<span class="ph-item">${icon("grid")} 已配对 <b>${matched}/${PAIRS}</b></span><span class="ph-item">${icon("timer")} <b>${moves}</b> 步</span>`);
            if (matched >= PAIRS) {
              const secs = Math.round((performance.now() - started) / 1000);
              finish({
                win: true,
                title: "全部配对成功",
                subtitle: `${moves} 步，用时 ${secs} 秒`,
                score: Math.max(20, 200 - moves * 6 - secs)
              });
            }
          } else {
            locked = true;
            const [x, y] = open;
            setCat(catEl, "proud", 1400);
            setTimeout(() => {
              x.classList.remove("is-open"); y.classList.remove("is-open");
              open = []; locked = false;
            }, 720);
            hud(`<span class="ph-item">${icon("grid")} 已配对 <b>${matched}/${PAIRS}</b></span><span class="ph-item">${icon("timer")} <b>${moves}</b> 步</span>`);
          }
        }
      });
      grid.appendChild(card);
    });
    hud(`<span class="ph-item">${icon("grid")} 已配对 <b>0/${PAIRS}</b></span><span class="ph-item">${icon("timer")} <b>0</b> 步</span>`);
  }

  /* ---------- 小游戏四：森林寻宝 ---------- */
  function gameTreasure() {
    const TIME = 90;
    const SPOTS = [
      { id: "lantern", label: "灯笼", x: 62, y: 22, icon: "spark", clue: "挂在半空，是整夜不灭的一点暖光。" },
      { id: "chest", label: "宝箱", x: 74, y: 64, icon: "chest", clue: "木头做的，锁早就生了锈，却一直没人开。" },
      { id: "mushroom", label: "红蘑菇", x: 22, y: 72, icon: "mushroom", clue: "红帽子，只有下过雨才肯钻出来。" },
      { id: "hole", label: "树洞", x: 30, y: 44, icon: "home", clue: "树干上有一个洞，正好能伸进一只爪子。" },
      { id: "firefly", label: "萤火", x: 50, y: 32, icon: "jar", clue: "会飞的小灯，抓在手里不烫，还会一起一伏。" },
      { id: "root", label: "老树根", x: 86, y: 78, icon: "tree", clue: "盘在地上的根，比石头还硬，踩上去像台阶。" }
    ];
    const rounds = [];
    const pool = SPOTS.slice();
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      rounds.push(pool.splice(idx, 1)[0]);
    }

    stageEl.innerHTML = `
      <div class="sg-scene" style="background-image:url('${C.sceneAssets.forest}')"></div>
      <div class="sg-shade"></div>
      <div class="tr-layer"></div>
      ${catBadge("curious", "sg-cat-bl")}
      <div class="tr-clue"><span class="clue-k">线索 <b>1</b>/3</span><p></p></div>`;
    const layer = stageEl.querySelector(".tr-layer");
    const clueBox = stageEl.querySelector(".tr-clue");
    const catEl = stageEl.querySelector(".sg-cat");
    let round = 0, score = 0;
    const startedAt = Date.now();

    const markEls = {};
    SPOTS.forEach((s) => {
      const btn = document.createElement("button");
      btn.className = "tr-spot";
      btn.style.left = s.x + "%";
      btn.style.top = s.y + "%";
      btn.innerHTML = `<span class="tr-ring"></span><span class="tr-core">${icon(s.icon)}</span><span class="tr-label">${s.label}</span>`;
      btn.addEventListener("click", () => guess(s, btn));
      layer.appendChild(btn);
      markEls[s.id] = btn;
    });

    function setClue(i) {
      clueBox.querySelector("b").textContent = i + 1;
      clueBox.querySelector("p").textContent = rounds[i] ? rounds[i].clue : "";
      clueBox.classList.remove("is-flash");
      void clueBox.offsetWidth;
      clueBox.classList.add("is-flash");
    }
    setClue(0);
    hud(`<span class="ph-item">${icon("chest")} 线索 <b>1/3</b></span>`);

    function guess(spot, btn) {
      if (btn.classList.contains("is-right")) return;
      const target = rounds[round];
      if (spot.id === target.id) {
        btn.classList.add("is-right");
        round += 1;
        score += 30;
        M.audio.sfx("success");
        setCat(catEl, round >= 3 ? "laugh" : "happy", 1800);
        if (round >= 3) {
          timer.stop();
          const left = Math.max(0, TIME - Math.round((Date.now() - startedAt) / 1000));
          finish({
            win: true,
            title: "三段线索都接上了",
            subtitle: "宝箱在最后一段小路上，锁一碰就开了。",
            score: score + left * 2
          });
          return;
        }
        hud(`<span class="ph-item">${icon("chest")} 线索 <b>${round + 1}/3</b></span>`);
        setClue(round);
        M.pet.say("猜对了。下一条线索是：" + rounds[round].clue, 4200);
      } else {
        btn.classList.add("shake");
        setTimeout(() => btn.classList.remove("shake"), 500);
        M.audio.sfx("fail");
        setCat(catEl, "proud", 1500);
        timer.add(-8);
        M.pet.say("不是" + spot.label + "。再看一眼线索。", 2200);
      }
    }

    const timer = countdown(TIME, (r) => {
      let el = hudEl.querySelector(".ph-time b");
      if (el) el.textContent = r;
      else hudEl.insertAdjacentHTML("beforeend", `<span class="ph-item ph-time">${icon("timer")} <b>${r}</b>s</span>`);
    }, () => finish({ win: false, title: "天黑了", subtitle: "森林里的灯笼会一盏盏灭掉，明天再来吧。", score: score }));

    cleanups.push(() => timer.stop());
  }

  /* ---------- 小游戏五：小猫快跑（三条跑道 · 地铁跑酷式） ---------- */
  function gameRun() {
    const def = gameDef("run") || {};
    const TARGET = def.target || 300;
    stageEl.innerHTML = `<canvas class="sg-canvas"></canvas>
      <div class="sg-hint">← → 或左右滑动换道 · 空格 / 上滑起跳 · 四条命</div>`;
    const cv = stageEl.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const W = 900, H = 1125;
    cv.width = W; cv.height = H;

    const HORIZON = H * 0.16;
    const CAT_Y = H * 0.83;
    const LANE_X = [W * 0.25, W * 0.5, W * 0.75];
    const BLOCK = ["prop-trashbin", "prop-vacuum", "prop-gift"].map(PROP);   // 必须换道
    const LOW = ["prop-broom", "prop-pillow"].map(PROP);                      // 可以跳过
    const runUrl = catSrc("act-run");
    const jumpUrl = catSrc("act-jump");
    const bumpUrl = catSrc("act-bump");
    const fishUrl = PROP("snack-fish");

    preload(BLOCK.concat(LOW, [runUrl, jumpUrl, bumpUrl, fishUrl, C.sceneAssets.home])).then(() => {
      const st = {
        running: true, t: 0, dist: 0, speed: 1, lane: 1, laneVis: 1,
        jump: 0, vy: 0, lives: 4, inv: 0, combo: 0, bestCombo: 0, fish: 0,
        items: [], sparks: [], spawnAt: 2.2, fishAt: 0.9, shake: 0, hitAt: -9, bonusLife: 0, expr: "act-run"
      };
      let last = performance.now();

      const lanePos = (lane, p) => W / 2 + (LANE_X[lane] - W / 2) * (0.12 + 0.88 * Math.pow(p, 1.6));
      const rowY = (p) => HORIZON + (CAT_Y - HORIZON) * Math.pow(Math.max(0, p), 2.05);
      const rowScale = (p) => 0.3 + 0.82 * Math.pow(Math.max(0, p), 1.35);

      function spawn(kind) {
        const lane = Math.floor(Math.random() * 3);
        if (kind === "fish") {
          st.items.push({ kind: "fish", lane: lane, p: 0, got: false });
        } else {
          const jumpable = Math.random() < 0.5;
          const img = jumpable ? LOW[Math.floor(Math.random() * LOW.length)] : BLOCK[Math.floor(Math.random() * BLOCK.length)];
          st.items.push({ kind: "obs", lane: lane, p: 0, img: img, jumpable: jumpable, hit: false });
        }
      }

      function jump() {
        if (!st.running || st.jump > 0 || st.vy < 0) return;
        st.vy = -820;
        M.audio.sfx("tap");
      }
      function shift(dir) {
        if (!st.running) return;
        const next = Math.max(0, Math.min(2, st.lane + dir));
        if (next === st.lane) {
          st.shake = 0.25;
          return;
        }
        st.lane = next;
        st.shake = -0.35;
        M.audio.sfx("soft");
      }

      function drawRoad() {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#F6DCC2");
        sky.addColorStop(0.42, "#F3E4CE");
        sky.addColorStop(1, "#E8D2B4");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

        // 远山
        ctx.fillStyle = "rgba(150,168,138,0.32)";
        for (let i = 0; i < 4; i++) {
          const cx = ((i * 260 - st.dist * 2.4) % (W + 300)) - 150;
          ctx.beginPath();
          ctx.arc(cx, HORIZON + 40, 130 + i % 2 * 40, Math.PI, 0);
          ctx.fill();
        }

        // 路面
        const road = ctx.createLinearGradient(0, HORIZON, 0, H);
        road.addColorStop(0, "#DCC3A1");
        road.addColorStop(1, "#C6A47C");
        ctx.beginPath();
        ctx.moveTo(W / 2 - 34, HORIZON);
        ctx.lineTo(W / 2 + 34, HORIZON);
        ctx.lineTo(W + 60, H);
        ctx.lineTo(-60, H);
        ctx.closePath();
        ctx.fillStyle = road;
        ctx.fill();

        // 三条跑道的分隔线
        ctx.strokeStyle = "rgba(120,92,58,0.32)";
        ctx.lineWidth = 3;
        [-1, 1].forEach((k) => {
          ctx.beginPath();
          ctx.moveTo(W / 2 + k * 34 * 0.5, HORIZON);
          ctx.lineTo(W / 2 + k * W * 0.25 * 1.42, H);
          ctx.stroke();
        });

        // 路面虚线，随距离滚动
        ctx.strokeStyle = "rgba(255,246,226,0.5)";
        for (let i = 0; i < 12; i++) {
          const p = ((i / 12) + (st.dist / 48) % (1 / 12)) % 1;
          const y = rowY(p);
          const w = 40 * rowScale(p);
          [-1, 1].forEach((k) => {
            const x = W / 2 + k * (W * 0.25) * (0.12 + 0.88 * Math.pow(p, 1.6)) * 0.62;
            ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.stroke();
          });
        }
      }

      function drawItem(it) {
        const p = it.p;
        const y = rowY(p);
        const x = lanePos(it.lane, p);
        const sc = rowScale(p);

        if (it.kind === "fish") {
          const img = imgCache[fishUrl];
          const size = 70 * sc;
          if (img) {
            ctx.save();
            ctx.globalAlpha = it.got ? 0 : 1;
            ctx.translate(x, y - 40 * sc);
            ctx.rotate(Math.sin(st.t * 2 + p * 6) * 0.14);
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
          }
          return;
        }

        const img = imgCache[it.img];
        const size = 150 * sc;
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#2a1d10";
        ctx.beginPath(); ctx.ellipse(x, y, size * 0.34, size * 0.1, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = it.hit ? 0.25 : 1;
        if (img) ctx.drawImage(img, x - size / 2, y - size * 0.92, size, size);
        else { ctx.fillStyle = "#b98a58"; ctx.fillRect(x - size / 2, y - size, size, size); }
        ctx.globalAlpha = 1;

        // 可跳过的低障碍给个小箭头提示
        if (it.jumpable && p > 0.55) {
          ctx.fillStyle = "rgba(255,246,226,0.85)";
          ctx.font = "600 26px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("↑", x, y - size - 10);
          ctx.textAlign = "left";
        }
      }

      function drawCat() {
        const x = LANE_X[st.laneVis];
        const airborne = st.jump > 4;
        const bump = st.t - st.hitAt < 0.5;
        const img = imgCache[bump ? bumpUrl : airborne ? jumpUrl : runUrl];
        const size = 330;
        const bob = airborne ? 0 : Math.sin(st.t * 12) * 5;
        const sh = Math.max(0.25, 1 - st.jump / 300);
        ctx.globalAlpha = 0.34 * sh;
        ctx.fillStyle = "#2a1d10";
        ctx.beginPath(); ctx.ellipse(x + 10, CAT_Y + 8, 120 * sh, 24 * sh, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = st.inv > 0 && Math.floor(st.t * 12) % 2 ? 0.45 : 1;
        ctx.save();
        ctx.translate(x, CAT_Y - st.jump + bob);
        ctx.rotate(airborne ? -0.16 : Math.sin(st.t * 12) * 0.035);
        if (img) ctx.drawImage(img, -size / 2, -size, size, size);
        else { ctx.fillStyle = "#c49a63"; ctx.fillRect(-size / 2, -size, size, size); }
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      function hudText() {
        ctx.fillStyle = "rgba(30,22,14,0.5)";
        ctx.fillRect(0, 0, W, 96);
        ctx.fillStyle = "#FFF6E8";
        ctx.font = "600 44px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText(Math.floor(st.dist) + " m", 40, 62);
        ctx.font = "600 34px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("♥ " + st.lives + "   ·   🐟 " + st.fish + (st.combo > 1 ? "   ×" + st.combo : ""), W / 2, 60);
        ctx.textAlign = "right";
        ctx.font = "500 28px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText("目标 " + TARGET + " m", W - 40, 60);
        ctx.textAlign = "left";
      }

      function loop(now) {
        if (!st.running) return;
        const dt = Math.min(0.045, (now - last) / 1000);
        last = now;
        st.t += dt;

        // 速度与距离
        st.speed = Math.min(2.4, st.speed + dt * 0.05);
        st.dist += dt * 13 * st.speed;

        // 每 80 米补一条命，鼓励往前冲
        if (st.dist >= (st.bonusLife + 1) * 80) {
          st.bonusLife += 1;
          if (st.lives < 6) st.lives += 1;
          M.audio.sfx("coin");
        }

        // 跳跃
        if (st.jump > 0 || st.vy < 0) {
          st.jump += -st.vy * dt;
          st.vy += 2100 * dt;
          if (st.jump <= 0) { st.jump = 0; st.vy = 0; }
        }
        st.laneVis += (Math.max(0, Math.min(2, st.lane)) - st.laneVis) * Math.min(1, dt * 12);
        st.inv = Math.max(0, st.inv - dt);
        st.shake = st.shake * Math.max(0, 1 - dt * 9);

        // 生成
        st.spawnAt -= dt;
        if (st.spawnAt <= 0) {
          spawn("obs");
          st.spawnAt = (0.95 + Math.random() * 0.6) / st.speed * 1.3;
        }
        st.fishAt -= dt;
        if (st.fishAt <= 0) {
          spawn("fish");
          st.fishAt = (0.34 + Math.random() * 0.5) / st.speed;
          if (Math.random() < 0.35) spawn("fish");
        }

        // 推进与判定
        for (const it of st.items) {
          it.p += dt * st.speed / 1.9;
          if (it.kind === "fish") {
            if (!it.got && it.p >= 0.9 && it.p <= 1.05 && it.lane === st.lane) {
              it.got = true;
              st.combo += 1;
              st.bestCombo = Math.max(st.bestCombo, st.combo);
              st.fish += 1;
              st.dist += 2;
              M.audio.sfx("coin");
              for (let i = 0; i < 5; i++) st.sparks.push({ x: lanePos(it.lane, it.p), y: rowY(it.p) - 40, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 220, life: 0.55 });
            }
          } else if (!it.hit && it.p >= 0.96 && it.p <= 1.06 && it.lane === st.lane) {
            const clear = it.jumpable ? st.jump > 96 : false;
            if (!clear) {
              it.hit = true;
              st.lives -= 1;
              st.combo = 0;
              st.inv = 1.4;
              st.hitAt = st.t;
              st.shake = 1;
              M.audio.sfx("fail");
              if (st.lives <= 0) { end(true); return; }
            }
          }
        }
        st.items = st.items.filter((it) => it.p < 1.6 && !(it.got && it.p > 1.3) && !(it.hit && it.p > 1.3));

        // 绘制
        ctx.save();
        ctx.translate((Math.random() - 0.5) * st.shake * 22, (Math.random() - 0.5) * st.shake * 14);
        drawRoad();
        const sorted = st.items.slice().sort((a, b) => a.p - b.p);
        sorted.forEach(drawItem);
        drawCat();
        for (const sp of st.sparks) {
          sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 320 * dt; sp.life -= dt;
          ctx.globalAlpha = Math.max(0, sp.life * 1.6);
          ctx.fillStyle = "#FFE9B0";
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 6, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        }
        st.sparks = st.sparks.filter((sp) => sp.life > 0);
        hudText();
        ctx.restore();

        hud(`<span class="ph-item">${icon("paw")} ${Math.floor(st.dist)} m</span><span class="ph-item">${icon("heart")} <b>${st.lives}</b></span>${st.fish ? `<span class="ph-item">${icon("fish")} <b>${st.fish}</b></span>` : ""}${st.combo > 1 ? `<span class="ph-combo">连击 ×${st.combo}</span>` : ""}`);

        if (st.dist >= TARGET) { end(false); return; }
        requestAnimationFrame(loop);
      }

      function end(crashed) {
        if (!st.running) return;
        st.running = false;
        const score = Math.floor(st.dist) + st.lives * 25 + st.fish * 6;
        const win = !crashed || st.dist >= TARGET;
        finish({
          win: win,
          title: crashed ? (win ? "三条命刚好用完，也跑到了" : "被撞掉了最后一条命") : "跑到终点了",
          subtitle: `${Math.floor(st.dist)} 米 · 小鱼干 ${st.fish} 条 · 最高连击 ${st.bestCombo} · 剩 ${st.lives} 条命`,
          score: score
        });
      }

      const kh = (e) => {
        if (!st.running) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); shift(-1); }
        else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); shift(1); }
        else if (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W") { e.preventDefault(); if (!e.repeat) jump(); }
      };
      let dx0 = 0, dy0 = 0, downAt = 0;
      const onDown = (e) => { dx0 = e.clientX; dy0 = e.clientY; downAt = Date.now(); };
      const onUp = (e) => {
        if (!st.running) return;
        const dx = e.clientX - dx0, dy = e.clientY - dy0;
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) shift(dx > 0 ? 1 : -1);
        else if (dy < -40) jump();
        else if (Date.now() - downAt < 260 && Math.abs(dx) < 20 && Math.abs(dy) < 20) jump();
      };
      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointerup", onUp);
      window.addEventListener("keydown", kh);
      cleanups.push(() => {
        st.running = false;
        cv.removeEventListener("pointerdown", onDown);
        cv.removeEventListener("pointerup", onUp);
        window.removeEventListener("keydown", kh);
      });

      requestAnimationFrame(loop);
    });
  }

  /* ---------- 小游戏六：小猫钓鱼 ---------- */
  function gameFish() {
    const def = gameDef("fish") || {};
    const TARGET = def.target || 5;
    const TIME = 60;
    stageEl.innerHTML = `<canvas class="sg-canvas"></canvas>
      <div class="sg-hint">点一下抛竿（力度条决定距离）· 浮标沉下去的瞬间再点一下收竿</div>`;
    const cv = stageEl.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const W = 900, H = 1125;
    cv.width = W; cv.height = H;

    const catUrl = catSrc("focus");
    const happyUrl = catSrc("happy");
    const sadUrl = catSrc("proud");
    const fishUrl = PROP("snack-fish");

    preload([C.sceneAssets.lake, catUrl, happyUrl, sadUrl, fishUrl]).then(() => {
      const bg = imgCache[C.sceneAssets.lake];
      const st = {
        running: true, t: 0, phase: "aim", power: 0,
        cast: 0, waitUntil: 0, biteAt: 0, resultAt: 0, caught: 0, combo: 0,
        bestCombo: 0, score: 0, lastPoints: 0, lastSize: "", expr: catUrl, shakes: []
      };
      let last = performance.now();

      const CAT_X = W * 0.17, CAT_Y = H * 0.9;
      const WATER_TOP = H * 0.44;
      const ROD_TIP = { x: CAT_X + 250, y: WATER_TOP + 80 };
      const ROD_GRIP = { x: CAT_X + 66, y: CAT_Y - 34 };
      const floatX = () => W * 0.34 + st.cast * W * 0.5;
      const floatY = () => H * 0.52 + Math.sin(st.t * 2.2) * 6;

      function press() {
        if (!st.running) return;
        if (st.phase === "aim") {
          st.cast = 0.15 + 0.85 * st.power;
          st.phase = "wait";
          st.waitUntil = st.t + 1.3 + Math.random() * 2.1;
          st.expr = catUrl;
          st.shakes.push({ x: floatX(), y: floatY(), life: 0.6, r: 8 });
          M.audio.sfx("splash");
        } else if (st.phase === "wait") {
          // 太早收竿
          miss("还没咬钩，你收得太早了。");
        } else if (st.phase === "bite") {
          hook();
        }
      }

      function miss(text) {
        st.phase = "result";
        st.resultAt = st.t + 0.9;
        st.lastPoints = 0;
        st.lastSize = text || "跑掉了";
        st.combo = 0;
        st.expr = sadUrl;
        M.audio.sfx("fail");
        catSays(text || "鱼跑掉了，她盯着水面看了很久。");
      }

      function hook() {
        const size = 0.35 + st.cast * 0.9;
        const bonus = st.combo >= 2 ? Math.min(3, Math.floor(st.combo / 2)) : 0;
        st.lastPoints = Math.round(8 + size * 16) + bonus * 3;
        st.score += st.lastPoints;
        st.caught += 1;
        st.combo += 1;
        st.bestCombo = Math.max(st.bestCombo, st.combo);
        st.lastSize = size > 1 ? "一条大胖鱼" : size > 0.75 ? "一条不错的鱼" : "一条小鱼";
        st.phase = "result";
        st.resultAt = st.t + 1.1;
        st.expr = happyUrl;
        M.audio.sfx("success");
        for (let i = 0; i < 10; i++) {
          st.shakes.push({ x: floatX(), y: floatY(), life: 0.7, r: 6 + Math.random() * 8 });
        }
        hud(`<span class="ph-item">${icon("fish")} 已钓 <b>${st.caught}/${TARGET}</b></span>${st.combo > 1 ? `<span class="ph-combo">连击 ×${st.combo}</span>` : ""}`);
      }

      function drawScene() {
        if (bg && bg.width) {
          const sr = bg.width / bg.height, dr = W / H;
          let sw = bg.width, sh = bg.height, sx = 0, sy = 0;
          if (sr > dr) { sw = bg.height * dr; sx = (bg.width - sw) / 2; }
          else { sh = bg.width / dr; sy = (bg.height - sh) / 2; }
          ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, W, H);
        } else { ctx.fillStyle = "#B9CDBE"; ctx.fillRect(0, 0, W, H); }
        // 水面
        const wg = ctx.createLinearGradient(0, WATER_TOP, 0, H);
        wg.addColorStop(0, "rgba(96,132,118,0.55)");
        wg.addColorStop(1, "rgba(42,70,66,0.78)");
        ctx.fillStyle = wg;
        ctx.fillRect(0, WATER_TOP, W, H - WATER_TOP);
        // 波纹
        ctx.strokeStyle = "rgba(255,246,226,0.22)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          const y = WATER_TOP + 30 + ((i * 70 + st.t * 16) % (H - WATER_TOP - 40));
          ctx.beginPath();
          for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin((x + st.t * 40) / 70) * 5);
          ctx.stroke();
        }
        // 码头
        ctx.fillStyle = "#9A7350";
        ctx.fillRect(0, H * 0.82, W * 0.52, 26);
        ctx.fillStyle = "#B78C61";
        ctx.fillRect(0, H * 0.82, W * 0.52, 10);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = "#7E5C3F";
          ctx.fillRect(20 + i * 74, H * 0.855, 10, 90);
        }
      }

      function drawCat() {
        const img = imgCache[st.expr] || imgCache[catUrl];
        const size = 300;
        ctx.save();
        ctx.translate(CAT_X, CAT_Y);
        ctx.rotate(-0.03);
        if (img) ctx.drawImage(img, -size / 2, -size, size, size);
        ctx.restore();
      }

      function drawRod() {
        const fx = floatX(), fy = floatY();
        // 鱼竿：从猫爪里伸出去，先画竿身
        ctx.lineCap = "round";
        ctx.strokeStyle = "#6B4A2A";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(ROD_GRIP.x, ROD_GRIP.y);
        ctx.quadraticCurveTo(ROD_GRIP.x + 60, ROD_GRIP.y - 260, ROD_TIP.x, ROD_TIP.y);
        ctx.stroke();
        ctx.strokeStyle = "#9A7347";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ROD_GRIP.x, ROD_GRIP.y);
        ctx.quadraticCurveTo(ROD_GRIP.x + 60, ROD_GRIP.y - 260, ROD_TIP.x, ROD_TIP.y);
        ctx.stroke();
        // 握把与猫爪
        ctx.fillStyle = "#3F2B18";
        ctx.beginPath(); ctx.ellipse(ROD_GRIP.x, ROD_GRIP.y, 11, 16, -0.4, 0, 7); ctx.fill();
        ctx.fillStyle = "#D9B07C";
        ctx.beginPath(); ctx.ellipse(ROD_GRIP.x - 2, ROD_GRIP.y - 6, 13, 9, -0.2, 0, 7); ctx.fill();
        // 鱼线
        ctx.strokeStyle = "rgba(255,250,235,0.62)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
        ctx.quadraticCurveTo((ROD_TIP.x + fx) / 2, Math.min(ROD_TIP.y, fy) + 40, fx, fy);
        ctx.stroke();
        // 浮标
        const dip = st.phase === "bite" ? 14 : 0;
        ctx.fillStyle = "#F4E3C6";
        ctx.beginPath(); ctx.arc(fx, fy + dip, 13, 0, 7); ctx.fill();
        ctx.fillStyle = "#D96C4F";
        ctx.beginPath(); ctx.arc(fx, fy + dip - 6, 8, Math.PI, 0); ctx.fill();
        // 咬钩水花
        if (st.phase === "bite") {
          ctx.strokeStyle = "rgba(255,246,226,0.8)";
          ctx.lineWidth = 3;
          const r = 22 + (st.t - st.biteAt) * 60;
          ctx.beginPath(); ctx.arc(fx, fy + 8, r, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.arc(fx, fy + 8, r * 0.6, 0, 7); ctx.stroke();
          ctx.fillStyle = "#FFF3DB";
          ctx.font = "700 40px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
          ctx.fillText("!", fx - 8, fy - 46);
        }
      }

      function drawPower() {
        if (st.phase !== "aim") return;
        const x = W * 0.32, w = W * 0.5, y = H * 0.95;
        ctx.fillStyle = "rgba(20,16,10,0.4)";
        ctx.fillRect(x, y, w, 16);
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, "#F0D6A8"); g.addColorStop(0.6, "#E8B46B"); g.addColorStop(1, "#D9774F");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w * st.power, 16);
        ctx.fillStyle = "rgba(255,246,226,0.8)";
        ctx.fillRect(x + w * st.power - 3, y - 6, 6, 28);
      }

      function drawFishRise() {
        if (st.phase !== "result" || !st.lastPoints) return;
        const k = Math.min(1, (st.t - (st.resultAt - 1.1)) / 0.9);
        const fx = floatX(), fy = floatY() - k * 120;
        const img = imgCache[fishUrl];
        const size = 70 + st.cast * 60;
        if (img) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, 1.4 - k);
          ctx.translate(fx, fy);
          ctx.rotate(Math.sin(st.t * 6) * 0.2);
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#FFF6E8";
        ctx.font = "700 34px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText("+" + st.lastPoints, fx + 10, fy - 40);
      }

      function loop(now) {
        if (!st.running) return;
        const dt = Math.min(0.045, (now - last) / 1000);
        last = now;
        st.t += dt;

        if (st.phase === "aim") {
          st.power = (Math.sin(st.t * 3.1) + 1) / 2;
        } else if (st.phase === "wait") {
          if (st.t >= st.waitUntil) {
            st.phase = "bite";
            st.biteAt = st.t;
            st.expr = catUrl;
            M.audio.sfx("bite");
          }
        } else if (st.phase === "bite") {
          if (st.t - st.biteAt > 0.92) miss("浮标沉下去又浮回来，鱼把饵吃了。");
        } else if (st.phase === "result") {
          if (st.t >= st.resultAt) {
            st.phase = "aim";
            st.cast = 0;
            st.expr = catUrl;
            st.lastPoints = 0;
          }
        }

        drawScene();
        drawRod();
        drawFishRise();
        drawCat();
        drawPower();

        for (const s of st.shakes) {
          s.life -= dt;
          ctx.strokeStyle = "rgba(255,246,226," + Math.max(0, s.life) + ")";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r + (0.7 - s.life) * 60, 0, 7); ctx.stroke();
        }
        st.shakes = st.shakes.filter((s) => s.life > 0);

        ctx.fillStyle = "rgba(30,22,14,0.46)";
        ctx.fillRect(0, 0, W, 92);
        ctx.fillStyle = "#FFF6E8";
        ctx.font = "600 40px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText("🐟 " + st.caught + " / " + TARGET, 40, 60);
        ctx.textAlign = "right";
        ctx.font = "500 28px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText(st.score + " 分" + (st.combo > 1 ? " · 连击 ×" + st.combo : ""), W - 40, 60);
        ctx.textAlign = "left";

        if (st.caught >= TARGET && st.phase === "result" && st.t >= st.resultAt + 0.2) { end(false); return; }
        requestAnimationFrame(loop);
      }

      function end(timeout) {
        if (!st.running) return;
        st.running = false;
        const win = st.caught >= TARGET;
        finish({
          win: win,
          title: win ? "鱼篓装满了" : "天色暗下来了",
          subtitle: `${st.caught} 条鱼 · ${st.score} 分 · 最高连击 ${st.bestCombo}${timeout && !win ? " · 时间到" : ""}`,
          score: st.score
        });
      }

      cv.addEventListener("pointerdown", (e) => { e.preventDefault(); press(); });
      const kh = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); press(); } };
      window.addEventListener("keydown", kh);
      cleanups.push(() => { st.running = false; window.removeEventListener("keydown", kh); });

      const timer = countdown(TIME, (r) => {
        let el = hudEl.querySelector(".ph-time b");
        if (el) el.textContent = r;
        else hudEl.insertAdjacentHTML("beforeend", `<span class="ph-item ph-time">${icon("timer")} <b>${r}</b>s</span>`);
      }, () => end(true));
      cleanups.push(() => timer.stop());

      hud(`<span class="ph-item">${icon("fish")} 已钓 <b>0/${TARGET}</b></span>`);
      requestAnimationFrame(loop);
    });
  }

  const IMPL = { snack: gameSnack, catch: gameCatch, memory: gameMemory, treasure: gameTreasure, run: gameRun, fish: gameFish };

  /* ---------- 打开 / 关闭 ---------- */
  function start(id) {
    cleanup();
    currentId = id;
    const def = gameDef(id);
    if (!def || !IMPL[id]) return;
    // 把焦点从入口按钮上拿开，否则空格会再次触发“再玩一次”
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    titleEl.textContent = def.name;
    subEl.textContent = def.tagline || "";
    hudEl.innerHTML = "";
    footEl.innerHTML = `<span class="play-tip">${def.desc || ""}</span>`;
    const res = stageEl.querySelector(".play-result");
    if (res) res.remove();
    stageEl.className = "play-stage game-" + id;
    IMPL[id]();
    M.audio.unlock();
    M.audio.sfx("open");
  }

  function open(id) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    start(id);
  }

  function close() {
    cleanup();
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    stageEl.innerHTML = "";
    currentId = null;
    M.audio.sfx("close");
    M.ui.hud.update();
    if (M.world.current) M.world.refresh();
  }

  M.games = {
    init(refs) {
      modal = refs.modal; stageEl = refs.stage; titleEl = refs.title; subEl = refs.sub;
      hudEl = refs.hud; footEl = refs.foot; quitBtn = refs.quit;
      quitBtn.addEventListener("click", close);
      modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("open")) close();
      });
    },
    open, close, start,
    get current() { return currentId; }
  };
})();
