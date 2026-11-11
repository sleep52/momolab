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
      <div class="sg-hint">把藏在屋里的 ${TOTAL} 份零食都找出来</div>`;
    const layer = stageEl.querySelector(".sg-layer");
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
        hud(`<span class="ph-item">${icon("fish")} 已找到 <b>${found}/${TOTAL}</b></span>`);
        if (found >= TOTAL) {
          timer.stop();
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

    preload(TOY_IMGS.concat([C.sceneAssets.lake])).then(() => {
      const bg = imgCache[C.sceneAssets.lake];
      const bgImg = bg;
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
      <div class="sg-hint">翻开两张一样的牌，把它们配对留下来</div>`;
    const grid = stageEl.querySelector(".mm-grid");
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
      <div class="tr-clue"><span class="clue-k">线索 <b>1</b>/3</span><p></p></div>`;
    const layer = stageEl.querySelector(".tr-layer");
    const clueBox = stageEl.querySelector(".tr-clue");
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

  /* ---------- 小游戏五：小猫快跑 ---------- */
  function gameRun() {
    const def = gameDef("run") || {};
    const TARGET = def.target || 300;
    stageEl.innerHTML = `<canvas class="sg-canvas"></canvas><div class="sg-hint">点屏幕 / 空格起跳 · 躲开花盆，顺手叼走小鱼干</div>`;
    const cv = stageEl.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const W = 900, H = 1125;
    cv.width = W; cv.height = H;

    const GROUND = H * 0.74;
    const CAT_X = 230;
    const OBS = ["prop-trashbin", "prop-broom", "prop-pillow", "prop-gift"].map(PROP);
    const catUrl = C.petCharacterAssets.basePath + C.petCharacterAssets.states.focus;
    const fishUrl = PROP("snack-fish");

    preload(OBS.concat([catUrl, fishUrl])).then(() => {
      const catImg = imgCache[catUrl];
      const fishImg = imgCache[fishUrl];
      const st = {
        running: true, t: 0, dist: 0, scoreFish: 0, speed: 330,
        jumpY: 0, vy: 0, jumps: 0,
        obstacles: [], fishes: [], sparks: [], nextObs: 0.9, nextFish: 0.7
      };
      let last = performance.now();

      function spawnObs() {
        const img = OBS[Math.floor(Math.random() * OBS.length)];
        const w = 108 + Math.random() * 58;
        st.obstacles.push({ img, x: W + w, w, h: w * 1.15 });
      }
      function spawnFish() {
        st.fishes.push({ x: W + 90, y: 70 + Math.random() * 210, r: 44, spin: Math.random() * 6 });
      }
      function jump() {
        if (!st.running || st.jumps >= 2) return;
        st.jumps += 1;
        st.vy = st.jumps === 1 ? -880 : -720;
        M.audio.sfx("tap");
      }

      function hills(offset) {
        ctx.fillStyle = "rgba(122,148,112,0.5)";
        ctx.beginPath();
        ctx.moveTo(0, GROUND + 30);
        for (let x = 0; x <= W; x += 60) {
          const y = GROUND - 80 - Math.sin((x + offset) / 150) * 46 - Math.sin((x + offset) / 70) * 14;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, GROUND + 30);
        ctx.closePath(); ctx.fill();
      }

      function drawCat() {
        const bob = st.jumpY > 0 ? 0 : Math.sin(st.t * 9) * 6;
        const tilt = st.jumpY > 0 ? -0.14 : Math.sin(st.t * 9) * 0.03;
        const size = 300;
        const by = GROUND - st.jumpY - size + bob;
        const sh = Math.max(0.28, 1 - st.jumpY / 460);
        ctx.globalAlpha = 0.4 * sh;
        ctx.fillStyle = "#2a1d10";
        ctx.beginPath(); ctx.ellipse(CAT_X + 14, GROUND + 6, 116 * sh, 22 * sh, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(CAT_X, by + size);
        ctx.rotate(tilt);
        if (catImg) ctx.drawImage(catImg, -size / 2, -size, size, size);
        else { ctx.fillStyle = "#c49a63"; ctx.fillRect(-size / 2, -size, size, size); }
        ctx.restore();
      }

      function loop(now) {
        if (!st.running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        st.t += dt;
        st.speed += dt * 12;
        st.dist += (st.speed * dt) / 9;

        if (st.jumpY > 0 || st.vy < 0) {
          st.jumpY += -st.vy * dt;
          st.vy += 2200 * dt;
          if (st.jumpY <= 0) { st.jumpY = 0; st.vy = 0; st.jumps = 0; }
        }

        st.nextObs -= dt;
        if (st.nextObs <= 0) { spawnObs(); st.nextObs = Math.max(0.6, 1.4 - st.speed / 900) * (0.85 + Math.random() * 0.55); }
        st.nextFish -= dt;
        if (st.nextFish <= 0) { spawnFish(); st.nextFish = 0.9 + Math.random() * 1.1; }

        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#f8dcc0"); sky.addColorStop(0.55, "#f2e4cc"); sky.addColorStop(1, "#e6d0b2");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        hills(st.dist * 4);
        ctx.fillStyle = "#c8a675";
        ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = "#b8956a";
        ctx.fillRect(0, GROUND, W, 14);
        ctx.strokeStyle = "rgba(120,90,55,0.32)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 16; i++) {
          const x = (((i * 90 - st.dist * 6) % (W + 120)) + W + 120) % (W + 120) - 60;
          ctx.beginPath(); ctx.moveTo(x, GROUND + 44); ctx.lineTo(x + 44, GROUND + 44); ctx.stroke();
        }

        for (const o of st.obstacles) {
          o.x -= st.speed * dt;
          const img = imgCache[o.img];
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = "#2a1d10";
          ctx.beginPath(); ctx.ellipse(o.x, GROUND + 4, o.w * 0.5, 15, 0, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
          if (img) ctx.drawImage(img, o.x - o.w / 2, GROUND - o.h, o.w, o.h);

          const catL = CAT_X - 62, catR = CAT_X + 90;
          const catTop = GROUND - st.jumpY - 248, catBottom = GROUND - st.jumpY - 12;
          const obsL = o.x - o.w * 0.36, obsR = o.x + o.w * 0.36;
          const obsTop = GROUND - o.h * 0.9;
          if (catR > obsL && catL < obsR && catBottom > obsTop) { crash(); return; }
        }
        st.obstacles = st.obstacles.filter((o) => o.x > -180);

        for (const f of st.fishes) {
          f.x -= st.speed * dt;
          f.spin += dt * 2.4;
          const fy = GROUND - f.y - 30 + Math.sin(st.t * 3 + f.spin) * 6;
          if (fishImg) {
            ctx.save();
            ctx.translate(f.x, fy);
            ctx.rotate(Math.sin(f.spin) * 0.2);
            ctx.drawImage(fishImg, -f.r, -f.r, f.r * 2, f.r * 2);
            ctx.restore();
          }
          const catCy = GROUND - st.jumpY - 150;
          if (Math.hypot(f.x - CAT_X, fy - catCy) < 104) {
            f.got = true;
            st.scoreFish += 1;
            st.dist += 12;
            M.audio.sfx("coin");
            for (let i = 0; i < 5; i++) st.sparks.push({ x: f.x, y: fy, vx: (Math.random() - .5) * 240, vy: -Math.random() * 200, life: 0.6 });
          }
        }
        st.fishes = st.fishes.filter((f) => !f.got && f.x > -100);

        for (const p of st.sparks) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = "#FFE9B0";
          ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        }
        st.sparks = st.sparks.filter((p) => p.life > 0);

        drawCat();

        ctx.fillStyle = "rgba(30,22,14,0.5)";
        ctx.fillRect(0, 0, W, 94);
        ctx.fillStyle = "#FFF6E8";
        ctx.font = "600 42px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.fillText(`${Math.floor(st.dist)} m`, 42, 62);
        ctx.font = "500 28px -apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`小鱼干 ${st.scoreFish} · 目标 ${TARGET} m`, W - 40, 60);
        ctx.textAlign = "left";

        hud(`<span class="ph-item">${icon("paw")} ${Math.floor(st.dist)} m</span>${st.scoreFish ? `<span class="ph-item">${icon("fish")} <b>${st.scoreFish}</b></span>` : ""}`);

        requestAnimationFrame(loop);
      }

      function crash() {
        if (!st.running) return;
        st.running = false;
        M.audio.sfx("fail");
        const score = Math.floor(st.dist);
        finish({
          win: score >= TARGET,
          title: score >= TARGET ? "跑得比她自己想的还远" : "撞上杂物了",
          subtitle: `${score} 米 · 捡到 ${st.scoreFish} 条小鱼干`,
          score
        });
      }

      const onJump = () => jump();
      const kh = (e) => { if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); if (!e.repeat) jump(); } };
      cv.addEventListener("pointerdown", onJump);
      window.addEventListener("keydown", kh);
      cleanups.push(() => { st.running = false; cv.removeEventListener("pointerdown", onJump); window.removeEventListener("keydown", kh); });

      requestAnimationFrame(loop);
    });
  }

  const IMPL = { snack: gameSnack, catch: gameCatch, memory: gameMemory, treasure: gameTreasure, run: gameRun };

  /* ---------- 打开 / 关闭 ---------- */
  function start(id) {
    cleanup();
    currentId = id;
    const def = gameDef(id);
    if (!def || !IMPL[id]) return;
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
