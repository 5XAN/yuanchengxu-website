/* 線上體驗：兩個 iframe 裝著真實系統的民眾端與後台（資料是示範用的）。
   這支只負責外層的操作：快速前往、模擬現場掃碼、重新開始，以及客人端有動作時把後台自動更新。 */
(function () {
  'use strict';

  var phone = document.getElementById('phone');
  var admin = document.getElementById('admin');
  var note = document.getElementById('syncNote');
  var STORE_KEY = 'demo-store-v1';
  var SCAN_KEY = 'demo-scan-count';
  var lastAdminTab = '';

  function appUrl(pane, extra) {
    var q = 'pane=' + pane;
    for (var k in extra) if (extra[k]) q += '&' + k + '=' + encodeURIComponent(extra[k]);
    return 'app/demo.html?' + q + '&v=20261003a';
  }

  function goPhone(path, extra) {
    var e = extra || {};
    e.path = path;
    phone.src = appUrl('citizen', e);
  }

  function reloadAdmin() {
    var e = {};
    if (lastAdminTab) e.tab = lastAdminTab;
    admin.src = appUrl('admin', e);
  }

  /* 後台目前停在哪個分頁：同網域，可以讀 iframe 裡的點擊，記下被點的分頁名稱，重新整理後回到同一頁。 */
  function trackAdminTab() {
    try {
      var doc = admin.contentDocument;
      if (!doc || doc.__tracked) return;
      doc.__tracked = true;
      doc.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('button,a');
        if (!el) return;
        var text = (el.textContent || '').trim();
        // 分頁列的按鈕在畫面上方的捲動列裡；只記看起來像分頁名稱的短字串
        if (text && text.length <= 16 && el.closest('nav,[role=tablist],header + div,div')) lastAdminTab = text;
      }, true);
    } catch (err) {
      /* 取不到就不追蹤，重新整理後回到第一個分頁 */
    }
  }
  admin.addEventListener('load', trackAdminTab);

  /* 客人端有動作（寫進共用資料）→ 後台稍後自動更新。
     不重新載入整個後台（要好幾秒），而是在 iframe 裡「切到別的分頁再切回來」，讓目前分頁重新取一次資料。 */
  function softRefreshAdmin() {
    try {
      var doc = admin.contentDocument;
      var buttons = [].slice.call(doc.querySelectorAll('button,a')).filter(function (b) {
        var t = (b.textContent || '').trim();
        return t && t.length <= 16;
      });
      var names = ['售後服務', '預約體驗', '課程報名', '保養品選購', '集點卡', '優惠券', '號碼牌', '最新消息'];
      var current = lastAdminTab || '售後服務';
      var target = buttons.filter(function (b) { return b.textContent.trim() === current; })[0];
      var other = buttons.filter(function (b) { var t = b.textContent.trim(); return t !== current && names.indexOf(t) >= 0; })[0];
      if (!target || !other) return false;
      other.click();
      setTimeout(function () { target.click(); }, 150);
      return true;
    } catch (err) {
      return false;
    }
  }

  var timer = null;
  function scheduleSync() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      note.textContent = '已同步最新資料';
      note.classList.add('on');
      if (!softRefreshAdmin()) reloadAdmin();
      setTimeout(function () { note.classList.remove('on'); }, 2200);
    }, 500);
  }
  if ('BroadcastChannel' in window) {
    var channel = new BroadcastChannel('demo-sync');
    channel.onmessage = scheduleSync;
  }
  window.addEventListener('storage', function (e) { if (e.key === STORE_KEY) scheduleSync(); });

  /* 快速前往 */
  [].forEach.call(document.querySelectorAll('[data-go]'), function (b) {
    b.addEventListener('click', function () { goPhone(b.getAttribute('data-go')); });
  });

  /* 模擬現場掃 QR：每按一次換一個不同的 QR，所以每次都 +1 點 */
  document.getElementById('btnScan').addEventListener('click', function () {
    var n = Number(sessionStorage.getItem(SCAN_KEY) || '0') + 1;
    sessionStorage.setItem(SCAN_KEY, String(n));
    goPhone('loyalty-claim', { c: 'demo-qr-' + n });
  });
  document.getElementById('btnTicket').addEventListener('click', function () {
    goPhone('tickets-claim', { id: 'camp-1', t: 'demo-onsite' });
  });

  /* 重新開始：清掉示範資料，兩邊都重載 */
  document.getElementById('btnReset').addEventListener('click', function () {
    try { localStorage.removeItem(STORE_KEY); sessionStorage.removeItem(SCAN_KEY); } catch (err) { /* 無痕模式 */ }
    lastAdminTab = '';
    phone.src = appUrl('citizen', {});
    admin.src = appUrl('admin', {});
  });

  /* 手機尺寸：切換客人端／後台 */
  document.querySelector('.switch').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pane]');
    if (!b) return;
    [].forEach.call(document.querySelectorAll('.switch button'), function (x) { x.classList.toggle('on', x === b); });
    document.getElementById('paneP').classList.toggle('on', b.getAttribute('data-pane') === 'phone');
    document.getElementById('paneA').classList.toggle('on', b.getAttribute('data-pane') === 'admin');
    if (b.getAttribute('data-pane') === 'admin') reloadAdmin();
  });
})();
