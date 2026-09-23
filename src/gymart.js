// © 2026 Qpio. Brain Gym — the pictures.
//
// CEO, 21 Sep 2026: "we need more illustration, some people are more visual —
// if I see a picture I can already read the question and place a context to
// speed my understanding."
//
// THE RULE. A puzzle carries a SCENE, not a picture: a small plain-data object
// with no words in it, identical in English and French for one seed, and never
// containing the answer. This file turns a scene into inline SVG — string
// builders only, no DOM, no network, no assets to license — so the same scene
// is drawn the same way on the phone, in the review tool and in the test that
// proves the drawing never gives the answer away (curio-hq/tools/test_braingym.js).
//
// Words the picture needs (day initials, compass letters, a group's noun) come
// in through `labels`; the scene itself stays language-free.
//
// Colours are the app's own tokens plus five fixed tile tones chosen far apart
// in brightness, so a reader who cannot tell red from green still tells the
// tiles apart — and no puzzle here ever rests on colour alone.

(function () {
  "use strict";

  var VERSION = 1;
  var PAL = ["#26BAD8", "#E4695F", "#F2C14E", "#3FBF9A", "#B58CF5"];   /* cyan, coral, amber, green, violet */
  var LETTER = { c: 0, b: 1, y: 2, g: 3, v: 4 };                          /* the twin puzzle's colour letters */

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function open(w, h, extra) {
    /* a nested tile passes its own width and height; the outer picture fills its box */
    var size = extra && /width=/.test(extra) ? "" : ' width="100%"';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '"' + size + ' preserveAspectRatio="xMidYMid meet" font-family="system-ui, sans-serif"' + (extra ? " " + extra : "") + ">";
  }
  var CLOSE = "</svg>";
  function text(x, y, s, size, extra) {
    /* the caller's fill wins: a repeated attribute keeps the FIRST, so the default must not come before it */
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="central" font-size="' + (size || 14) + '"' + (/\bfill=/.test(extra || "") ? "" : ' fill="var(--ink)"') + (extra ? " " + extra : "") + ">" + esc(s) + "</text>";
  }
  function rect(x, y, w, h, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" ' + (extra || 'fill="var(--card2)" stroke="var(--line)"') + "/>"; }
  var DEG = Math.PI / 180;
  function pt(cx, cy, r, deg) { return [cx + r * Math.sin(deg * DEG), cy - r * Math.cos(deg * DEG)]; }
  function fmt(n) { return Math.round(n * 10) / 10; }

  /* ---------------------------------------------- the tile shapes (56 × 56) */
  var SHAPES = {
    tri: "M28 9 L48 46 L8 46 Z",
    nsq: "M10 10 H46 V30 L30 46 H10 Z",   /* notched ON PURPOSE: only spot/rotation uses it, and a true square turned a quarter turn looks unchanged */
    sq: "M10 10 H46 V46 H10 Z",           /* a true square, for every form that names the shape aloud */
    arrow: "M28 8 L47 30 H35 V48 H21 V30 H9 Z",
    dia: "M28 8 L48 28 L28 48 L8 28 Z",
    star: (function () { var d = "", i; for (i = 0; i < 10; i++) { var p = pt(28, 29, i % 2 ? 9 : 20, i * 36); d += (i ? " L" : "M") + fmt(p[0]) + " " + fmt(p[1]); } return d + " Z"; })()
  };
  /* one tile: shape s, rotation r, filled f, inner dot d, palette colour c */
  function tile(t, opts) {
    opts = opts || {};
    var fill = t.f ? (t.c !== undefined && t.c !== null ? PAL[t.c] : "var(--brand)") : "none";
    var stroke = t.f ? "none" : (t.c !== undefined && t.c !== null ? PAL[t.c] : "var(--ink)");
    var body;
    if (t.s === "ring") body = '<circle cx="28" cy="28" r="18" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/>' + (t.f ? '<circle cx="28" cy="28" r="7" fill="var(--bg2)"/>' : "");
    else body = '<path d="' + (SHAPES[t.s] || SHAPES.dia) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.5" stroke-linejoin="round"/>';
    var dot = t.d ? '<circle cx="28" cy="30" r="4" fill="' + (t.f ? "var(--bg2)" : "var(--ink)") + '"/>' : "";
    return open(56, 56, opts.attrs) + '<g transform="rotate(' + (t.r || 0) + ' 28 28)">' + body + "</g>" + dot + CLOSE;
  }

  /* ------------------------------------------ the objects (what changed?) */
  var OBJECTS = {
    house: '<path d="M10 28 L28 10 L46 28 V48 H10 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="23" y="32" width="10" height="16" fill="currentColor"/>',
    star: '<path d="' + SHAPES.star + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    ring: '<circle cx="28" cy="28" r="17" fill="none" stroke="currentColor" stroke-width="5"/>',
    arrow: '<path d="' + SHAPES.arrow + '" fill="currentColor"/>',
    cup: '<path d="M12 16 H40 L37 44 H15 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M40 22 C50 22 50 36 39 36" fill="none" stroke="currentColor" stroke-width="3"/>',
    leaf: '<path d="M12 44 C12 20 30 10 46 12 C46 30 34 46 12 44 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 42 L40 16" stroke="currentColor" stroke-width="2"/>',
    key: '<circle cx="18" cy="22" r="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M25 27 L46 46 M40 40 L44 36 M35 35 L39 31" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    moon: '<path d="M48 10 A20 20 0 1 0 48 46 A24 24 0 1 1 48 10 Z" fill="currentColor"/>',   /* the inner radius MUST exceed half the chord, or SVG enlarges it and the crescent collapses to nothing */
    drop: '<path d="M28 8 C28 8 12 28 12 36 A16 16 0 0 0 44 36 C44 28 28 8 28 8 Z" fill="none" stroke="currentColor" stroke-width="3"/>',
    bell: '<path d="M14 40 C14 22 18 12 28 10 C38 12 42 22 42 40 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M10 40 H46" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="46" r="4" fill="currentColor"/>',
    heart: '<path d="M28 46 C10 34 6 24 12 16 C17 10 25 12 28 18 C31 12 39 10 44 16 C50 24 46 34 28 46 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    cloud: '<path d="M16 42 H40 A8 8 0 0 0 40 26 A11 11 0 0 0 19 23 A10 10 0 0 0 16 42 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>'
  };
  function objectTile(o, opts) {
    opts = opts || {};
    return open(56, 56, opts.attrs) + '<g color="var(--ink)" transform="rotate(' + (o.r || 0) + ' 28 28)">' + (OBJECTS[o.s] || OBJECTS.ring) + "</g>" + CLOSE;
  }

  /* --------------------------------------------- the drills' guide paths
     Each shape is a list of points fitted into 260 × 130 (a panel of 320 × 160
     with a 30 px margin), so it can be drawn as a path AND sampled for the
     numbered arrowheads a reader without motion follows. */
  function poly(fn, n, closed) { var pts = [], i; for (i = 0; i < n; i++) pts.push(fn(i / n)); if (closed) pts.push(pts[0]); return pts; }
  var PATHS = {
    circle: poly(function (u) { var p = pt(160, 80, 60, u * 360); return [fmt(p[0]), fmt(p[1])]; }, 48, true),
    eight: poly(function (u) { var a = u * 2 * Math.PI; var d = 1 + Math.pow(Math.sin(a), 2); return [fmt(160 + 120 * Math.cos(a) / d), fmt(80 + 55 * Math.sin(a) * Math.cos(a) / d)]; }, 64, true),
    triangle: (function () { var c = [[160, 22], [270, 135], [50, 135]], pts = [], i, k; for (i = 0; i < 3; i++) for (k = 0; k < 12; k++) { var a = c[i], b = c[(i + 1) % 3], u = k / 12; pts.push([fmt(a[0] + (b[0] - a[0]) * u), fmt(a[1] + (b[1] - a[1]) * u)]); } pts.push(pts[0]); return pts; })(),
    star: (function () { var pts = [], i, k; var c = []; for (i = 0; i < 5; i++) c.push(pt(160, 84, 62, i * 144)); for (i = 0; i < 5; i++) for (k = 0; k < 10; k++) { var a = c[i], b = c[(i + 1) % 5], u = k / 10; pts.push([fmt(a[0] + (b[0] - a[0]) * u), fmt(a[1] + (b[1] - a[1]) * u)]); } pts.push(pts[0]); return pts; })(),
    spiral: poly(function (u) { var a = u * 3 * 2 * Math.PI, r = 8 + 56 * u; return [fmt(160 + r * 1.9 * Math.cos(a)), fmt(80 + r * Math.sin(a))]; }, 72, false),
    wave: poly(function (u) { return [fmt(30 + 260 * u), fmt(80 - 45 * Math.sin(u * 2 * Math.PI * 1.5))]; }, 48, false)
  };
  function pathD(pts) { var d = "", i; for (i = 0; i < pts.length; i++) d += (i ? " L" : "M") + pts[i][0] + " " + pts[i][1]; return d; }
  function guidePath(shape, dir, lap, motion, ox, oy, scale, speed) {
    var pts = (PATHS[shape] || PATHS.circle).slice();
    if (dir === -1) pts.reverse();
    if (scale !== 1 || ox || oy) pts = pts.map(function (p) { return [fmt(ox + p[0] * scale), fmt(oy + p[1] * scale)]; });
    var d = pathD(pts), id = "gp" + shape + (dir === -1 ? "r" : "") + (ox || 0);
    var out = '<path id="' + id + '" d="' + d + '" fill="none" stroke="var(--line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    if (motion) {
      /* the reader's pace (22 Sep 2026): 0.5 means half as fast, so each lap takes twice as long */
      var lapS = fmt((lap || 8) / (speed > 0 ? speed : 1));
      out += '<circle r="9" fill="var(--brand)"><animateMotion dur="' + lapS + 's" repeatCount="indefinite"><mpath href="#' + id + '"/></animateMotion></circle>';
    } else {
      /* six numbered arrowheads along the way, in the direction of travel */
      var n = 6, i;
      for (i = 0; i < n; i++) {
        var k = Math.floor(i * (pts.length - 1) / n), a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)];
        var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;
        out += '<g transform="translate(' + a[0] + ' ' + a[1] + ')"><path d="M-8 -6 L8 0 L-8 6 Z" fill="var(--brand)" transform="rotate(' + fmt(ang) + ')"/>' +
               '<text x="0" y="-14" text-anchor="middle" font-size="12" fill="var(--ink)">' + (i + 1) + "</text></g>";
      }
    }
    return out;
  }

  /* a shape's outline alone - no dot, no numbers - for the picture of a swap */
  function outline(shape, ox, oy, scale) {
    var pts = (PATHS[shape] || PATHS.circle).map(function (p) { return [fmt(ox + p[0] * scale), fmt(oy + p[1] * scale)]; });
    return '<path d="' + pathD(pts) + '" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  /* ---------------------------------------------------------- a hand */
  function hand(id, x, y, side, lit) {
    /* palm plus five fingers; index..little are f1..f4 (left to right on a right hand), thumb is f0.
       A TOUCH (v103; the panel: "the thumb never moves, so the move itself is not shown"): when
       a finger is lit it bends down and the thumb swings across the palm to meet its tip, with
       a dot where they meet. Drawn, so it cannot show the wrong finger. */
    var mirror = side === "L" ? 'transform="translate(' + (x * 2 + 130) + ' 0) scale(-1 1)"' : "";
    var out = '<g ' + mirror + '>' + '<g transform="translate(' + x + ' ' + y + ')">';
    out += '<rect x="20" y="60" width="90" height="70" rx="18" fill="var(--card2)" stroke="var(--line)"/>';
    var fx = [26, 48, 70, 92], fh = [50, 62, 58, 44], i, touch = lit >= 1 && lit <= 4;
    /* the thumb first, so the lit finger lies over its tip and stays visible */
    var tx = touch ? fx[lit - 1] + 9 : 0, ty = touch ? 66 - Math.round(fh[lit - 1] / 2) + 9 : 0;
    if (touch) out += '<line x1="12" y1="110" x2="' + tx + '" y2="' + ty + '" stroke="var(--line)" stroke-width="20" stroke-linecap="round"/>' +
                      '<line id="' + id + 'f0" x1="12" y1="110" x2="' + tx + '" y2="' + ty + '" stroke="var(--card2)" stroke-width="17" stroke-linecap="round"/>';
    for (i = 0; i < 4; i++) {
      var h = touch && lit === i + 1 ? Math.round(fh[i] / 2) : fh[i];
      out += '<rect id="' + id + "f" + (i + 1) + '" x="' + fx[i] + '" y="' + (66 - h) + '" width="18" height="' + h + '" rx="9" fill="' + (lit === i + 1 ? "var(--brand)" : "var(--card2)") + '" stroke="var(--line)"/>';
    }
    if (!touch) out += '<rect id="' + id + 'f0" x="0" y="70" width="18" height="46" rx="9" fill="' + (lit === 0 ? "var(--brand)" : "var(--card2)") + '" stroke="var(--line)" transform="rotate(-40 9 116)"/>';
    return out + "</g></g>";
  }

  /* ================================================================ draw */
  function draw(scene, opts, labels) {
    opts = opts || {}; labels = labels || {};
    if (!scene || !scene.kind) return "";
    var k = scene.kind, i, out;

    /* a row of tiles — numbers, words, or four items to compare */
    if (k === "tiles") {
      var items = (scene.items || labels.items || []).slice(); if (scene.q) items.push("?");
      if (!items.length) return "";
      var n = items.length, w = Math.min(52, Math.floor((320 - 6 * (n - 1)) / n)), x0 = (320 - (w * n + 6 * (n - 1))) / 2;
      out = open(320, 64);
      for (i = 0; i < n; i++) {
        var q = scene.q && i === n - 1;
        out += rect(x0 + i * (w + 6), 8, w, 48, q ? 'fill="none" stroke="var(--brand)" stroke-width="2"' : undefined);
        out += text(x0 + i * (w + 6) + w / 2, 32, items[i], String(items[i]).length > 5 ? 11 : 18, 'font-weight="700"' + (q ? ' fill="var(--brand)"' : ""));
      }
      return out + CLOSE;
    }

    /* two islanders, and who speaks */
    if (k === "islanders") {
      var names = labels.names || ["", ""];
      out = open(320, 130);
      for (i = 0; i < 2; i++) {
        var cx = i ? 220 : 100, speaks = scene.speaks.indexOf(i) !== -1;
        out += '<circle cx="' + cx + '" cy="52" r="15" fill="none" stroke="var(--ink)" stroke-width="2.5"/>';
        out += '<path d="M' + (cx - 30) + ' 108 C' + (cx - 30) + ' 78 ' + (cx + 30) + ' 78 ' + (cx + 30) + ' 108 Z" fill="var(--card2)" stroke="var(--ink)" stroke-width="2"/>';
        out += text(cx, 120, names[i], 13, 'font-weight="700"');
        out += '<circle cx="' + (cx + 22) + '" cy="30" r="9" fill="var(--brand)"/>' + text(cx + 22, 30, "?", 12, 'fill="#0b1020" font-weight="700"');
        if (speaks) out += '<path d="M' + (cx - 44) + ' 8 h50 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 h-30 l-8 8 v-8 h-12 a6 6 0 0 1 -6 -6 v-14 a6 6 0 0 1 6 -6 z" fill="var(--card2)" stroke="var(--ink)" stroke-width="2"/>' + text(cx - 19, 22, "…", 16);
      }
      return out + CLOSE;
    }

    /* the clock: the time it reads and the turn to make; never the result */
    if (k === "clock") {
      var cxc = 100, cyc = 80, R = 60;
      out = open(320, 160) + '<circle cx="' + cxc + '" cy="' + cyc + '" r="' + R + '" fill="var(--card2)" stroke="var(--ink)" stroke-width="2.5"/>';
      for (i = 0; i < 12; i++) { var a1 = pt(cxc, cyc, R - 4, i * 30), a2 = pt(cxc, cyc, R - (i % 3 ? 8 : 12), i * 30); out += '<line x1="' + fmt(a1[0]) + '" y1="' + fmt(a1[1]) + '" x2="' + fmt(a2[0]) + '" y2="' + fmt(a2[1]) + '" stroke="var(--ink)" stroke-width="' + (i % 3 ? 1.5 : 3) + '"/>'; }
      [12, 3, 6, 9].forEach(function (num) { var p = pt(cxc, cyc, R - 22, num * 30); out += text(fmt(p[0]), fmt(p[1]), num, 13, 'font-weight="700"'); });
      var hh = pt(cxc, cyc, 30, scene.h * 30), mm = pt(cxc, cyc, 44, 0);
      out += '<line x1="' + cxc + '" y1="' + cyc + '" x2="' + fmt(mm[0]) + '" y2="' + fmt(mm[1]) + '" stroke="var(--muted)" stroke-width="3" stroke-linecap="round"/>';
      out += '<line x1="' + cxc + '" y1="' + cyc + '" x2="' + fmt(hh[0]) + '" y2="' + fmt(hh[1]) + '" stroke="var(--brand)" stroke-width="6" stroke-linecap="round"/>';
      out += '<circle cx="' + cxc + '" cy="' + cyc + '" r="4" fill="var(--ink)"/>';
      /* the turn: an arc around the rim from the top, clockwise, with an arrowhead */
      var s0 = pt(cxc, cyc, R + 14, 0), s1 = pt(cxc, cyc, R + 14, scene.turn), large = scene.turn > 180 ? 1 : 0;
      out += '<path d="M' + fmt(s0[0]) + ' ' + fmt(s0[1]) + ' A' + (R + 14) + ' ' + (R + 14) + ' 0 ' + large + ' 1 ' + fmt(s1[0]) + ' ' + fmt(s1[1]) + '" fill="none" stroke="var(--brand2, var(--brand))" stroke-width="3"/>';
      out += '<g transform="translate(' + fmt(s1[0]) + ' ' + fmt(s1[1]) + ') rotate(' + (scene.turn + 90) + ')"><path d="M-7 -6 L7 0 L-7 6 Z" fill="var(--brand2, var(--brand))"/></g>';
      out += text(250, 70, scene.turn + "°", 26, 'font-weight="700"') + '<path d="M232 94 A22 22 0 1 1 268 94" fill="none" stroke="var(--muted)" stroke-width="2.5"/><path d="M262 88 L270 96 L260 98 Z" fill="var(--muted)"/>';
      return out + CLOSE;
    }

    /* memory cards: the words while studying, empty numbered slots when asked */
    if (k === "cards") {
      var nn = scene.n, per = nn > 5 ? Math.ceil(nn / 2) : nn, rows = Math.ceil(nn / per), cw = Math.min(58, Math.floor((320 - 6 * (per - 1)) / per)), ch = 44;
      out = open(320, rows * (ch + 8) + 4);
      for (i = 0; i < nn; i++) {
        var r0 = Math.floor(i / per), c0 = i % per, inRow = Math.min(per, nn - r0 * per), xx = (320 - (cw * inRow + 6 * (inRow - 1))) / 2 + c0 * (cw + 6), yy = 4 + r0 * (ch + 8);
        var word = labels.words ? labels.words[i] : (scene.anchorIdx === i && labels.anchor ? labels.anchor : null);
        /* the card the question asks about is outlined in the brand colour; its word is still gone */
        var asked = !labels.words && scene.posAsked === i + 1;
        out += rect(xx, yy, cw, ch, word ? undefined : asked ? 'fill="none" stroke="var(--brand)" stroke-width="2.5"' : 'fill="none" stroke="var(--line)" stroke-dasharray="4 3"');
        out += word ? text(xx + cw / 2, yy + ch / 2, word, word.length > 7 ? 10 : 12, 'font-weight="700"') : text(xx + cw / 2, yy + ch / 2, i + 1, 13, 'fill="var(--muted)"');
      }
      return out + CLOSE;
    }

    /* three identical-size things, each its colour — size is what is asked */
    if (k === "things") {
      var nm = labels.names || ["", "", ""];
      out = open(320, 130);
      for (i = 0; i < 3; i++) {
        var tx = 55 + i * 105, col = PAL[scene.colours[i]];
        if (scene.thing === "tower") out += '<rect x="' + (tx - 15) + '" y="12" width="30" height="80" rx="4" fill="' + col + '"/>';
        else if (scene.thing === "rope") out += '<path d="M' + (tx - 40) + ' 55 c 10 -20 20 20 30 0 s 20 -20 30 0 s 20 20 20 0" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round"/>';
        else out += '<rect x="' + (tx - 25) + '" y="28" width="50" height="50" rx="6" fill="' + col + '"/>';
        out += text(tx, 108, nm[i], 12) + '<circle cx="' + (tx + 34) + '" cy="20" r="9" fill="var(--card2)" stroke="var(--line)"/>' + text(tx + 34, 20, "?", 12, 'font-weight="700"');
      }
      return out + CLOSE;
    }

    /* the arithmetic chain as pills: start → ×2 → +5 → ? (the steps, never the values) */
    if (k === "chain") {
      var pills = [String(scene.start)].concat(scene.ops.map(function (o) { return (o.k === "mul" ? "×" : o.k === "div" ? "÷" : o.k === "add" ? "+" : "−") + (o.v || 2); })).concat(["?"]);
      var perRow = 5, rowsC = Math.ceil(pills.length / perRow), pw = 50, gap = 12;
      out = open(320, rowsC * 50 + 6);
      for (i = 0; i < pills.length; i++) {
        var rr = Math.floor(i / perRow), cc = i % perRow, count = Math.min(perRow, pills.length - rr * perRow), px = (320 - (count * pw + (count - 1) * gap)) / 2 + cc * (pw + gap), py = 8 + rr * 50;
        var last = i === pills.length - 1;
        out += rect(px, py, pw, 36, last ? 'fill="none" stroke="var(--brand)" stroke-width="2"' : (i === 0 ? 'fill="var(--brand)"' : undefined));
        out += text(px + pw / 2, py + 18, pills[i], 16, 'font-weight="700"' + (i === 0 ? ' fill="#0b1020"' : last ? ' fill="var(--brand)"' : ""));
        if (cc < count - 1) out += '<path d="M' + (px + pw + 2) + ' ' + (py + 18) + ' h7 m-3 -3 l3 3 l-3 3" fill="none" stroke="var(--muted)" stroke-width="2"/>';
      }
      return out + CLOSE;
    }

    /* the week strip with today marked and the arrow leaving it — it never lands */
    if (k === "week") {
      var days = labels.days || ["M", "T", "W", "T", "F", "S", "S"], cwk = 38, gk = 6, xw = (320 - (7 * cwk + 6 * gk)) / 2;
      out = open(320, 110);
      for (i = 0; i < 7; i++) { var dx = xw + i * (cwk + gk); out += rect(dx, 56, cwk, cwk, i === scene.today ? 'fill="var(--brand)"' : undefined) + text(dx + cwk / 2, 75, days[i], 15, 'font-weight="700"' + (i === scene.today ? ' fill="#0b1020"' : "")); }
      var ax = xw + scene.today * (cwk + gk) + cwk / 2, dirx = scene.ahead ? 1 : -1, ex = Math.max(18, Math.min(302, ax + dirx * 120));
      out += '<path d="M' + ax + ' 52 C' + ax + ' 20 ' + ex + ' 20 ' + ex + ' 40" fill="none" stroke="var(--brand2, var(--brand))" stroke-width="3"/>' + '<path d="M' + (ex - 6) + ' 32 L' + ex + ' 42 L' + (ex + 6) + ' 32 Z" fill="var(--brand2, var(--brand))"/>';
      out += text((ax + ex) / 2, 14, (scene.ahead ? "+" : "−") + scene.n + " " + (labels.unit || ""), 14, 'font-weight="700"');
      return out + CLOSE;
    }

    /* two overlapping groups: the three numbers given, a "?" on the region asked */
    if (k === "venn") {
      out = open(320, 200) + rect(10, 10, 300, 180, 'fill="none" stroke="var(--line)"') + text(50, 26, "N = " + scene.N, 13, 'font-weight="700"');
      out += '<circle cx="125" cy="105" r="60" fill="' + PAL[0] + '" fill-opacity=".25" stroke="' + PAL[0] + '" stroke-width="2.5"/><circle cx="195" cy="105" r="60" fill="' + PAL[2] + '" fill-opacity=".25" stroke="' + PAL[2] + '" stroke-width="2.5"/>';
      out += text(88, 75, scene.A, 16, 'font-weight="700"') + text(232, 75, scene.B, 16, 'font-weight="700"') + text(160, 105, scene.both, 16, 'font-weight="700"');
      out += text(105, 178, labels.a || "", 11) + text(215, 178, labels.b || "", 11);
      if (scene.askNeither) out += '<circle cx="280" cy="160" r="12" fill="var(--brand)"/>' + text(280, 160, "?", 14, 'fill="#0b1020" font-weight="700"');
      else out += '<circle cx="92" cy="118" r="12" fill="var(--brand)"/>' + text(92, 118, "?", 14, 'fill="#0b1020" font-weight="700"');
      return out + CLOSE;
    }

    /* the compass rose: where you start, and the turns as glyphs — never where you end */
    if (k === "compass") {
      var dirs = labels.dirs || ["N", "E", "S", "W"];
      out = open(320, 150) + '<circle cx="80" cy="75" r="52" fill="var(--card2)" stroke="var(--line)"/>';
      for (i = 0; i < 4; i++) { var dp = pt(80, 75, 40, i * 90); out += text(fmt(dp[0]), fmt(dp[1]), dirs[i], 15, 'font-weight="700"'); }
      var ap = pt(80, 75, 24, scene.start * 90);
      out += '<line x1="80" y1="75" x2="' + fmt(ap[0]) + '" y2="' + fmt(ap[1]) + '" stroke="var(--brand)" stroke-width="6" stroke-linecap="round"/>' + '<g transform="translate(' + fmt(ap[0]) + ' ' + fmt(ap[1]) + ') rotate(' + (scene.start * 90) + ')"><path d="M-8 4 L0 -8 L8 4 Z" fill="var(--brand)"/></g>';
      for (i = 0; i < scene.turns.length; i++) {
        var gx = 160 + i * 36, tk = scene.turns[i];
        out += '<g transform="translate(' + gx + ' 75)">' + (tk === 0 ? '<path d="M8 12 V-2 H-6 M-1 -8 L-7 -2 L-1 4" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
          : tk === 1 ? '<path d="M-8 12 V-2 H6 M1 -8 L7 -2 L1 4" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
          : '<path d="M-8 10 V-4 A8 8 0 0 1 8 -4 V6 M2 0 L8 6 L14 0" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>') + "</g>";
      }
      return out + CLOSE;
    }

    /* the 4 × 4 spot grid as one picture (the tap grid draws the same tiles as buttons) */
    if (k === "grid") {
      var cols = scene.cols, rowsG = scene.rows, cell = 64, gg = 8, W = cols * cell + (cols - 1) * gg, H = rowsG * cell + (rowsG - 1) * gg;
      out = open(W, H);
      for (i = 0; i < scene.tiles.length; i++) {
        var cxg = (i % cols) * (cell + gg), cyg = Math.floor(i / cols) * (cell + gg);
        out += '<g transform="translate(' + cxg + ' ' + cyg + ')">' + rect(0, 0, cell, cell) + '<g transform="translate(4 4)">' + tile(scene.tiles[i], { attrs: 'width="56" height="56"' }) + "</g></g>";
      }
      return out + CLOSE;
    }

    /* the twin puzzle's model pattern (and, with opts.grid, any option's pattern) */
    if (k === "twin") return tileGrid(scene.grid, opts);

    /* what changed: the nine objects before (study) or after (ask) */
    if (k === "change") {
      var set = opts.which === "before" ? scene.before : scene.after, cl = scene.cols, cs = 60, gc = 8;
      var WW = cl * cs + (cl - 1) * gc, HH = scene.rows * cs + (scene.rows - 1) * gc;
      out = open(WW, HH);
      for (i = 0; i < set.length; i++) {
        var ox = (i % cl) * (cs + gc), oy = Math.floor(i / cl) * (cs + gc);
        out += '<g transform="translate(' + ox + ' ' + oy + ')">' + rect(0, 0, cs, cs) + '<g transform="translate(2 2)">' + objectTile(set[i], { attrs: 'width="56" height="56"' }) + "</g></g>";
      }
      return out + CLOSE;
    }

    /* the three balls: drawn at their frame-0 places; app.js moves them frame by frame */
    if (k === "shells") {
      if (opts.motion === false) return shellsStrip(scene, labels);
      out = open(320, 120, 'class="gshells"');
      for (i = 0; i < 3; i++) {
        var bx = 60 + i * 100;
        out += '<g id="b' + i + '" style="transition: transform .45s ease"><circle id="c' + i + '" cx="' + bx + '" cy="56" r="22" fill="' + PAL[0] + '" style="transition: fill .45s ease"/><circle id="m' + i + '" cx="' + bx + '" cy="56" r="8" fill="none" stroke="var(--bg2)" stroke-width="3"/></g>';
        out += text(bx, 104, i + 1, 14, 'fill="var(--muted)" font-weight="700"');
      }
      out += '<circle id="ring" cx="' + (60 + scene.start * 100) + '" cy="56" r="29" fill="none" stroke="#ffffff" stroke-width="3"/>';
      return out + CLOSE;
    }

    /* a guide path with a travelling dot (or numbered arrowheads without motion) */
    if (k === "path") return open(320, 160) + guidePath(scene.shape, scene.dir, scene.lap, opts.motion !== false, 0, 0, 1, opts.speed) + CLOSE;
    if (k === "path2") return open(320, 160) + guidePath(scene.left, scene.dirL, scene.lapL, opts.motion !== false, 0, 40, 0.5, opts.speed) + '<line x1="160" y1="10" x2="160" y2="150" stroke="var(--line)"/>' + guidePath(scene.right, scene.dirR, scene.lapR, opts.motion !== false, 160, 40, 0.5, opts.speed) + CLOSE;

    /* a hand (or two), the lit finger set by the frame player */
    if (k === "hand") {
      /* two hands sit apart, so the resting thumbs do not meet in the middle (read as "press your thumbs together") */
      if (scene.side === "both") out = open(340, 150) + hand("L", 0, 8, "L", scene.lit === undefined ? -1 : scene.lit) + hand("R", 210, 8, "R", scene.lit === undefined ? -1 : scene.litRight === undefined ? -1 : scene.litRight);
      else out = open(320, 150) + hand("", 95, 8, scene.side, scene.lit === undefined ? -1 : scene.lit);
      return out + CLOSE;
    }

    /* A SWAP OF SHAPES (v103). Each side shows the shape that hand draws next, a two-way arrow
       between them. The hands themselves are announced in words and shown in a photograph
       (CEO, 23 Sep 2026: "not these schema, we don't know if the hand is palm face up or
       down"), so no hand is drawn here. */
    if (k === "switch") {
      var AW = 'stroke="var(--brand)" stroke-width="4" stroke-linecap="round"';
      return open(320, 160) + outline(scene.left, 0, 40, 0.5) + outline(scene.right, 160, 40, 0.5) +
        '<path d="M146 14 H166" ' + AW + '/><path d="M174 14 L164 7 L164 21 Z" fill="var(--brand)"/>' +
        '<path d="M174 32 H154" ' + AW + '/><path d="M146 32 L156 25 L156 39 Z" fill="var(--brand)"/>' + CLOSE;
    }

    /* six numbered dots to tap in order; a 3 × 3 grid of dots with one lit */
    if (k === "dots") {
      var DP = [[50, 40], [150, 24], [260, 50], [80, 120], [190, 100], [280, 130]];
      out = open(320, 160);
      for (i = 0; i < DP.length; i++) out += '<circle cx="' + DP[i][0] + '" cy="' + DP[i][1] + '" r="18" fill="var(--card2)" stroke="var(--brand)" stroke-width="2"/>' + text(DP[i][0], DP[i][1], i + 1, 15, 'font-weight="700"');
      return out + CLOSE;
    }
    if (k === "dotgrid") {
      out = open(320, 160);
      /* With motion off there is no lit dot to follow, so the dots carry numbers instead
         and the card becomes "take them in order" - the same act, standing still. */
      for (i = 0; i < 9; i++) {
        var dx = 100 + (i % 3) * 60, dy = 30 + Math.floor(i / 3) * 50;
        out += '<circle id="d' + i + '" cx="' + dx + '" cy="' + dy + '" r="16" fill="' + (scene.lit === i ? "var(--brand)" : "var(--card2)") + '" stroke="var(--line)"/>';
        if (opts && opts.motion === false) out += text(dx, dy, i + 1, 15, 'font-weight="700"');
      }
      return out + CLOSE;
    }

    /* a glyph for a neurobics card */
    if (k === "glyph") return open(56, 56) + '<g color="var(--ink)">' + (OBJECTS[scene.glyph] || GLYPHS[scene.glyph] || OBJECTS.ring) + "</g>" + CLOSE;

    return "";
  }

  /* the comic strip: one panel per frame of the shells puzzle, for a reader without motion */
  function shellsStrip(scene, labels) {
    var frames = scene.frames, n = frames.length, per = 3, rows = Math.ceil(n / per), out = open(320, rows * 60 + 4), i, j;
    for (i = 0; i < n; i++) {
      var f = frames[i], px = 4 + (i % per) * 106, py = 4 + Math.floor(i / per) * 60;
      out += rect(px, py, 100, 52, 'fill="var(--card2)" stroke="var(--line)"') + text(px + 10, py + 10, i + 1, 10, 'fill="var(--muted)"');
      for (j = 0; j < 3; j++) {
        var slot = f.slots[j];
        out += '<circle cx="' + (px + 22 + slot * 28) + '" cy="' + (py + 30) + '" r="9" fill="' + (f.recoloured ? PAL[1] : PAL[0]) + '"/>' + (f.recoloured ? '<circle cx="' + (px + 22 + slot * 28) + '" cy="' + (py + 30) + '" r="3" fill="var(--bg2)"/>' : '<circle cx="' + (px + 22 + slot * 28) + '" cy="' + (py + 30) + '" r="4" fill="none" stroke="var(--bg2)" stroke-width="2"/>');
      }
      if (i === 0) out += '<circle cx="' + (px + 22 + f.slots.indexOf(scene.start) * 28 + 0) + '" cy="' + (py + 30) + '" r="13" fill="none" stroke="#fff" stroke-width="2"/>';
      if (f.swap) { var s1 = px + 22 + f.swap[0] * 28, s2 = px + 22 + f.swap[1] * 28; out += '<path d="M' + s1 + ' ' + (py + 44) + ' Q' + ((s1 + s2) / 2) + ' ' + (py + 56) + ' ' + s2 + ' ' + (py + 44) + '" fill="none" stroke="var(--brand)" stroke-width="2"/>'; }
    }
    return out + CLOSE;
  }

  /* a 3 × 3 colour pattern from nine palette indices or nine colour letters */
  function tileGrid(grid, opts) {
    opts = opts || {};
    var cells = typeof grid === "string" ? grid.split("").map(function (ch) { return LETTER[ch]; }) : grid, i;
    var out = open(100, 100, opts.attrs);
    for (i = 0; i < 9; i++) {
      var x = (i % 3) * 33, y = Math.floor(i / 3) * 33, mark = opts.mark && opts.mark.indexOf(i) !== -1;
      out += '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="31" height="31" rx="5" fill="' + PAL[cells[i]] + '"' + (mark ? ' stroke="var(--bad)" stroke-width="3"' : "") + "/>";
      if (mark) out += '<path d="M' + (x + 8) + ' ' + (y + 8) + ' l17 17 m0 -17 l-17 17" stroke="var(--bad)" stroke-width="3"/>';
    }
    if (opts.turned) out += '<path d="M84 12 a8 8 0 1 1 -8 -8" fill="none" stroke="var(--ink)" stroke-width="2"/><path d="M76 0 l4 4 l-4 4" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    return out + CLOSE;
  }

  var GLYPHS = {
    hand: '<path d="M14 30 V14 a4 4 0 0 1 8 0 v10 V10 a4 4 0 0 1 8 0 v14 V12 a4 4 0 0 1 8 0 v14 V16 a4 4 0 0 1 8 0 v18 c0 10 -6 18 -16 18 h-4 c-8 0 -12 -6 -14 -12 l-6 -12 a5 5 0 0 1 8 -4 z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    phone: '<rect x="16" y="6" width="24" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="28" cy="43" r="2" fill="currentColor"/>',
    dots: '<circle cx="14" cy="14" r="5" fill="currentColor"/><circle cx="42" cy="14" r="5" fill="currentColor"/><circle cx="28" cy="28" r="5" fill="currentColor"/><circle cx="14" cy="42" r="5" fill="currentColor"/><circle cx="42" cy="42" r="5" fill="currentColor"/>',
    cross: '<path d="M10 14 L46 42 M46 14 L10 42" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    calendar: '<rect x="8" y="12" width="40" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 22 H48 M18 8 V16 M38 8 V16" stroke="currentColor" stroke-width="3"/>',
    foot: '<path d="M22 8 c-8 0 -10 10 -8 20 c1 6 -2 10 -2 16 c0 4 4 6 8 6 h4 c6 0 8 -6 8 -12 c0 -8 6 -12 6 -18 c0 -6 -4 -12 -10 -12 z" fill="none" stroke="currentColor" stroke-width="3"/>',
    eye: '<path d="M4 28 C14 12 42 12 52 28 C42 44 14 44 4 28 Z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="28" cy="28" r="7" fill="currentColor"/>',
    watch: '<circle cx="28" cy="28" r="14" fill="none" stroke="currentColor" stroke-width="3"/><path d="M28 20 V28 L33 32 M20 8 H36 M20 48 H36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
  };

  window.CURIO_GYM_ART = { draw: draw, tile: tile, objectTile: objectTile, tileGrid: tileGrid, PAL: PAL, LETTER: LETTER, version: VERSION };
})();
