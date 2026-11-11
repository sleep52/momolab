/* ============================================================
 * album.js · 宠物相册
 * 拍照生成的图片压缩后存在 localStorage，可下载、可分享。
 * ============================================================ */
(function () {
  const M = (window.MOMO = window.MOMO || {});
  const C = window.MOMO_CONFIG;
  const MAX = 12;

  function list() { return M.loadAlbum(); }

  function add(entry) {
    const all = list();
    all.push(entry);
    while (all.length > MAX) all.shift();
    M.saveAlbum(all);
    return all;
  }

  function remove(id) {
    const all = list().filter((e) => e.id !== id);
    M.saveAlbum(all);
    return all;
  }

  function dataURLtoBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)[1];
    const bin = atob(parts[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function download(entry) {
    const a = document.createElement("a");
    a.href = entry.dataUrl;
    a.download = `${C.petName}-${entry.date}-${entry.areaName}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    M.toast("照片已开始下载");
    M.audio.sfx("coin");
  }

  async function share(entry) {
    try {
      const blob = dataURLtoBlob(entry.dataUrl);
      const file = new File([blob], `${C.petName}-${entry.date}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: C.gameName, text: `${C.petName} 在${entry.areaName}的合影` });
        return;
      }
    } catch (e) { /* 用户取消或不支持 */ }
    M.toast("这台设备不支持直接分享，可以先下载图片再发出去", "warn");
  }

  function detail(entry) {
    const idx = list().findIndex((e) => e.id === entry.id);
    M.ui.sheet({
      title: entry.caption || "游戏瞬间",
      subtitle: entry.date + " · " + entry.areaName,
      body: `<div class="photo-detail"><img src="${entry.dataUrl}" alt=""></div>
        <div class="photo-note">${idx === 0 ? "这是相册里的第一张。" : "第 " + (idx + 1) + " 张回忆。"}</div>`,
      actions: [
        { label: "下载图片", primary: true, onClick: () => download(entry) },
        { label: "分享", onClick: () => share(entry) },
        { label: "删除这张", onClick: () => {
            M.ui.closeSheet();
            remove(entry.id);
            M.toast("已删除这张照片");
            open(null);
          } }
      ]
    });
  }

  function open(_, focusId) {
    const all = list().slice().reverse();
    const empty = `<div class="empty-state">
      <span class="empty-ic">${window.MOMO_ICONS.camera}</span>
      <h3>相册还是空的</h3>
      <p>在世界里点「拍照」，就会把这一瞬间存下来。</p>
      <button class="btn primary" data-close-and-photo>去拍一张</button>
    </div>`;
    const grid = all.length ? `<div class="album-grid">${all.map((e) => `
      <button class="album-cell" data-id="${e.id}">
        <img src="${e.dataUrl}" alt="${e.caption || ""}" loading="lazy">
        <span class="album-cap">${e.areaName}</span>
      </button>`).join("")}</div>
      <p class="album-tip">相册保留最近 ${MAX} 张，长按或点击可以下载、分享。</p>` : empty;

    M.ui.panel({
      title: "相册",
      subtitle: `${C.petName} 的 ${list().length} 个瞬间`,
      body: grid,
      extra: `<span class="panel-count">${list().length}/${MAX}</span>`,
      onMount: (el) => {
        el.querySelectorAll(".album-cell").forEach((cell) => {
          cell.addEventListener("click", () => {
            const entry = list().find((e) => e.id === cell.getAttribute("data-id"));
            if (entry) detail(entry);
          });
        });
        const btn = el.querySelector("[data-close-and-photo]");
        if (btn) btn.addEventListener("click", () => { M.ui.closePanel(); M.interact.photo(); });
      }
    });
  }

  M.album = { add, list, remove, open, download, share, MAX };
})();
