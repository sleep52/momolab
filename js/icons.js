/* 内联 SVG 图标：统一 currentColor、24 格、无外部依赖。
 * 游戏里不用 emoji 当图标或角色素材，全部走矢量线条。 */
(function () {
  const line = (d, extra) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ""}>${d}</svg>`;
  const solid = (d) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${d}</svg>`;

  window.MOMO_ICONS = {
    home: line('<path d="M3 10.6 12 3l9 7.6"/><path d="M5.2 9.4V20h13.6V9.4"/><path d="M9.6 20v-5.4h4.8V20"/>'),
    leaf: line('<path d="M20 4c-8 0-13 3.6-13 9.6A6.4 6.4 0 0 0 13.4 20C19.4 20 20 12 20 4z"/><path d="M4 21c1.4-5 4.2-8.4 8.4-11"/>'),
    tree: line('<path d="M12 21v-4.6"/><path d="M12 3 5.6 11h3.2L4 17h16l-4.8-6h3.2z"/>'),
    water: line('<path d="M12 3.5S5.5 10.2 5.5 14a6.5 6.5 0 0 0 13 0C18.5 10.2 12 3.5 12 3.5z"/>'),
    gem: line('<path d="M12 3.4 19 9l-7 11.6L5 9z"/><path d="M5 9h14M12 3.4 9.2 9l2.8 11.6M12 3.4 14.8 9 12 20.6"/>'),
    next: line('<path d="M9 5.4 15.6 12 9 18.6"/>'),
    back: line('<path d="M15 5.4 8.4 12 15 18.6"/>'),
    close: line('<path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8"/>'),
    play: solid('<path d="M8 4.8 19.5 12 8 19.2z"/>'),
    pause: solid('<path d="M7.6 4.6h3.2v14.8H7.6zM13.2 4.6h3.2v14.8h-3.2z"/>'),
    heart: solid('<path d="M12 21s-8-4.7-8-10.2A4.9 4.9 0 0 1 12 7.5 4.9 4.9 0 0 1 20 10.8C20 16.3 12 21 12 21z"/>'),
    paw: solid('<circle cx="6.8" cy="8" r="2.1"/><circle cx="12" cy="6.2" r="2.1"/><circle cx="17.2" cy="8" r="2.1"/>' +
      '<path d="M12 10.9c3.2 0 5.7 2.4 5.7 4.8 0 2-1.7 3.3-3.7 3.3-1 0-1.4-.4-2-.4s-1 .4-2 .4c-2 0-3.7-1.3-3.7-3.3C6.3 13.3 8.8 10.9 12 10.9z"/>'),
    spark: solid('<path d="M12 2.4 13.9 8 19.5 9.9 13.9 11.8 12 17.4 10.1 11.8 4.5 9.9 10.1 8z"/>' +
      '<path d="M18.6 15.4 19.5 18l2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>'),
    compass: line('<circle cx="12" cy="12" r="8.4"/><path d="M15.6 8.4 13.7 13.7 8.4 15.6 10.3 10.3z"/>'),
    camera: line('<path d="M4 8.2h3.1L8.6 5.8h6.8L16.9 8.2H20V19H4z"/><circle cx="12" cy="13.4" r="3.5"/>'),
    image: line('<rect x="3.6" y="5" width="16.8" height="14" rx="2.6"/><path d="M4.4 16.4 9 11.8l3.4 3.4M13.4 13.4 16 10.8l3.6 3.6"/><circle cx="8.4" cy="9" r="1.3"/>'),
    grid: line('<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/>' +
      '<rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>'),
    task: line('<rect x="4.5" y="4" width="15" height="16" rx="2.4"/><path d="M8 9.4h.01M8 13.4h.01M8 17.2h.01"/><path d="M11 9.4h5M11 13.4h5M11 17.2h3.2"/>'),
    gear: line('<circle cx="12" cy="12" r="3.1"/><circle cx="12" cy="12" r="8"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17 5.4 18.6"/>'),
    sound: line('<path d="M4.6 9.4h3.2L12 5.2v13.6l-4.2-4.2H4.6z"/><path d="M15.6 9.2a4.4 4.4 0 0 1 0 5.6"/><path d="M17.8 6.9a7.4 7.4 0 0 1 0 10.2"/>'),
    mute: line('<path d="M4.6 9.4h3.2L12 5.2v13.6l-4.2-4.2H4.6z"/><path d="M15.8 9.6 19.6 13.4M19.6 9.6 15.8 13.4"/>'),
    star: solid('<path d="m12 3 2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.4l-5.7 3 1.2-6.3-4.7-4.4 6.4-.8z"/>'),
    coin: line('<circle cx="12" cy="12" r="8.4"/><path d="M9.4 9.6h5.2M9.4 12.4h5.2M12 9.6v6.2"/>'),
    lock: line('<rect x="5" y="10.4" width="14" height="9.6" rx="2.4"/><path d="M8.4 10.4V8a3.6 3.6 0 0 1 7.2 0v2.4"/><path d="M12 14.4v2"/>'),
    check: line('<path d="M4.6 12.6 9.6 17.6 19.6 6.8"/>'),
    plus: line('<path d="M12 5.2v13.6M5.2 12h13.6"/>'),
    download: line('<path d="M12 3.4v12"/><path d="M7.2 11 12 15.8 16.8 11"/><path d="M4 19.6h16"/>'),
    share: line('<circle cx="6.4" cy="12" r="2.6"/><circle cx="17.6" cy="6.4" r="2.6"/><circle cx="17.6" cy="17.6" r="2.6"/>' +
      '<path d="M8.8 10.8 15.2 7.6M8.8 13.2 15.2 16.4"/>'),
    restart: line('<path d="M19.4 12a7.4 7.4 0 1 1-2.4-5.5"/><path d="M19.8 4.4v4.2h-4.2"/>'),
    info: line('<circle cx="12" cy="12" r="8.4"/><path d="M12 11.2v5M12 7.8v.01"/>'),
    timer: line('<circle cx="12" cy="13.4" r="7.4"/><path d="M12 9.6v4l2.8 1.8"/><path d="M9 2.6h6"/>'),
    book: line('<path d="M4.4 6.2A2.2 2.2 0 0 1 6.6 4h11.6a1.8 1.8 0 0 1 1.8 1.8v12.4a1.8 1.8 0 0 0-1.8-1.8H6.6A2.2 2.2 0 0 0 4.4 18.6z"/>' +
      '<path d="M4.4 6.2v12.4"/><path d="M8.4 8.4h7.2M8.4 11.6h5"/>'),
    yarn: line('<circle cx="12" cy="12.4" r="6.8"/><path d="M6.2 9.6c3-1.2 6.2-.4 8.4 2s2.4 5.4.8 7.6"/><path d="M9.4 6.2c2.8 1 4.4 3.2 4.6 6"/>'),
    flower: line('<circle cx="12" cy="8.6" r="2.4"/><circle cx="8.2" cy="10.6" r="2.2"/><circle cx="15.8" cy="10.6" r="2.2"/>' +
      '<path d="M12 15.4V20"/><path d="M12 17.6c-2.4 0-3.6-1-4.2-2.2M12 17.6c2.4 0 3.6-1 4.2-2.2"/>'),
    butterfly: line('<path d="M12 7v10"/><path d="M11 9.6C9.6 6.4 6.6 4.6 4.6 6.4c-2 1.8-.6 6 2.4 6.8 1.8.5 3.2-.6 4-1.6"/><path d="M13 9.6c1.4-3.2 4.4-5 6.4-3.2 2 1.8.6 6-2.4 6.8-1.8.5-3.2-.6-4-1.6"/>' +
      '<path d="M12 12.4c-1.6 1-3.8 1.2-5 0M12 12.4c1.6 1 3.8 1.2 5 0"/>'),
    shell: line('<path d="M12 20c-5 0-8.4-3.4-8.4-7.6C3.6 8 7.2 4.4 12 4.4s8.4 3.6 8.4 8c0 4.2-3.4 7.6-8.4 7.6z"/><path d="M12 20V4.4M8.4 19.4 12 9.6l3.6 9.8M5.2 16.6 12 12.4l6.8 4.2"/>'),
    jar: line('<path d="M7.4 8.6h9.2v9.2a2.2 2.2 0 0 1-2.2 2.2H9.6a2.2 2.2 0 0 1-2.2-2.2z"/><path d="M8.6 8.6v-2h.8l.6-1.4h4l.6 1.4h.8v2"/><path d="M10.4 13.4v3M12.6 12.6v4"/>'),
    chest: line('<rect x="3.8" y="9.6" width="16.4" height="9.6" rx="2"/><path d="M3.8 12.6h16.4M12 9.6v9.6"/><path d="M3.8 9.6 6 5.6h12l2.2 4"/>'),
    mushroom: line('<path d="M4.6 11.4c0-4 3.4-6.8 7.4-6.8s7.4 2.8 7.4 6.8c0 1.2-1 1.6-2.4 1.6H7c-1.4 0-2.4-.4-2.4-1.6z"/><path d="M9 19.6V13h6v6.6a1.6 1.6 0 0 1-1.6 1.6H10.6A1.6 1.6 0 0 1 9 19.6z"/>' +
      '<circle cx="9.6" cy="9.6" r="1"/><circle cx="14.4" cy="8.4" r=".9"/>'),
    fish: line('<path d="M3.4 12s3.6-4.6 8-4.6 7.2 4.6 7.2 4.6-2.8 4.6-7.2 4.6S3.4 12 3.4 12z"/><path d="M18.6 12 21 9.4M18.6 12 21 14.6"/><circle cx="8.6" cy="11.2" r=".9"/>'),
    map: line('<path d="M4 6.4 9.4 4.4v13.2L4 19.6zM9.4 4.4l5.2 2v13.2l-5.2-2zM14.6 6.4 20 4.4v13.2l-5.4 2z"/>'),
    sun: line('<circle cx="12" cy="12" r="4"/><path d="M12 3.6v2M12 18.4v2M3.6 12h2M18.4 12h2M6 6 7.4 7.4M16.6 16.6 18 18M18 6 16.6 7.4M7.4 16.6 6 18"/>'),
    moon: line('<path d="M19 15.4A8.4 8.4 0 0 1 8.6 5 8.4 8.4 0 1 0 19 15.4z"/>'),
    feed: line('<path d="M4.4 12.6h15.2c0 4-3.4 7-7.6 7s-7.6-3-7.6-7z"/><path d="M8.4 9.6c0-1.6 1.2-2.4 1.2-3.6M12 9.6c0-2 1.4-2.6 1.4-4M15.4 9.6c0-1.4 1-2 1-3"/>'),
    toy: line('<circle cx="12" cy="12" r="6.4"/><path d="M6.6 7.6c2.6.4 4.6 2.4 5 5M17.4 7.6c-2.6.4-4.6 2.4-5 5M12 5.6v12.8"/>'),
    rest: line('<path d="M4 16.4h16v3H4z"/><path d="M6.4 16.4v-3c0-2.4 2-4.4 4.4-4.4h2.4c2.4 0 4.4 2 4.4 4.4v3"/><path d="M9.2 9V7.4h5.6V9"/>'),
    horn: line('<path d="M4 14.4V9.6l9-4.6v14z"/><path d="M16.4 8.4a4.6 4.6 0 0 1 0 7.2"/>'),
    bolt: solid('<path d="M13.4 3 6 13.6h4.3L9.6 21l7.6-11.2h-4.4L13.4 3z"/>')
  };
})();
