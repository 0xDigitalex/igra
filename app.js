(function () {
  "use strict";
  var C = window.CONTENT;
  var KEYS = ["D", "N", "P", "J"];
  var OPPOSITE = { D: "P", P: "D", N: "J", J: "N" };
  var SLOTS = ["head", "hand", "neck", "face"];           // какая сцена какой реквизит выдаёт
  var ORDER = [["N", "P", "J", "D"], ["D", "P", "J", "N"], ["N", "J", "D", "P"], ["P", "D", "J", "N"]];
  var WEIGHTS = [1, 1, 1, 1.2];                            // 1.2 — чтобы не было ничьих по осям
  var COLORS = { ink: "#11130F", paper: "#F5F4EC", lime: "#D7FF38", coral: "#FF563D", sky: "#5ED8F1", purple: "#7757FF", white: "#FFFFFF" };

  var $screen = document.getElementById("screen");
  var $dots = document.getElementById("dots");
  var params = new URLSearchParams(location.search);
  var inTelegram = /tgWebApp/.test(location.hash) || params.get("s") === "tg";
  var src = ((params.get("s") || (inTelegram ? "tg" : "web")).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)) || "web";

  var state = { scene: 0, choices: [], props: {}, take2: "0" };

  if (inTelegram) {
    var s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.onload = function () { try { Telegram.WebApp.ready(); Telegram.WebApp.expand(); } catch (e) {} };
    document.head.appendChild(s);
  }

  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(t, o) { return t.replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ""; }); }

  function dots(n) {
    $dots.innerHTML = "";
    for (var i = 0; i < 4; i++) { var d = document.createElement("i"); if (i < n) d.className = "on"; $dots.appendChild(d); }
  }

  function render(html) {
    $screen.innerHTML = '<div class="screen-in">' + html + "</div>";
    window.scrollTo(0, 0);
  }

  // ---------- персонаж ----------
  var PROPS = {
    head: {
      D: '<g><ellipse cx="104" cy="54" rx="46" ry="15" fill="#11130F" transform="rotate(-8 104 54)"/><circle cx="104" cy="38" r="6" fill="#11130F"/></g>',
      N: '<g><path d="M64 66 Q110 6 156 66 Z" fill="#5ED8F1" stroke="#11130F" stroke-width="4" stroke-linejoin="round"/><ellipse cx="160" cy="65" rx="26" ry="7" fill="#11130F"/></g>',
      P: '<g stroke="#11130F" stroke-width="3"><circle cx="70" cy="64" r="10" fill="#D7FF38"/><circle cx="89" cy="52" r="10" fill="#D7FF38"/><circle cx="110" cy="48" r="10" fill="#D7FF38"/><circle cx="131" cy="52" r="10" fill="#D7FF38"/><circle cx="150" cy="64" r="10" fill="#D7FF38"/><g fill="#FF563D" stroke="none"><circle cx="70" cy="64" r="3.5"/><circle cx="89" cy="52" r="3.5"/><circle cx="110" cy="48" r="3.5"/><circle cx="131" cy="52" r="3.5"/><circle cx="150" cy="64" r="3.5"/></g></g>',
      J: '<g stroke="#11130F" stroke-width="4" stroke-linejoin="round"><path d="M66 66 Q58 20 24 22 Q66 30 110 52 Z" fill="#FF563D"/><path d="M154 66 Q162 20 196 22 Q154 30 110 52 Z" fill="#FF563D"/><path d="M66 66 Q110 30 154 66 Z" fill="#FFFFFF"/><circle cx="24" cy="22" r="9" fill="#D7FF38" stroke-width="3"/><circle cx="196" cy="22" r="9" fill="#D7FF38" stroke-width="3"/></g>',
    },
    face: {
      D: '<g fill="#11130F"><rect x="76" y="78" width="30" height="19" rx="7"/><rect x="114" y="78" width="30" height="19" rx="7"/><rect x="104" y="83" width="12" height="4"/></g>',
      N: '<g stroke="#11130F" stroke-width="4"><circle cx="92" cy="88" r="15" fill="rgba(94,216,241,.55)"/><circle cx="128" cy="88" r="15" fill="rgba(94,216,241,.55)"/><path d="M107 88 h6" /></g>',
      P: '<g fill="#FF563D" opacity=".55"><ellipse cx="80" cy="110" rx="10" ry="6"/><ellipse cx="140" cy="110" rx="10" ry="6"/></g>',
      J: '<g fill="none" stroke="#11130F" stroke-width="5" stroke-linecap="round"><path d="M110 115 C98 107 86 110 82 120 C80 126 72 125 73 118"/><path d="M110 115 C122 107 134 110 138 120 C140 126 148 125 147 118"/></g>',
    },
    neck: {
      D: '<path d="M103 146 L117 146 L121 157 L110 192 L99 157 Z" fill="#11130F"/>',
      N: '<g stroke="#11130F" stroke-width="3" fill="#5ED8F1"><rect x="78" y="138" width="64" height="15" rx="7"/><rect x="118" y="146" width="14" height="38" rx="5"/></g>',
      P: '<g stroke="#11130F" stroke-width="3" stroke-linejoin="round" fill="#D7FF38"><path d="M110 150 L86 138 L86 162 Z"/><path d="M110 150 L134 138 L134 162 Z"/><circle cx="110" cy="150" r="6" fill="#11130F"/></g>',
      J: '<path d="M70 146 L80 160 L88 144 L98 160 L106 144 L114 160 L122 144 L132 160 L140 144 L150 158 L148 140 L72 140 Z" fill="#FF563D" stroke="#11130F" stroke-width="3" stroke-linejoin="round"/>',
    },
    hand: {
      D: '<g stroke="#11130F" stroke-width="4" stroke-linejoin="round"><path d="M172 158 L206 134 L206 186 L172 168 Z" fill="#FF563D"/><rect x="176" y="168" width="9" height="16" rx="3" fill="#11130F"/></g>',
      N: '<g stroke="#11130F"><line x1="182" y1="150" x2="168" y2="170" stroke-width="8" stroke-linecap="round"/><circle cx="194" cy="136" r="18" fill="rgba(94,216,241,.6)" stroke-width="5"/></g>',
      P: '<g stroke="#11130F" stroke-linejoin="round"><line x1="177" y1="172" x2="177" y2="100" stroke-width="4" stroke-linecap="round"/><path d="M177 102 L212 112 L177 126 Z" fill="#FFFFFF" stroke-width="3"/></g>',
      J: '<g stroke="#11130F" stroke-width="3" stroke-linejoin="round"><path d="M180 150 Q182 122 200 116" fill="none" stroke-width="7" stroke="#11130F"/><path d="M180 150 Q182 122 200 116" fill="none" stroke-width="4" stroke="#D7FF38"/><ellipse cx="188" cy="156" rx="18" ry="11" fill="#D7FF38"/><circle cx="202" cy="114" r="8" fill="#D7FF38"/><path d="M209 113 L218 116 L209 119 Z" fill="#FF563D"/><path d="M198 106 l3 -6 l3 6" fill="#FF563D"/></g>',
    },
  };

  function charSVG(props, fresh, size) {
    props = props || {};
    var p = function (slot) {
      var k = props[slot]; if (!k) return "";
      return fresh === slot ? '<g class="prop-new">' + PROPS[slot][k] + "</g>" : PROPS[slot][k];
    };
    var dim = size ? ' width="' + size[0] + '" height="' + size[1] + '"' : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 262"' + dim + '>' +
      '<ellipse cx="110" cy="254" rx="62" ry="7" fill="rgba(17,19,15,.14)"/>' +
      '<g class="char-body">' +
      '<ellipse cx="86" cy="248" rx="20" ry="9" fill="#11130F"/><ellipse cx="134" cy="248" rx="20" ry="9" fill="#11130F"/>' +
      '<path d="M66 246 Q56 160 110 144 Q164 160 154 246 Z" fill="#FFFFFF" stroke="#11130F" stroke-width="5" stroke-linejoin="round"/>' +
      '<circle cx="110" cy="190" r="6" fill="#FF563D" stroke="#11130F" stroke-width="2.5"/><circle cx="110" cy="216" r="6" fill="#FF563D" stroke="#11130F" stroke-width="2.5"/>' +
      '<path d="M72 184 Q52 196 44 214" fill="none" stroke="#11130F" stroke-width="5" stroke-linecap="round"/><circle cx="43" cy="216" r="9" fill="#FFFFFF" stroke="#11130F" stroke-width="4"/>' +
      '<path d="M148 182 Q166 176 174 164" fill="none" stroke="#11130F" stroke-width="5" stroke-linecap="round"/>' +
      p("neck") +
      '<circle cx="110" cy="96" r="50" fill="#FFFFFF" stroke="#11130F" stroke-width="5"/>' +
      '<ellipse cx="92" cy="88" rx="5" ry="7" fill="#11130F"/><ellipse cx="128" cy="88" rx="5" ry="7" fill="#11130F"/>' +
      '<path d="M90 122 Q110 140 130 122" fill="none" stroke="#11130F" stroke-width="5" stroke-linecap="round"/>' +
      p("face") +
      '<circle cx="110" cy="105" r="12" fill="#FF563D" stroke="#11130F" stroke-width="3.5"/><circle cx="106" cy="101" r="3" fill="#FFFFFF" opacity=".8"/>' +
      p("head") + p("hand") +
      '<circle cx="176" cy="164" r="9" fill="#FFFFFF" stroke="#11130F" stroke-width="4"/>' +
      "</g></svg>";
  }


  // ---------- экраны ----------
  function intro() {
    state = { scene: 0, choices: [], props: {}, take2: "0" };
    dots(0);
    var last = store("vibe_last");
    var lastHtml = last && C.vibes[last.k] ? '<div class="last">В прошлый раз вышел вайб «' + esc(C.vibes[last.k].name) + '». Проверим, какой сегодня?</div>' : "";
    render(
      '<section class="intro">' +
      '<div class="char-wrap">' + charSVG({ head: "J" }) + "</div>" +
      "<h1>Какой у тебя <em>вайб</em>?</h1>" +
      '<p class="lead">' + esc(C.intro.lead) + "</p>" + lastHtml +
      '<button class="btn btn-lime" id="go">' + esc(C.intro.cta) + "</button>" +
      '<p class="meta">' + esc(C.intro.meta) + "</p></section>"
    );
    document.getElementById("go").onclick = function () { scene(0); };
  }

  function scene(i) {
    state.scene = i;
    dots(i + 1);
    var sc = C.scenes[i];
    var opts = ORDER[i].map(function (k) {
      return '<button class="opt" data-k="' + k + '">' + esc(sc.options[k].label) + "</button>";
    }).join("");
    render(
      '<div class="slate"><div class="slate-top"></div><div class="slate-body"><span>СИТУАЦИЯ ' + (i + 1) + " / 4</span><span id=\"take\">ДУБЛЬ 1</span></div></div>" +
      '<div class="stage"><h2>' + esc(sc.title) + '</h2><div class="char-wrap" id="char">' + charSVG(state.props) + "</div></div>" +
      '<p class="scene-text">' + esc(sc.text) + "</p>" +
      '<p class="ask">Твой ход?</p><div class="opts" id="opts">' + opts + '</div><div id="after"></div>'
    );
    Array.prototype.forEach.call(document.querySelectorAll(".opt"), function (b) {
      b.onclick = function () { pick(i, b.getAttribute("data-k"), b); };
    });
  }

  function pick(i, k, btn) {
    var box = document.getElementById("opts");
    if (box.classList.contains("done")) return;
    box.classList.add("done");
    btn.classList.add("picked");
    state.choices[i] = k;
    state.props[SLOTS[i]] = k;
    document.getElementById("char").innerHTML = charSVG(state.props, SLOTS[i]);
    var sc = C.scenes[i];
    var after = document.getElementById("after");
    var last = i === C.scenes.length - 1;
    after.innerHTML = '<div class="bubble"><b>И ВОТ ЧТО ПРОИСХОДИТ</b>' + esc(sc.options[k].reaction) + "</div>" +
      '<button class="btn btn-ink next" id="next">' + (sc.retake ? "Дальше" : last ? "Узнать свой вайб" : "Следующая ситуация") + "</button>";
    document.getElementById("next").onclick = function () {
      if (sc.retake) return retake(i, k);
      last ? result() : scene(i + 1);
    };
    setTimeout(function () { after.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 120);
  }

  function retake(i, k) {
    var alt = OPPOSITE[k];
    var name = C.vibes[alt].name;
    var after = document.getElementById("after");
    after.innerHTML = '<div class="cut"><h3>' + esc(C.retake.stop) + "</h3><p>" + esc(fmt(C.retake.voice, { name: name })) + "</p>" +
      '<button class="btn btn-ink" id="t2go">' + esc(fmt(C.retake.go, { name: name })) + '</button><button class="btn btn-ghost" id="t2skip">' + esc(C.retake.skip) + "</button></div>";
    after.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("t2skip").onclick = function () { state.take2 = "0"; scene(i + 1); };
    document.getElementById("t2go").onclick = function () {
      state.take2 = alt;
      document.getElementById("take").textContent = "ДУБЛЬ 2";
      var tmp = Object.assign({}, state.props); tmp[SLOTS[i]] = alt;
      document.getElementById("char").innerHTML = charSVG(tmp, SLOTS[i]);
      var sc = C.scenes[i];
      after.innerHTML = '<div class="opts done"><button class="opt picked take2">' + esc(sc.options[alt].label) + "</button></div>" +
        '<div class="bubble"><b>ВАЙБ ' + esc(name.toUpperCase()) + "А</b>" + esc(sc.options[alt].reaction) + "</div>" +
        '<p class="aside">' + esc(C.retake.after) + "</p>" +
        '<button class="btn btn-ink next" id="next2">Следующая ситуация</button>';
      after.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("next2").onclick = function () { scene(i + 1); };
    };
  }

  function score() {
    var c = 0, a = 0;
    state.choices.forEach(function (k, i) { c += C.vibes[k].vec.c * WEIGHTS[i]; a += C.vibes[k].vec.a * WEIGHTS[i]; });
    var k = c > 0 ? (a > 0 ? "D" : "N") : (a > 0 ? "J" : "P");
    return { k: k, c: c, a: a };
  }

  // уровни статов 1–5: каждый выбор качает стат своего вайба
  function levels() {
    var lv = { D: 1, N: 1, P: 1, J: 1 };
    state.choices.forEach(function (k) { lv[k] = Math.min(5, lv[k] + 1); });
    return lv;
  }


  // насколько ты дальше от середины шкалы, чем остальные (оценка модели)
  function pct(v) { return Math.round(50 + 46 * Math.tanh(Math.abs(v) / 2.6)); }

  function payload(live) {
    var s = score();
    return [s.k, state.choices.join(""), state.take2, live ? "L" : "G", src].join("_");
  }
  function tgLink(live) { return "https://t.me/" + C.bot + "?start=" + payload(live); }

  function pips(n, cls) {
    var h = "";
    for (var i = 1; i <= 5; i++) h += '<i class="' + (i <= n ? "on" : "") + '"></i>';
    return '<span class="pips ' + (cls || "") + '">' + h + "</span>";
  }

  function scaleRow(v, left, right, text) {
    var pos = Math.max(6, Math.min(94, 50 - (v / 4.2) * 44));
    return '<div class="scale"><div class="scale-l"><span>' + left + "</span><span>" + right + '</span></div>' +
      '<div class="track"><span class="mid"></span><span class="mark" style="left:' + pos + '%"></span></div>' +
      '<p class="scale-t">' + text + "</p></div>";
  }

  function result() {
    var s = score(), V = C.vibes[s.k], R = C.result, lv = levels();
    var weak = OPPOSITE[s.k], W = C.stats[weak];  // зона прокачки — стат противоположного вайба (так же в боте)
    store("vibe_last", { k: s.k, at: Date.now() });
    dots(4);

    var rare = R.rare[V.share] ? " · " + R.rare[V.share] : "";
    var dist = KEYS.slice().sort(function (x, y) { return C.vibes[y].share - C.vibes[x].share; });
    var bar = dist.map(function (k) {
      var v = C.vibes[k];
      return '<span class="seg' + (k === s.k ? " me" : "") + '" style="flex:' + v.share + ";background:" + v.color + ";color:" + v.ink + '">' + v.share + "%</span>";
    }).join("");
    var legend = dist.map(function (k) {
      var v = C.vibes[k];
      return '<li class="' + (k === s.k ? "me" : "") + '"><i style="background:' + v.color + '"></i>' + esc(v.name) + "<b>" + v.share + "%</b>" + (k === s.k ? "<em>← ты</em>" : "") + "</li>";
    }).join("");

    var cText = s.c > 0 ? "Держишь контроль крепче, чем <b>" + pct(s.c) + "%</b> игроков" : "Доверяешь моменту легче, чем <b>" + pct(s.c) + "%</b> игроков";
    var aText = s.a > 0 ? "Действуешь быстрее, чем <b>" + pct(s.a) + "%</b> игроков" : "Взвешиваешь тщательнее, чем <b>" + pct(s.a) + "%</b> игроков";

    var top = KEYS.reduce(function (m, k) { return lv[k] > lv[m] ? k : m; }, s.k);
    var stats = KEYS.map(function (k) {
      var st = C.stats[k];
      var tag = k === weak ? '<em class="up">зона прокачки ↑</em>' : k === top ? '<em>главный стат</em>' : "";
      return '<div class="stat' + (k === weak ? " weak" : "") + '"><div class="stat-h"><b>' + esc(st.name) + "</b>" + tag + "</div>" +
        pips(lv[k]) + '<small>' + esc(st.hint) + "</small></div>";
    }).join("");

    var recog = V.recognize.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var sk = { skill: W.name, skill_gen: W.gen, skill_acc: W.acc };

    render(
      '<p class="res-kicker">' + R.kicker + "</p>" +
      '<div class="hero" style="background:' + V.color + ";color:" + V.ink + '">' +
      '<p class="vibe-sub">' + esc(V.vibe) + "</p><h1>" + esc(V.name) + '</h1><p class="tag">«' + esc(V.tagline) + '»</p>' +
      '<div class="char-wrap">' + charSVG(state.props) + "</div>" +
      '<p class="chip">≈' + V.share + "% игроков" + esc(rare) + "</p></div>" +
      '<div class="row2 share-row"><button class="btn btn-ink" id="card">' + R.shareCard + '</button><button class="btn" id="friend">' + R.friend + "</button></div>" +

      '<h3 class="sec">' + R.recognize + '</h3><ul class="recog">' + recog + "</ul>" +

      '<h3 class="sec">' + R.others + "</h3>" +
      '<div class="block"><div class="dist">' + bar + '</div><ul class="legend">' + legend + "</ul>" +
      scaleRow(s.c, "держу контроль", "доверяю моменту", cText) +
      scaleRow(s.a, "действую сразу", "сначала прочувствую", aText) +
      '<p class="foot">' + R.footnote + "</p></div>" +

      '<h3 class="sec">' + R.stats + '</h3><div class="block stats">' + stats + "</div>" +

      '<div class="block power"><h4>⚡ ' + R.power + "</h4><p>" + esc(V.power) + "</p></div>" +
      '<div class="block bug"><h4>🐞 ' + R.bug + "</h4>" +
      '<p class="belief"><span>' + R.belief + ":</span> " + esc(V.belief) + "</p>" +
      '<p><b>Ловушка мозга — ' + esc(V.trap.toLowerCase()) + ".</b> " + esc(V.trapText) + "</p>" +
      '<p class="cost">' + esc(V.cost) + "</p></div>" +

      '<div class="block level"><h4>' + R.level + '</h4><p class="lvl-name">' + esc(W.name) + " " + pips(lv[weak], "dark") + "</p>" +
      "<p>" + esc(W.why) + "</p>" +
      '<h4 class="mt">' + R.inGame + '</h4><p class="pr">«' + esc(W.principle) + "»</p><p>" + esc(W.game) + "</p>" +
      '<h4 class="mt">' + R.tomorrow + "</h4><p>" + esc(W.tomorrow) + "</p></div>" +

      '<div class="tg"><h3>' + esc(fmt(R.tgTitle, sk)) + "</h3><p>" + esc(fmt(R.tgSub, sk)) + '</p><a class="btn btn-lime" id="tg" href="' + tgLink(false) + '">' + R.tgBtn + "</a></div>" +
      '<a class="btn btn-coral live" id="live" href="' + tgLink(true) + '">' + R.live + "</a>" +
      '<p class="note">' + R.notDiagnosis + (state.take2 !== "0" ? R.notDiagnosisRetook : "") + "</p>" +
      '<div class="rule"><small>ГЛАВНОЕ ПРАВИЛО ПЛОЩАДКИ</small>' + esc(C.houseRule) + "</div>" +
      '<button class="btn btn-ghost" id="replay">' + R.replay + "</button>"
    );
    ["tg", "live"].forEach(function (id) {
      document.getElementById(id).onclick = function (e) {
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initData) {
          e.preventDefault();
          Telegram.WebApp.openTelegramLink(this.href);
          setTimeout(function () { try { Telegram.WebApp.close(); } catch (x) {} }, 400);
        }
      };
    });
    document.getElementById("card").onclick = function () { makeCard(s.k, lv); };
    document.getElementById("friend").onclick = function () { invite(V); };
    document.getElementById("replay").onclick = intro;
  }

  // ---------- карточка для сторис ----------
  function wrap(ctx, text, maxW) {
    var words = text.split(" "), lines = [], line = "";
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function makeCard(k, lv) {
    var V = C.vibes[k];
    var W = 1080, H = 1920, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var F = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
    var ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("900 100px " + F), document.fonts.load("800 60px " + F), document.fonts.load("600 40px " + F)]) : Promise.resolve();
    ready.catch(function () {}).then(function () {
      var ink = V.ink, dim = ink === "#FFFFFF" ? "rgba(255,255,255,.3)" : "rgba(17,19,15,.18)";
      ctx.fillStyle = V.color; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = ink; ctx.textBaseline = "alphabetic";
      ctx.font = "800 38px " + F; ctx.fillText("LIZA'S PLAYGROUND ✳", 80, 120);
      ctx.font = "800 46px " + F; ctx.fillText("МОЙ ВАЙБ", 80, 230);
      var size = 180; ctx.font = "900 " + size + "px " + F;
      while (ctx.measureText(V.name.toUpperCase()).width > W - 160 && size > 80) { size -= 6; ctx.font = "900 " + size + "px " + F; }
      ctx.fillText(V.name.toUpperCase(), 74, 230 + size * 0.98);
      ctx.font = "800 54px " + F;
      var ty = 230 + size * 0.98 + 115;
      var tl = wrap(ctx, "«" + V.tagline + "»", W - 160);
      tl.forEach(function (l, n) { ctx.fillText(l, 80, ty + n * 66); });
      var cy = ty + (tl.length - 1) * 66 + 300, chipY = cy + 280, statY = chipY + 180;

      ctx.fillStyle = COLORS.paper; ctx.beginPath(); ctx.arc(540, cy, 240, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 8; ctx.stroke();

      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 540 - 200, cy - 232, 400, 476);
        // плашка редкости
        var chip = "≈" + V.share + "% людей с таким вайбом";
        ctx.font = "800 46px " + F;
        var cw = ctx.measureText(chip).width + 80;
        ctx.fillStyle = COLORS.ink; rr(ctx, (W - cw) / 2, chipY, cw, 90, 45); ctx.fill();
        ctx.fillStyle = COLORS.lime; ctx.fillText(chip, (W - cw) / 2 + 40, chipY + 61);
        // статы
        KEYS.forEach(function (key, n) {
          var y = statY + n * 66;
          ctx.fillStyle = ink; ctx.font = "700 40px " + F; ctx.fillText(C.stats[key].name, 80, y + 14);
          for (var p = 0; p < 5; p++) {
            ctx.fillStyle = p < lv[key] ? ink : dim;
            rr(ctx, 520 + p * 96, y - 16, 84, 34, 17); ctx.fill();
          }
        });
        ctx.fillStyle = COLORS.ink; ctx.fillRect(0, 1700, W, 220);
        ctx.fillStyle = COLORS.lime; ctx.font = "900 72px " + F; ctx.fillText("А КАКОЙ ВАЙБ У ТЕБЯ?", 80, 1800);
        ctx.fillStyle = COLORS.paper; ctx.font = "600 40px " + F; ctx.fillText(C.siteLabel, 80, 1866);
        cv.toBlob(function (blob) { shareCard(blob, cv.toDataURL("image/png"), V); }, "image/png");
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(charSVG(state.props, null, [400, 476]));
    });
  }

  function shareCard(blob, dataUrl, V) {
    var file = blob ? new File([blob], "my-vibe.png", { type: "image/png" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], text: fmt(C.result.shareText, V) + " " + location.origin + location.pathname + "?s=card" })
        .catch(function (e) { if (e && e.name !== "AbortError") showModal(dataUrl); });
      return;
    }
    showModal(dataUrl);
  }

  function showModal(dataUrl) {
    var m = document.getElementById("modal");
    document.getElementById("modal-img").src = dataUrl;
    document.getElementById("modal-dl").href = dataUrl;
    m.hidden = false;
    document.getElementById("modal-close").onclick = function () { m.hidden = true; };
  }

  function invite(V) {
    var url = location.origin + location.pathname + "?s=fr";
    var text = fmt(C.result.inviteText, V);
    if (navigator.share) { navigator.share({ text: text, url: url }).catch(function () {}); return; }
    var full = text + " " + url;
    (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject()).then(function () { toast("Ссылка скопирована — отправь другу"); }, function () { prompt("Скопируй и отправь другу:", full); });
  }

  function toast(t) {
    var el = document.getElementById("toast");
    el.textContent = t; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  intro();
})();
