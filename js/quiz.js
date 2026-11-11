/* ============================================================
 * quiz.js · 默契测试
 * 八道关于眉姐姐的小题，答完给默契称号，顺便攒一点星星。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const Q = C.quiz || { questions: [], tiers: [] };
  const icon = (n) => window.MOMO_ICONS[n] || "";

  let idx = 0, correct = 0, answered = false, chosen = -1, finished = false;

  function tierOf(score) {
    const list = (Q.tiers || []).slice().sort((a, b) => b.min - a.min);
    return list.find((t) => score >= t.min) || (list[list.length - 1] || { title: "刚认识", desc: "" });
  }

  function reset() { idx = 0; correct = 0; answered = false; chosen = -1; finished = false; }

  function render() {
    if (finished) return resultView();
    const total = Q.questions.length;
    const q = Q.questions[idx];
    const pct = Math.round((idx / total) * 100);
    const opts = q.options.map((o, i) => {
      let cls = "qz-opt";
      if (answered) {
        if (i === q.answer) cls += " is-right";
        else if (i === chosen) cls += " is-wrong";
        else cls += " is-dim";
      }
      return `<button class="${cls}" data-opt="${i}" ${answered ? "disabled" : ""}>
        <span class="qo-index">${String.fromCharCode(65 + i)}</span><span>${o}</span>
      </button>`;
    }).join("");

    M.ui.panel({
      title: Q.title || "默契测试",
      subtitle: `${idx + 1} / ${total} · 已经答对 ${correct} 题`,
      extra: `<span class="panel-count">${M.state.quiz ? M.state.quiz.best : 0} 分</span>`,
      body: `
        <div class="qz-progress"><i style="width:${pct}%"></i></div>
        <div class="qz-card">
          <span class="qz-kicker">第 ${idx + 1} 题</span>
          <h3>${q.q}</h3>
          <div class="qz-opts">${opts}</div>
          ${answered ? `<div class="qz-tip ${chosen === q.answer ? "ok" : "bad"}">
            <b>${chosen === q.answer ? "答对了" : "答案是：" + q.options[q.answer]}</b>
            <p>${q.tip || ""}</p>
          </div>` : `<p class="qz-hint">${Q.intro || ""}</p>`}
        </div>
        ${answered ? `<div class="qz-foot"><button class="btn primary" data-next>${idx + 1 >= total ? "看看结果" : "下一题"}</button></div>` : ""}`,
      onMount: (el) => {
        el.querySelectorAll("[data-opt]").forEach((b) => {
          b.addEventListener("click", () => {
            if (answered) return;
            chosen = Number(b.getAttribute("data-opt"));
            answered = true;
            if (chosen === q.answer) { correct += 1; M.audio.sfx("coin"); M.pet.setExpr("laugh", 1400); }
            else { M.audio.sfx("fail"); M.pet.setExpr("scared", 1600); }
            render();
          });
        });
        const next = el.querySelector("[data-next]");
        if (next) next.addEventListener("click", () => {
          M.audio.sfx("tap");
          if (idx + 1 >= total) { finished = true; settle(); render(); }
          else { idx += 1; answered = false; chosen = -1; render(); }
        });
      }
    });
  }

  function settle() {
    const total = Q.questions.length;
    const score = Math.round((correct / total) * 100);
    const st = M.state.quiz || (M.state.quiz = { best: 0, plays: 0, last: 0 });
    st.plays += 1;
    st.last = score;
    if (score > st.best) st.best = score;
    const reward = ((Q.reward && Q.reward.coins) || 20) + correct * 3;
    M.addCoins(reward);
    M.addAttr({ bond: 3, happy: 4 });
    M.save();
    M.pet.burst("heart", 5);
    M.audio.sfx("success");
  }

  function resultView() {
    const total = Q.questions.length;
    const score = Math.round((correct / total) * 100);
    const tier = tierOf(score);
    const reward = ((Q.reward && Q.reward.coins) || 20) + correct * 3;
    M.ui.panel({
      title: "测试结果",
      subtitle: `${M.state.quiz.best} 分是最懂她的一次`,
      body: `
        <div class="qz-result">
          <span class="qz-badge">${icon("heart")}</span>
          <p class="qz-score">${score}<i>分</i></p>
          <h2>${tier.title}</h2>
          <p class="qz-desc">${tier.desc}</p>
          <div class="qz-stats">
            <span><i>答对</i><b>${correct}/${total}</b></span>
            <span><i>星星</i><b>+${reward}</b></span>
            <span><i>亲密度</i><b>+3</b></span>
          </div>
        </div>
        <p class="set-foot">${score >= 80 ? "她好像挺高兴你记得这么清楚。去换装间挑一件奖励一下？" : "再陪她几天，很多答案就自然记住了。"}</p>`,
      onMount: (el) => {},
      actions: null
    });
    // 面板底部按钮
    const panel = document.getElementById("panel");
    if (panel && !panel.querySelector(".qz-acts")) {
      const bar = document.createElement("div");
      bar.className = "qz-acts";
      bar.innerHTML = `<button class="btn primary" data-again>再测一次</button><button class="btn ghost" data-home>回世界</button>`;
      panel.querySelector(".panel-body").appendChild(bar);
      bar.querySelector("[data-again]").addEventListener("click", () => { reset(); render(); });
      bar.querySelector("[data-home]").addEventListener("click", () => { M.ui.closePanel(); });
    }
  }

  function open() { reset(); render(); }

  M.quiz = { open };
})();
