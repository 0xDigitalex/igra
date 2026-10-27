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
    var last = store("amplua_last");
    var lastHtml = last && C.amplua[last.k] ? '<div class="last">В прошлый раз было амплуа «' + esc(C.amplua[last.k].name) + '». Посмотрим, кто вышел на сцену сегодня?</div>' : "";
    render(
      '<section class="intro">' +
      '<div class="char-wrap">' + charSVG({ head: "J" }) + "</div>" +
      "<h1>Какое у тебя <em>амплуа</em>?</h1>" +
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
      '<div class="slate"><div class="slate-top"></div><div class="slate-body"><span>СЦЕНА ' + (i + 1) + " / 4</span><span>ДУБЛЬ 1</span></div></div>" +
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
      (sc.retake ? '<button class="btn btn-ink next" id="next">Дальше</button>' :
        '<button class="btn btn-ink next" id="next">' + (last ? "Узнать амплуа" : "Следующая сцена") + "</button>");
    document.getElementById("next").onclick = function () {
      if (sc.retake) return retake(i, k);
      last ? result() : scene(i + 1);
    };
    setTimeout(function () { after.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 120);
  }

  function retake(i, k) {
    var alt = OPPOSITE[k];
    var name = C.amplua[alt].name;
    var after = document.getElementById("after");
    after.innerHTML = '<div class="cut"><h3>' + esc(C.retake.stop) + "</h3><p>" + esc(fmt(C.retake.voice, { name: name })) + "</p>" +
      '<button class="btn btn-ink" id="t2go">' + esc(C.retake.go) + '</button><button class="btn btn-ghost" id="t2skip">' + esc(C.retake.skip) + "</button></div>";
    after.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("t2skip").onclick = function () { state.take2 = "0"; scene(i + 1); };
    document.getElementById("t2go").onclick = function () {
      state.take2 = alt;
      document.querySelector(".slate-body span:last-child").textContent = "ДУБЛЬ 2";
      var tmp = Object.assign({}, state.props); tmp[SLOTS[i]] = alt;
      document.getElementById("char").innerHTML = charSVG(tmp, SLOTS[i]);
      var sc = C.scenes[i];
      after.innerHTML = '<div class="opts done"><button class="opt picked take2">' + esc(sc.options[alt].label) + "</button></div>" +
        '<div class="bubble"><b>ДУБЛЬ 2 · ' + esc(name.toUpperCase()) + "</b>" + esc(sc.options[alt].reaction) + "</div>" +
        '<p class="aside">' + esc(C.retake.after) + "</p>" +
        '<button class="btn btn-ink next" id="next2">Следующая сцена</button>';
      after.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("next2").onclick = function () { scene(i + 1); };
    };
  }

  function score() {
    var c = 0, a = 0;
    state.choices.forEach(function (k, i) { c += C.amplua[k].vec.c * WEIGHTS[i]; a += C.amplua[k].vec.a * WEIGHTS[i]; });
    var k = c > 0 ? (a > 0 ? "D" : "N") : (a > 0 ? "J" : "P");
    return { k: k, c: c, a: a };
  }

  function payload(live) {
    var s = score();
    return [s.k, state.choices.join(""), state.take2, live ? "L" : "G", src].join("_");
  }
  function tgLink(live) { return "https://t.me/" + C.bot + "?start=" + payload(live); }

  function result() {
    var s = score(), A = C.amplua[s.k], R = C.result;
    store("amplua_last", { k: s.k, at: Date.now() });
    dots(4);
    var max = 4.2;
    // карта: слева контроль, справа доверие; сверху действие, снизу внутрь
    var x = 50 - (s.c / max) * 38, y = 50 - (s.a / max) * 38;
    var cells = ["D", "J", "N", "P"].map(function (q) { return '<div class="' + (q === s.k ? "me" : "") + '">' + esc(C.amplua[q].name) + "</div>"; }).join("");
    var ghost = "";
    if (state.take2 !== "0") {
      var g = C.amplua[state.take2].vec;
      ghost = '<span class="pin ghost" style="left:' + (50 - g.c * 26) + "%;top:" + (50 - g.a * 26) + '%"></span>' +
        '<span class="pin-l" style="left:' + (50 - g.c * 26) + "%;top:" + (50 - g.a * 26) + '%">дубль 2</span>';
    }
    render(
      '<p class="res-kicker">' + R.kicker + "</p>" +
      '<div class="hero" style="background:' + A.color + ";color:" + A.ink + '"><h1>' + esc(A.name) + '</h1><p class="tag">«' + esc(A.tagline) + '»</p>' +
      '<div class="char-wrap">' + charSVG(state.props) + "</div></div>" +
      '<p class="quote">' + esc(A.quote) + "</p>" +
      '<p class="about">' + esc(A.about) + "</p>" +
      '<div class="block"><h4>' + R.gives + "</h4><p>" + esc(A.gives) + "</p></div>" +
      '<div class="block"><h4>' + R.costs + "</h4><p>" + esc(A.costs) + "</p></div>" +
      '<div class="block move"><h4>' + R.newMove + '</h4><p class="pr">«' + esc(A.principle) + "»</p><p>" + esc(A.move) + "</p></div>" +
      '<div class="map"><div class="map-grid">' + cells +
      '<span class="pin" style="left:' + x + "%;top:" + y + '%"></span><span class="pin-l" style="left:' + x + "%;top:" + y + '%">ты</span>' + ghost + "</div>" +
      '<div class="axis"><span>← держу контроль</span><span>доверяю сцене →</span></div>' +
      '<p class="map-cap">Сверху — те, кто действует, снизу — те, кто сначала проживает внутри. Ты здесь. А вся остальная карта — тоже твоя.</p></div>' +
      '<p class="note">' + R.notDiagnosis + (state.take2 !== "0" ? R.notDiagnosisRetook : R.notDiagnosisSkipped) + "</p>" +
      '<div class="tg"><h3>' + R.tgTitle + "</h3><p>" + R.tgSub + '</p><a class="btn btn-lime" id="tg" href="' + tgLink(false) + '">Играть дальше в Telegram</a></div>' +
      '<div class="row2"><button class="btn" id="card">' + R.card + '</button><button class="btn" id="friend">' + R.friend + "</button></div>" +
      '<a class="btn btn-coral live" id="live" href="' + tgLink(true) + '">' + R.live + "</a>" +
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
    document.getElementById("card").onclick = function () { makeCard(s.k); };
    document.getElementById("friend").onclick = function () { invite(A); };
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

  function makeCard(k) {
    var A = C.amplua[k];
    var W = 1080, H = 1920, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var F = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
    var ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("900 100px " + F), document.fonts.load("800 60px " + F)]) : Promise.resolve();
    ready.catch(function () {}).then(function () {
      ctx.fillStyle = A.color; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = A.ink; ctx.textBaseline = "alphabetic";
      ctx.font = "800 40px " + F; ctx.fillText("LIZA'S PLAYGROUND ✳", 80, 130);
      ctx.font = "600 44px " + F; ctx.fillText("МОЁ АМПЛУА СЕГОДНЯ", 80, 250);
      var size = 190; ctx.font = "900 " + size + "px " + F;
      while (ctx.measureText(A.name.toUpperCase()).width > W - 160 && size > 80) { size -= 6; ctx.font = "900 " + size + "px " + F; }
      ctx.fillText(A.name.toUpperCase(), 76, 250 + size * 0.95);
      ctx.fillStyle = COLORS.paper; ctx.beginPath(); ctx.arc(540, 900, 330, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 8; ctx.stroke();
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 540 - 290, 900 - 330, 580, 690);
        ctx.fillStyle = A.ink; ctx.font = "800 66px " + F;
        wrap(ctx, "«" + A.tagline + "»", W - 160).forEach(function (l, n) { ctx.fillText(l, 80, 1380 + n * 80); });
        ctx.fillStyle = COLORS.ink; ctx.fillRect(0, 1640, W, 280);
        ctx.fillStyle = COLORS.lime; ctx.font = "900 76px " + F; ctx.fillText("А ТЫ КАКОЙ ИГРОК?", 80, 1765);
        ctx.fillStyle = COLORS.paper; ctx.font = "600 40px " + F; ctx.fillText(C.siteLabel, 80, 1845);
        cv.toBlob(function (blob) { shareCard(blob, cv.toDataURL("image/png"), A); }, "image/png");
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(charSVG(state.props, null, [580, 690]));
    });
  }

  function shareCard(blob, dataUrl, A) {
    var file = blob ? new File([blob], "amplua.png", { type: "image/png" }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], text: fmt(C.result.shareText, A) + " " + location.origin + location.pathname + "?s=card" })
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

  function invite(A) {
    var url = location.origin + location.pathname + "?s=fr";
    var text = fmt(C.result.shareText, A);
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
