/* 線上體驗：民眾端（手機）與後台共用同一份假資料，民眾端操作，後台即時變。
   全部在瀏覽器裡跑，不連任何伺服器，也不存任何東西；重新整理就回到初始狀態。 */
(function () {
  'use strict';

  var TARGET = 8; // 集點卡集滿幾點
  var DATES = ['10/5 一', '10/6 二', '10/7 三'];
  var TIMES = ['10:00', '14:00', '16:30'];

  var state = {
    // 民眾端畫面：home | book | news | loyalty | coupons | tickets
    screen: 'home',
    sheet: false,
    modal: null,
    booked: null,
    draft: { date: null, time: null, name: '' },
    adminTab: 'overview',
    flash: {}, // 剛變動的數字，後台短暫標示
    bookings: [
      { id: 1, name: '陳小姐', date: '10/4 日', time: '15:00', status: '已確認' },
      { id: 2, name: '林先生', date: '10/5 一', time: '10:00', status: '待確認' }
    ],
    news: [
      { id: 1, title: '十月營業時間調整', date: '10/01' },
      { id: 2, title: '會員日：全館 9 折', date: '09/28' },
      { id: 3, title: '新品體驗活動開放報名', date: '09/25' }
    ],
    points: 3, // 我的集點
    pointsIssued: 41, // 店家累計發出
    rewardsRedeemed: 2,
    couponUses: { a: 0, b: 0 },
    couponTotals: { a: 17, b: 6 },
    ticket: null, // { no, code, done }
    ticketIssued: 23,
    ticketLimit: 100
  };

  var COUPONS = [
    { id: 'a', store: '好咖啡', title: '拿鐵買一送一', tag: '買一送一', per: 1 },
    { id: 'b', store: '小森甜點', title: '蛋糕享 9 折', tag: '9 折', per: 2 }
  ];

  var $app = document.getElementById('app');
  var $admin = document.getElementById('admin');

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mark(key) {
    state.flash[key] = true;
    setTimeout(function () { delete state.flash[key]; renderAdmin(); }, 1800);
  }
  function code() {
    var c = '', a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < 6; i++) c += a[Math.floor(Math.random() * a.length)];
    return c;
  }

  /* ───────── 民眾端 ───────── */
  function topBack(title, sub) {
    return '<button class="back" data-go="home" aria-label="返回">←</button>' +
      '<h1 class="a-title">' + title + '</h1>' + (sub ? '<p class="a-sub">' + sub + '</p>' : '');
  }

  function screenHome() {
    var next = state.booked
      ? '<small>你的預約</small><b>' + esc(state.booked.date) + ' ' + esc(state.booked.time) + '</b>'
      : '<small>今天</small><b>歡迎光臨，今天想辦什麼？</b>';
    return '<div class="today">' + next + '</div>' +
      '<div class="tiles">' +
      tile('book', '📅', '預約', '選日期與時段') +
      tile('news', '🔔', '最新公告', state.news.length + ' 則') +
      tile('loyalty', '🎫', '集點卡', state.points + ' / ' + TARGET + ' 點') +
      tile('coupons', '🎁', '優惠券', '現場確認兌換') +
      tile('tickets', '🔢', '號碼牌', state.ticket ? '你的號碼 ' + state.ticket.no : '限量領取') +
      '</div>';
  }
  function tile(go, icon, title, sub) {
    return '<button class="tile" data-go="' + go + '"><i>' + icon + '</i><b>' + title + '</b><span>' + sub + '</span></button>';
  }

  function screenBook() {
    if (state.booked && state.booked.just) {
      var b = state.booked;
      return topBack('預約') +
        '<div class="stamp">預約成功</div>' +
        '<div class="receipt"><b>' + esc(b.name) + '</b> 您好<br>' + esc(b.date) + ' ' + esc(b.time) + '<br><span style="color:#5d727a;font-size:12px">店家收到後會確認，並用 LINE 通知你</span></div>' +
        '<button class="btn-p" data-act="bookAgain">再預約一筆</button>';
    }
    var d = state.draft;
    var ok = d.date && d.time && d.name.trim();
    return topBack('預約', '選一個你方便的時間。') +
      '<div class="lab">日期</div><div class="chips">' + DATES.map(function (x) {
        return '<button class="chip' + (d.date === x ? ' on' : '') + '" data-date="' + x + '">' + x + '</button>';
      }).join('') + '</div>' +
      '<div class="lab">時段</div><div class="chips">' + TIMES.map(function (x) {
        return '<button class="chip' + (d.time === x ? ' on' : '') + '" data-time="' + x + '">' + x + '</button>';
      }).join('') + '</div>' +
      '<div class="lab">怎麼稱呼你</div><input class="in" id="bName" placeholder="例如：王小姐" value="' + esc(d.name) + '" maxlength="10">' +
      '<button class="btn-p" data-act="book"' + (ok ? '' : ' disabled') + '>送出預約</button>';
  }

  function screenNews() {
    return topBack('最新公告') + state.news.map(function (n) {
      return '<div class="a-card"><h3>' + esc(n.title) + '</h3><p>' + esc(n.date) + '</p></div>';
    }).join('');
  }

  function screenLoyalty() {
    var dots = '', rewards = Math.floor(state.points / TARGET) - state.rewardsMine();
    // 賺到獎勵還沒兌換時整排點亮；兌換後從餘數重新累積
    var filled = rewards > 0 ? TARGET : state.points % TARGET;
    for (var i = 1; i <= TARGET; i++) dots += '<span class="dot' + (i <= filled ? ' f' : '') + '">' + i + '</span>';
    var out = topBack('集點卡', '到店掃一下 QR Code 就集一點。') +
      '<div class="a-card"><h3>咖啡集點卡</h3><p>集滿 ' + TARGET + ' 點，換一杯免費咖啡</p><div class="dots">' + dots + '</div>' +
      (rewards > 0
        ? '<span class="pill ok">可兌換 ' + rewards + ' 份</span>'
        : '<span class="pill">再 ' + (TARGET - (state.points % TARGET)) + ' 點可兌換</span>') + '</div>';
    out += '<button class="btn-p" data-act="scan">掃現場 QR Code 領 1 點</button>';
    if (rewards > 0) out += '<button class="btn-p acc" data-act="showRedeem">出示兌換碼</button>';
    return out;
  }
  state.myRewards = 0;
  state.rewardsMine = function () { return state.myRewards; };

  function screenCoupons() {
    return topBack('優惠券', '在店家面前按「確認兌換」才算用掉。') + COUPONS.map(function (c) {
      var used = state.couponUses[c.id], left = c.per - used;
      return '<div class="a-card"><p>' + esc(c.store) + '</p><h3>' + esc(c.title) + '</h3><span class="pill">' + esc(c.tag) + '</span>' +
        '<p style="margin-top:6px">每人可兌換 ' + c.per + ' 次' + (used ? '，你已兌換 ' + used + ' 次' : '') + '</p>' +
        '<button class="btn-p" data-coupon="' + c.id + '"' + (left > 0 ? '' : ' disabled') + '>' + (left > 0 ? '確認兌換' : '已用完次數') + '</button></div>';
    }).join('');
  }

  function screenTickets() {
    var remaining = state.ticketLimit - state.ticketIssued;
    var body = topBack('號碼牌', '限量領取，領到號碼後現場出示。') +
      '<div class="a-card"><h3>免費領筆</h3><p>共 ' + state.ticketLimit + ' 張，剩 ' + remaining + ' 張</p></div>';
    if (state.ticket) {
      body += '<div class="a-card"><p style="text-align:center">你的號碼</p><div class="bignum">' + state.ticket.no + '</div>' +
        '<div class="code">' + state.ticket.code + '</div>' +
        (state.ticket.done ? '<p class="note" style="color:#2e7d4f;font-weight:700">已領取，謝謝！</p>' : '<p class="note">現場請出示這個號碼與代碼</p>') + '</div>';
    } else {
      body += '<button class="btn-p" data-act="claimTicket">領取號碼牌</button>';
    }
    return body;
  }

  function renderApp() {
    var scr = state.screen;
    var map = { home: screenHome, book: screenBook, news: screenNews, loyalty: screenLoyalty, coupons: screenCoupons, tickets: screenTickets };
    var html = '<div class="screen">' + map[scr]() + '</div>' +
      '<div class="nav">' +
      navBtn('home', '🏠', '首頁') + navBtn('news', '🔔', '公告') +
      '<button class="plus" data-act="sheet"><i>＋</i>我要</button>' +
      navBtn('loyalty', '🎫', '集點') + navBtn('coupons', '🎁', '優惠券') + '</div>';
    if (state.sheet) {
      html += '<div class="sheet" data-act="closeSheet"><div><h2>我要…</h2><ul>' +
        ['book|預約', 'news|看公告', 'loyalty|集點', 'coupons|兌換優惠券', 'tickets|領號碼牌'].map(function (s) {
          var p = s.split('|');
          return '<li><button data-go="' + p[0] + '">' + p[1] + '</button></li>';
        }).join('') + '</ul></div></div>';
    }
    if (state.modal) html += state.modal;
    var keep = $app.querySelector('.screen');
    var top = keep ? keep.scrollTop : 0;
    $app.innerHTML = html;
    var ns = $app.querySelector('.screen');
    if (ns) ns.scrollTop = top;
  }
  function navBtn(go, icon, label) {
    return '<button data-go="' + go + '"' + (state.screen === go ? ' class="on"' : '') + '><i>' + icon + '</i>' + label + '</button>';
  }

  function confirmModal(title, text, actYes) {
    return '<div class="modal"><div><h3>' + title + '</h3><p>' + text + '</p><div class="row">' +
      '<button class="btn-p" style="margin:0" data-act="' + actYes + '">確認</button>' +
      '<button class="btn-s" data-act="closeModal">取消</button></div></div></div>';
  }

  $app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go],[data-act],[data-date],[data-time],[data-coupon]');
    if (!t) return;
    if (t.dataset.act === 'closeSheet' && e.target !== t) return;
    if (t.dataset.go) { state.screen = t.dataset.go; state.sheet = false; if (t.dataset.go === 'book' && state.booked && state.booked.just) state.booked.just = false; renderApp(); return; }
    if (t.dataset.date) { state.draft.date = t.dataset.date; renderApp(); return; }
    if (t.dataset.time) { state.draft.time = t.dataset.time; renderApp(); return; }
    if (t.dataset.coupon) {
      var c = COUPONS.filter(function (x) { return x.id === t.dataset.coupon; })[0];
      state.pending = c.id;
      state.modal = confirmModal('在店家面前確認兌換？', esc(c.store) + '：' + esc(c.title) + '。按下後會記一次兌換，無法撤回。', 'useCoupon');
      renderApp(); return;
    }
    switch (t.dataset.act) {
      case 'sheet': state.sheet = true; break;
      case 'closeSheet': state.sheet = false; break;
      case 'closeModal': state.modal = null; break;
      case 'book':
        var nm = (document.getElementById('bName') || {}).value || state.draft.name;
        state.draft.name = nm;
        if (!(state.draft.date && state.draft.time && nm.trim())) return;
        var rec = { id: Date.now(), name: nm.trim(), date: state.draft.date, time: state.draft.time, status: '待確認', fresh: true };
        state.bookings.unshift(rec);
        state.booked = { name: rec.name, date: rec.date, time: rec.time, just: true };
        state.draft = { date: null, time: null, name: '' };
        mark('bookings');
        break;
      case 'bookAgain': state.booked.just = false; break;
      case 'scan':
        state.points += 1; state.pointsIssued += 1; mark('points');
        break;
      case 'showRedeem':
        state.modal = '<div class="modal"><div><h3>兌換碼</h3><div class="qr"></div><p class="note">請在店員面前出示，由店員掃描後兌換</p>' +
          '<div class="row"><button class="btn-p" style="margin:0" data-act="staffRedeem">（示範）店員掃碼兌換</button><button class="btn-s" data-act="closeModal">關閉</button></div></div></div>';
        break;
      case 'staffRedeem':
        state.myRewards += 1; state.rewardsRedeemed += 1; state.modal = null; mark('rewards');
        break;
      case 'useCoupon':
        state.couponUses[state.pending] += 1; state.couponTotals[state.pending] += 1; state.modal = null; mark('coupons');
        state.modal = '<div class="modal"><div style="text-align:center"><h3 style="color:#2e7d4f">已記錄本次兌換</h3><p>店家會在後台看到這筆兌換</p><div class="row"><button class="btn-s" data-act="closeModal">關閉</button></div></div></div>';
        break;
      case 'claimTicket':
        state.ticketIssued += 1;
        state.ticket = { no: state.ticketIssued, code: code(), done: false };
        mark('tickets');
        break;
    }
    renderApp(); renderAdmin();
  });
  $app.addEventListener('input', function (e) {
    if (e.target.id === 'bName') {
      state.draft.name = e.target.value;
      var btn = $app.querySelector('[data-act="book"]');
      if (btn) btn.disabled = !(state.draft.date && state.draft.time && e.target.value.trim());
    }
  });

  /* ───────── 後台 ───────── */
  var TABS = [['overview', '總覽'], ['bookings', '預約管理'], ['news', '公告'], ['loyalty', '集點卡'], ['coupons', '優惠券'], ['tickets', '號碼牌']];

  function stat(key, n, label) {
    return '<div class="stat' + (state.flash[key] ? ' bump' : '') + '"><b>' + n + '</b><span>' + label + '</span></div>';
  }

  function adminOverview() {
    return '<h2>今天的狀況</h2><p class="sub">民眾端的操作會在這裡即時出現。</p><div class="stats">' +
      stat('bookings', state.bookings.length, '預約筆數') +
      stat('points', state.pointsIssued, '已發出點數') +
      stat('coupons', state.couponTotals.a + state.couponTotals.b, '優惠券兌換次數') +
      stat('tickets', state.ticketIssued, '已領號碼牌') + '</div>' +
      '<div class="empty" style="text-align:left">左邊切到「預約管理」「集點卡」「優惠券」「號碼牌」，可以看到各自的明細與操作。</div>';
  }

  function adminBookings() {
    var rows = state.bookings.map(function (b) {
      var act = b.status === '待確認'
        ? '<button class="b-sm" data-a="confirm" data-id="' + b.id + '">確認</button>'
        : b.status === '已確認' ? '<button class="b-sm o" data-a="done" data-id="' + b.id + '">標示完成</button>' : '—';
      return '<tr' + (b.fresh ? ' class="new"' : '') + '><td>' + esc(b.name) + '</td><td>' + esc(b.date) + ' ' + esc(b.time) + '</td><td>' + esc(b.status) + '</td><td>' + act + '</td></tr>';
    }).join('');
    state.bookings.forEach(function (b) { b.fresh = false; });
    return '<h2>預約管理</h2><p class="sub">新預約進來後，按「確認」，民眾會收到 LINE 通知（示範不會真的發送）。</p>' +
      '<table><thead><tr><th>姓名</th><th>時間</th><th>狀態</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function adminNews() {
    return '<h2>公告</h2><p class="sub">新增一則，民眾端「最新公告」馬上看得到。</p>' +
      '<div class="fgrid"><input id="nTitle" placeholder="公告標題" maxlength="30"><button class="b-sm" data-a="addNews">發布</button></div>' +
      '<table><thead><tr><th>標題</th><th>日期</th></tr></thead><tbody>' + state.news.map(function (n) {
        return '<tr><td>' + esc(n.title) + '</td><td>' + esc(n.date) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function adminLoyalty() {
    return '<h2>集點卡</h2><p class="sub">店家建卡、印現場 QR；民眾掃了集點，集滿由店員掃兌換碼兌換。</p><div class="stats">' +
      stat('points', state.pointsIssued, '累計發出點數') + stat('rewards', state.rewardsRedeemed, '已兌換獎勵') +
      stat('', 12, '會員數') + stat('', TARGET, '集滿所需點數') + '</div>' +
      '<div class="empty" style="text-align:left">每次加點都記一筆流水帳，點數不能被改，要更正只能新增一筆沖銷，所以帳永遠對得起來。</div>';
  }

  function adminCoupons() {
    return '<h2>優惠券</h2><p class="sub">可設定每人與總共的兌換次數上限；民眾在店家面前按「確認兌換」才算一次。</p>' +
      '<table><thead><tr><th>店家</th><th>優惠</th><th>每人上限</th><th>已兌換</th></tr></thead><tbody>' + COUPONS.map(function (c) {
        return '<tr><td>' + esc(c.store) + '</td><td>' + esc(c.title) + '</td><td>' + c.per + ' 次</td><td' + (state.flash.coupons ? ' style="color:#bc5f6a;font-weight:700"' : '') + '>' + state.couponTotals[c.id] + ' 次</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function adminTickets() {
    var mine = state.ticket;
    var rows = '';
    if (mine) {
      rows += '<tr class="new"><td>' + mine.no + '</td><td>' + mine.code + '</td><td>示範民眾</td><td>' +
        (mine.done ? '已核銷' : '未領取') + '</td></tr>';
    }
    rows += '<tr><td>22</td><td>K7M2QX</td><td>王先生</td><td>已核銷</td></tr><tr><td>21</td><td>H4T9BN</td><td>李小姐</td><td>未領取</td></tr>';
    return '<h2>號碼牌</h2><p class="sub">限量領號，號碼連續、不會重複也不會超發。現場輸入民眾出示的代碼核銷。</p><div class="stats">' +
      stat('tickets', state.ticketIssued, '已發出') + stat('', state.ticketLimit - state.ticketIssued, '剩餘') + '</div>' +
      '<div class="fgrid"><input id="tCode" placeholder="輸入民眾出示的代碼" maxlength="6" style="text-transform:uppercase"><button class="b-sm" data-a="redeemTicket">核銷</button></div><div id="tMsg" class="sub"></div>' +
      '<table><thead><tr><th>號碼</th><th>代碼</th><th>名稱</th><th>狀態</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderAdmin() {
    var t = state.adminTab;
    var badge = state.bookings.filter(function (b) { return b.status === '待確認'; }).length;
    var side = '<aside class="side"><h4>示範商店</h4>' + TABS.map(function (x) {
      return '<button data-tab="' + x[0] + '"' + (t === x[0] ? ' class="on"' : '') + '>' + x[1] +
        (x[0] === 'bookings' && badge ? '<span class="badge">' + badge + '</span>' : '') + '</button>';
    }).join('') + '</aside>';
    var body = { overview: adminOverview, bookings: adminBookings, news: adminNews, loyalty: adminLoyalty, coupons: adminCoupons, tickets: adminTickets }[t]();
    var keepInput = document.getElementById('nTitle'), nVal = keepInput ? keepInput.value : '';
    var keepCode = document.getElementById('tCode'), cVal = keepCode ? keepCode.value : '';
    var msg = document.getElementById('tMsg'), mVal = msg ? msg.innerHTML : '';
    $admin.innerHTML = side + '<div class="main">' + body + '</div>';
    if (document.getElementById('nTitle')) document.getElementById('nTitle').value = nVal;
    if (document.getElementById('tCode')) document.getElementById('tCode').value = cVal;
    if (document.getElementById('tMsg')) document.getElementById('tMsg').innerHTML = mVal;
  }

  $admin.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-tab]');
    if (tab) { state.adminTab = tab.dataset.tab; renderAdmin(); return; }
    var a = e.target.closest('[data-a]');
    if (!a) return;
    var id = Number(a.dataset.id);
    if (a.dataset.a === 'confirm' || a.dataset.a === 'done') {
      state.bookings.forEach(function (b) {
        if (b.id === id) { b.status = a.dataset.a === 'confirm' ? '已確認' : '已完成'; }
      });
    } else if (a.dataset.a === 'addNews') {
      var inp = document.getElementById('nTitle');
      var v = inp.value.trim();
      if (!v) return;
      state.news.unshift({ id: Date.now(), title: v, date: '今天' });
    } else if (a.dataset.a === 'redeemTicket') {
      var c = document.getElementById('tCode').value.trim().toUpperCase();
      var m = document.getElementById('tMsg');
      if (state.ticket && c === state.ticket.code) {
        if (state.ticket.done) m.textContent = '這張已經核銷過了';
        else { state.ticket.done = true; m.textContent = '已核銷：' + state.ticket.no + ' 號'; }
      } else { m.textContent = '找不到這個代碼'; }
      renderApp();
      var keep = m.textContent; renderAdmin(); document.getElementById('tMsg').textContent = keep; return;
    }
    renderAdmin(); renderApp();
  });

  /* 手機尺寸：切換民眾端／後台 */
  document.querySelector('.switch').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pane]');
    if (!b) return;
    [].forEach.call(document.querySelectorAll('.switch button'), function (x) { x.classList.toggle('on', x === b); });
    document.getElementById('paneP').classList.toggle('on', b.dataset.pane === 'phone');
    document.getElementById('paneA').classList.toggle('on', b.dataset.pane === 'admin');
  });

  renderApp();
  renderAdmin();
})();
