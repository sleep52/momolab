  /* ---------- 小游戏五：小猫快跑（三条跑道 · 地铁跑酷式） ---------- */
  function gameRun() {
    const def = gameDef("run") || {};
    const TARGET = def.target || 300;
    stageEl.innerHTML = `<canvas class="sg-canvas"></canvas>
      <div class="sg-hint">← → 或左右滑动换道 · 空格 / 上滑起跳 · 三条命</div>`;
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
        jump: 0, vy: 0, lives: 3, inv: 0, combo: 0, bestCombo: 0, fish: 0,
        items: [], sparks: [], spawnAt: 0.8, fishAt: 0.5, shake: 0, hitAt: -9, expr: "act-run"
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
          const jumpable = Math.random() < 0.42;
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
        st.speed = Math.min(2.9, st.speed + dt * 0.085);
        st.dist += dt * 9 * st.speed;

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
          st.spawnAt = (0.52 + Math.random() * 0.4) / st.speed * 1.35;
        }
        st.fishAt -= dt;
        if (st.fishAt <= 0) {
          spawn("fish");
          st.fishAt = (0.34 + Math.random() * 0.5) / st.speed;
          if (Math.random() < 0.35) spawn("fish");
        }

        // 推进与判定
        for (const it of st.items) {
          it.p += dt * st.speed / 1.55;
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
          } else if (!it.hit && it.p >= 0.9 && it.p <= 1.04 && it.lane === st.lane) {
            const clear = it.jumpable ? st.jump > 110 : st.jump > 260;
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
      const ROD_TIP = { x: CAT_X + 96, y: CAT_Y - 226 };
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
        ctx.strokeStyle = "rgba(90,64,38,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
        ctx.quadraticCurveTo((ROD_TIP.x + fx) / 2, Math.min(ROD_TIP.y, fy) - 40, fx, fy);
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
          if (st.t - st.biteAt > 0.62) miss("浮标沉下去又浮回来，鱼把饵吃了。");
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

        if (st.caught >= TARGET) { end(false); return; }
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
