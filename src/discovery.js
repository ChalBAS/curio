// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// DISCOVERY — the curiosity engine's data layer.
//
// Before this file, "Keep exploring" was six buttons named after categories.
// A button named "People" is a question: "what's behind here?" A card showing
// Frida Kahlo's face is an answer. The CEO's rule — show what is on the shelf,
// do not ask what the shopper wants — needs discovery to be DATA, not UI.
//
// A DiscoveryItem is built by joining four things the app already knows:
//   entity slug (from a question's source)  → identity
//   CURIO_META    → what it is, and its type
//   CURIO_IMAGES  → a real photograph, credited
//   CURIO_GO      → where it leads, and its French name
//
// COMMERCIAL FIELDS ARE PRESENT AND EMPTY, DELIBERATELY. `partner`,
// `affiliate` and `commercial` exist so a future deal is a data change, not a
// redesign — and so that Charter VAL-12 stays checkable: nothing in the
// ordering functions below reads them. Money can describe an item. It can
// never move one.

(function () {
  "use strict";

  var META = function () { return window.CURIO_META || {}; };
  var IMGS = function () { return window.CURIO_IMAGES || {}; };
  var GO = function () { return window.CURIO_GO || {}; };

  // Wikipedia's type → the shelf a reader would look on. Six shelves, because
  // a reader browsing does not think in twelve.
  var SHELF_OF = {
    person: "meet", work: "read", visit: "visit", go: "go", event: "deeper", idea: "deeper"
  };
  var SHELVES = [
    { id: "meet",   icon: "👤", label: "Meet" },
    { id: "visit",  icon: "🏛️", label: "Visit" },
    { id: "go",     icon: "📍", label: "Go" },
    { id: "read",   icon: "📚", label: "Read" },
    { id: "watch",  icon: "🎬", label: "Watch" },
    { id: "deeper", icon: "✨", label: "Dive deeper" }
  ];

  // The written hook, in the reader's language. Written separately per
  // language, not translated — a French reader should feel the same pull,
  // which sometimes needs a different angle.
  function hookFor(slug) {
    var h = (window.CURIO_HOOKS || {})[slug];
    if (!h) return null;
    return (window.QLANG === "fr" && h.fr) ? h.fr : (h.en || null);
  }

  function slugsFromBank() {
    var seen = {}, out = [];
    (window.CURIO_QUESTIONS || []).forEach(function (q) {
      var s = GO().entityOf && GO().entityOf(q);
      if (s && !seen[s]) { seen[s] = q; out.push(s); }
    });
    return { order: out, byQ: seen };
  }

  // One item. `q` is the question it came from, when there is one — that is
  // what makes a hook possible: the depth fact is the most interesting
  // sentence we have about the thing.
  function itemFor(slug, q, reason) {
    var meta = META()[slug] || {};
    var img = IMGS()[slug] || null;
    var go = GO();
    var title = go.titleOf ? go.titleOf(slug) : slug.replace(/_/g, " ");
    var dest = q && go.goFor ? go.goFor(q) : [];
    var primary = dest.filter(function (d) { return d.kind !== "source"; })[0] || dest[0] || null;
    var type = meta.t || "idea";

    return {
      id: slug,
      title: title,
      // The hook — beat two of the loop (Charter VAL-13). A written hook
      // first, because it opens the gap; the depth fact only as a fallback,
      // because it closes it. "Why does a landlocked country have a navy?"
      // pulls; "the Bolivian Navy patrols Lake Titicaca" informs.
      hook: hookFor(slug) || (q && q.fact) || meta.d || "",
      desc: meta.d || "",
      type: type,
      shelf: SHELF_OF[type] || "deeper",
      image: img ? img.u : null,
      credit: img ? img.by : null,
      creditLic: img ? img.lic : null,
      creditUrl: img ? img.p : null,
      url: primary ? primary.url : (q && q.src) || null,
      source: (go.sourceUrl && q) ? go.sourceUrl(q) : (q && q.src) || null,
      provider: primary ? (primary.kind === "read" ? "bookshop" : "institution") : "wikipedia",
      ways: dest,
      reason: reason || "",
      // Reserved, and read by nothing that orders or filters. See VAL-12.
      commercial: false, partner: null, affiliate: null,
      surpriseEligible: !!(img && (q && q.fact))
    };
  }

  // The whole catalogue, built once.
  var _all = null;
  function all() {
    if (_all) return _all;
    var found = slugsFromBank();
    _all = found.order.map(function (s) { return itemFor(s, found.byQ[s], ""); });
    return _all;
  }

  // Items for the questions just answered, missed first — the strongest
  // curiosity trigger the CEO named.
  function fromRound(questions, marks) {
    var out = [];
    (questions || []).forEach(function (q, i) {
      var slug = GO().entityOf && GO().entityOf(q);
      if (!slug) return;
      var it = itemFor(slug, q, (marks && marks[i] === false) ? "missed" : "correct");
      it.missed = !!(marks && marks[i] === false);
      out.push(it);
    });
    return out.filter(function (x) { return x.missed; })
              .concat(out.filter(function (x) { return !x.missed; }));
  }

  // Shelves of real things. Each shelf is filled from the catalogue, images
  // first — a shelf of unillustrated titles is a list, and a list is the thing
  // we are replacing. `exclude` keeps the round's own topics off the shelves so
  // the page never shows the same thing twice.
  function shelves(exclude, perShelf) {
    var skip = {};
    (exclude || []).forEach(function (x) { skip[x.id || x] = true; });
    perShelf = perShelf || 8;

    var pool = all().filter(function (x) { return !skip[x.id] && x.image; });
    // No item on two shelves. A first build let Read, Watch and Dive deeper
    // draw from the same pool and they came back with the same three things —
    // which turns six shelves back into one list wearing six hats.
    var used = {};
    function take(list, n) {
      var out = [];
      for (var i = 0; i < list.length && out.length < n; i++) {
        if (!used[list[i].id]) { used[list[i].id] = true; out.push(list[i]); }
      }
      return out;
    }

    // Typed shelves first — they have the strongest claim on their items.
    var out = [];
    ["meet", "visit", "go"].forEach(function (id) {
      var S = SHELVES.filter(function (x) { return x.id === id; })[0];
      var items = take(pool.filter(function (x) { return x.shelf === id; }), perShelf);
      if (items.length >= 3) out.push({ id: S.id, icon: S.icon, label: S.label, items: items });
    });
    // Then the appetites. Read and Watch are not types — anything can be read
    // about or watched — so they take from whatever is left, subject-varied,
    // and each carries the destination that matches the verb on the shelf.
    [["read", 0], ["watch", 1], ["deeper", 2]].forEach(function (pair) {
      var S = SHELVES.filter(function (x) { return x.id === pair[0]; })[0];
      var rest = pool.filter(function (x) { return !used[x.id] && x.hook; });
      var items = take(diversify(rest, perShelf, pair[1]), perShelf).map(function (x) {
        return shelfUrl(x, S.id);
      });
      if (items.length >= 3) out.push({ id: S.id, icon: S.icon, label: S.label, items: items });
    });
    return out.map(function (S) {
      S.items = S.items.map(function (x) { return shelfUrl(x, S.id); });
      return S;
    });
  }

  // The destination has to match the verb. "Watch" that opens a bookshop is
  // the kind of small lie that costs trust for nothing.
  function shelfUrl(item, shelf) {
    var copy = {}, k;
    for (k in item) if (item.hasOwnProperty(k)) copy[k] = item[k];
    var name = item.title;
    var places = GO().places || {};
    if (shelf === "watch") {
      copy.url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " documentary");
      copy.provider = "youtube";
    } else if (shelf === "read") {
      copy.url = "https://bookshop.org/search?keywords=" + encodeURIComponent(name);
      copy.provider = "bookshop";
    } else if (shelf === "meet" || shelf === "deeper") {
      // Meeting a person means reading about them, not buying a book about
      // them. "Meet Marie Curie" opening a bookshop was the sharpest example
      // of a destination not matching its verb.
      copy.url = item.source || item.url;
      copy.provider = "wikipedia";
    } else if (shelf === "visit" || shelf === "go") {
      var p = places[item.id];
      copy.url = p ? p.url : (item.source || item.url);
      copy.provider = p ? "institution" : "wikipedia";
    }
    return copy;
  }

  // Spread subjects out so a shelf does not open with four of the same thing.
  function diversify(list, n, offset) {
    var byType = {}, order = [];
    list.forEach(function (x) {
      if (!byType[x.type]) { byType[x.type] = []; order.push(x.type); }
      byType[x.type].push(x);
    });
    var out = [], i = offset || 0, guard = 0;
    while (out.length < n && guard++ < 500) {
      var t = order[i % order.length];
      if (byType[t] && byType[t].length) out.push(byType[t].shift());
      i++;
      if (!order.some(function (k) { return byType[k].length; })) break;
    }
    return out;
  }

  // ONE thing. Not a menu, not a category, not another screen — the CEO's
  // distinction: Surprise Me means "I do not want to choose". So it returns a
  // single item with a real hook, never something already on the page.
  function surpriseOne(exclude) {
    var skip = {};
    (exclude || []).forEach(function (x) { skip[x.id || x] = true; });
    var pool = all().filter(function (x) { return !skip[x.id] && x.surpriseEligible; });
    if (!pool.length) pool = all().filter(function (x) { return !skip[x.id] && x.hook; });
    if (!pool.length) return null;
    // Avoid repeating the last few, so tapping twice gives two discoveries.
    var recent = [];
    try { recent = JSON.parse(localStorage.getItem("curio.surpriseSeen") || "[]"); } catch (e) {}
    var fresh = pool.filter(function (x) { return recent.indexOf(x.id) === -1; });
    var from = fresh.length ? fresh : pool;
    var pick = from[Math.floor(Math.random() * from.length)];
    try {
      recent.unshift(pick.id);
      localStorage.setItem("curio.surpriseSeen", JSON.stringify(recent.slice(0, 12)));
    } catch (e) {}
    return pick;
  }

  window.CURIO_DISCOVERY = {
    all: all, itemFor: itemFor, fromRound: fromRound,
    shelves: shelves, surpriseOne: surpriseOne, SHELVES: SHELVES
  };
})();
