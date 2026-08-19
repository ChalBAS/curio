// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// GO FURTHER — where a curious reader goes next.
//
// This is the moment the whole product exists for: someone has just been wrong
// about something, or just learned something they did not know, and wants more.
// Until now the app showed a score and stopped.
//
// CHARTER RULE (VAL-12, decision D-061, 2026-08-08) — read before editing:
//   Nobody can buy their way into this list. No fee places, orders or weights
//   any destination here, ever. Every link is chosen because it is the best
//   answer for the learner. If a commercial arrangement ever exists with a
//   destination, it changes NOTHING about whether or where it appears — it
//   only changes whether we are paid when someone goes. The day that stops
//   being true, the list is worthless and so is the company.
//
// The entity comes free: every question's `src` is a Wikipedia URL, and the
// slug in it names the thing the question is about. Mona_Lisa, Rosetta_Stone,
// Machu_Picchu. 221 distinct entities across 262 questions — so there is no
// short head to curate. The design follows from that: PLACES are curated by
// hand because a physical destination is the highest-value thing we can offer,
// and READING works for every entity without curation.

(function () {
  "use strict";

  // ---------- where you can actually see it ----------
  // Curated by hand, and deliberately short: an entry only exists where I am
  // confident the object or site is really there and the link is really right.
  // A wrong destination is worse than none — it is the first thing that would
  // make a reader stop trusting the app.
  //
  // `hold` = an object held somewhere · `site` = a place you travel to.
  var PLACES = {
    // — objects, in named institutions —
    "Mona_Lisa":                    { kind: "hold", where: "Musée du Louvre", city: "Paris", url: "https://www.louvre.fr/en/explore/the-palace/the-mona-lisa" },
    "Code_of_Hammurabi":            { kind: "hold", where: "Musée du Louvre", city: "Paris", url: "https://www.louvre.fr/en" },
    "Rosetta_Stone":                { kind: "hold", where: "The British Museum", city: "London", url: "https://www.britishmuseum.org/collection/object/Y_EA24" },
    "Cyrus_Cylinder":               { kind: "hold", where: "The British Museum", city: "London", url: "https://www.britishmuseum.org/collection/object/W_1880-0617-1941" },
    "Epic_of_Gilgamesh":            { kind: "hold", where: "The British Museum", city: "London", url: "https://www.britishmuseum.org/" },
    "Benin_Bronzes":                { kind: "hold", where: "Split between museums worldwide — and the subject of a live restitution debate", city: "Benin City · London · Berlin", url: "https://www.britishmuseum.org/about-us/british-museum-story/contested-objects-collection/benin-bronzes" },
    "Magna_Carta":                  { kind: "hold", where: "The British Library", city: "London", url: "https://www.bl.uk/magna-carta" },
    "The_Starry_Night":             { kind: "hold", where: "Museum of Modern Art", city: "New York", url: "https://www.moma.org/collection/works/79802" },
    "The_Scream":                   { kind: "hold", where: "The National Museum and the Munch Museum", city: "Oslo", url: "https://www.munchmuseet.no/en/" },
    "Self-portraits_by_Rembrandt":  { kind: "hold", where: "Rijksmuseum", city: "Amsterdam", url: "https://www.rijksmuseum.nl/en" },
    "The_Great_Wave_off_Kanagawa":  { kind: "hold", where: "The Sumida Hokusai Museum", city: "Tokyo", url: "https://hokusai-museum.jp/?lang=en" },
    "Sistine_Chapel_ceiling":       { kind: "hold", where: "Vatican Museums", city: "Vatican City", url: "https://www.museivaticani.va/content/museivaticani/en.html" },
    "Tutankhamun":                  { kind: "hold", where: "The Grand Egyptian Museum", city: "Giza", url: "https://visit-gem.com/" },
    "Terracotta_Army":              { kind: "site", where: "The Mausoleum of the First Qin Emperor", city: "Xi'an, China", url: "https://en.wikipedia.org/wiki/Terracotta_Army" },
    "Obelisk_of_Axum":              { kind: "site", where: "Returned to Ethiopia in 2005 after 68 years in Rome", city: "Axum, Ethiopia", url: "https://whc.unesco.org/en/list/15/" },
    "Dresden_Codex":                { kind: "hold", where: "Saxon State Library", city: "Dresden", url: "https://www.slub-dresden.de/en/" },
    "Solomon_R._Guggenheim_Museum": { kind: "hold", where: "The Guggenheim", city: "New York", url: "https://www.guggenheim.org/" },

    // — places you travel to —
    "Great_Pyramid_of_Giza":        { kind: "site", where: "The Giza pyramid complex", city: "Egypt", url: "https://whc.unesco.org/en/list/86/" },
    "Machu_Picchu":                 { kind: "site", where: "Machu Picchu", city: "Peru", url: "https://whc.unesco.org/en/list/274/" },
    "Angkor_Wat":                   { kind: "site", where: "Angkor", city: "Cambodia", url: "https://whc.unesco.org/en/list/668/" },
    "Petra":                        { kind: "site", where: "Petra", city: "Jordan", url: "https://whc.unesco.org/en/list/326/" },
    "Pompeii":                      { kind: "site", where: "Pompeii", city: "Italy", url: "https://whc.unesco.org/en/list/829/" },
    "Great_Wall_of_China":          { kind: "site", where: "The Great Wall", city: "China", url: "https://whc.unesco.org/en/list/438/" },
    "Great_Zimbabwe":               { kind: "site", where: "Great Zimbabwe National Monument", city: "Zimbabwe", url: "https://whc.unesco.org/en/list/364/" },
    "Great_Mosque_of_Djenné":       { kind: "site", where: "The Old Towns of Djenné", city: "Mali", url: "https://whc.unesco.org/en/list/116/" },
    "Rock-Hewn_Churches,_Lalibela": { kind: "site", where: "The rock-hewn churches", city: "Lalibela, Ethiopia", url: "https://whc.unesco.org/en/list/18/" },
    "Nubian_pyramids":              { kind: "site", where: "The pyramids of Meroë", city: "Sudan", url: "https://whc.unesco.org/en/list/1336/" },
    "Timbuktu":                     { kind: "site", where: "Timbuktu", city: "Mali", url: "https://whc.unesco.org/en/list/119/" },
    "Chinguetti":                   { kind: "site", where: "The ksour of Ouadane, Chinguetti, Tichitt and Oualata", city: "Mauritania", url: "https://whc.unesco.org/en/list/750/" },
    "Kairouan":                     { kind: "site", where: "Kairouan", city: "Tunisia", url: "https://whc.unesco.org/en/list/499/" },
    "Leptis_Magna":                 { kind: "site", where: "The archaeological site of Leptis Magna", city: "Libya", url: "https://whc.unesco.org/en/list/183/" },
    "Persepolis":                   { kind: "site", where: "Persepolis", city: "Iran", url: "https://whc.unesco.org/en/list/114/" },
    "Marrakesh":                    { kind: "site", where: "The medina of Marrakesh", city: "Morocco", url: "https://whc.unesco.org/en/list/331/" },
    "University_of_al-Qarawiyyin":  { kind: "site", where: "Al-Qarawiyyin — the oldest continually operating university in the world", city: "Fez, Morocco", url: "https://whc.unesco.org/en/list/170/" },
    "Cahokia":                      { kind: "site", where: "Cahokia Mounds", city: "Illinois, USA", url: "https://whc.unesco.org/en/list/198/" },
    "Pueblo_Bonito":                { kind: "site", where: "Chaco Culture National Historical Park", city: "New Mexico, USA", url: "https://whc.unesco.org/en/list/353/" },
    "L'Anse_aux_Meadows":           { kind: "site", where: "L'Anse aux Meadows — the Norse site in North America", city: "Newfoundland, Canada", url: "https://whc.unesco.org/en/list/4/" },
    "Moai":                         { kind: "site", where: "Rapa Nui National Park", city: "Easter Island, Chile", url: "https://whc.unesco.org/en/list/715/" },
    "Sydney_Opera_House":           { kind: "site", where: "Sydney Opera House", city: "Australia", url: "https://www.sydneyoperahouse.com/" },
    "Eiffel_Tower":                 { kind: "site", where: "The Eiffel Tower", city: "Paris", url: "https://www.toureiffel.paris/en" },
    "Vatican_City":                 { kind: "site", where: "Vatican City", city: "Rome", url: "https://www.museivaticani.va/content/museivaticani/en.html" },
    "Wreck_of_the_Titanic":         { kind: "hold", where: "Titanic Belfast", city: "Northern Ireland", url: "https://titanicbelfast.com/" },
    "Victoria_Falls":               { kind: "site", where: "Mosi-oa-Tunya / Victoria Falls", city: "Zambia · Zimbabwe", url: "https://whc.unesco.org/en/list/509/" },
    "Great_Barrier_Reef":           { kind: "site", where: "The Great Barrier Reef", city: "Australia", url: "https://whc.unesco.org/en/list/154/" },
    "Mount_Fuji":                   { kind: "site", where: "Fujisan", city: "Japan", url: "https://whc.unesco.org/en/list/1418/" },
    "Nairobi_National_Park":        { kind: "site", where: "Nairobi National Park", city: "Kenya", url: "https://www.kws.go.ke/parks/nairobi-national-park" },
    "Rideau_Canal":                 { kind: "site", where: "The Rideau Canal", city: "Ottawa, Canada", url: "https://whc.unesco.org/en/list/1221/" },
    "Panama_Canal":                 { kind: "site", where: "The Panama Canal", city: "Panama", url: "https://pancanal.com/en/" },
    "Inca_road_system":             { kind: "site", where: "Qhapaq Ñan, the Andean road system", city: "Six countries, 30,000 km", url: "https://whc.unesco.org/en/list/1459/" },
    "Silk_Road":                    { kind: "site", where: "The Silk Roads: Chang'an–Tianshan corridor", city: "China · Kazakhstan · Kyrgyzstan", url: "https://whc.unesco.org/en/list/1442/" },
    "Stockholm_archipelago":        { kind: "site", where: "The Stockholm archipelago", city: "Sweden", url: "https://www.visitstockholm.com/" },
    "Washington_Monument":          { kind: "site", where: "The Washington Monument", city: "Washington, D.C.", url: "https://www.nps.gov/wamo/index.htm" },

    // — v77 curiosity package destinations —
    "Complaint_tablet_to_Ea-nassir": { kind: "hold", where: "The British Museum", city: "London", url: "https://www.britishmuseum.org/collection/object/W_1953-0411-71" },
    "Hatshepsut":                   { kind: "hold", where: "The Metropolitan Museum of Art", city: "New York", url: "https://www.metmuseum.org/art/collection/search?q=Hatshepsut" },
    "Armour":                       { kind: "hold", where: "The Met — Arms and Armor", city: "New York", url: "https://www.metmuseum.org/departments/arms-and-armor" },
    "Nazca_lines":                  { kind: "site", where: "The Lines and Geoglyphs of Nasca and Palpa", city: "Peru", url: "https://whc.unesco.org/en/list/700/" },
    "Thermopolium":                 { kind: "site", where: "Pompeii Archaeological Park", city: "Pompeii, Italy", url: "https://pompeiisites.org/en/" }
  };

  // Reading works for every entity without curation. Bookshop.org is the
  // destination because it pays independent bookshops rather than a warehouse —
  // that is an editorial choice about who we send readers to, and it is the
  // kind of choice that must stay ours (VAL-12).
  //
  // CLOSED 2026-08-09 — Bookshop.org ships US and UK only, so every reader
  // outside those two countries was being sent to a checkout that would refuse
  // them. Now: US and UK readers get their own Bookshop; everyone else — and
  // anyone who has not said where they are — goes to WorldCat, which finds the
  // book in a library near them, works in every country, and costs nothing to
  // borrow. For a product whose first promise is that knowledge is free, the
  // library is not a fallback. It is arguably the better answer.
  function readUrl(title) {
    var C = window.CURIO_COUNTRY;
    var cc = C && C.get ? C.get() : null;
    if (cc === "US") return "https://bookshop.org/search?keywords=" + encodeURIComponent(title);
    if (cc === "GB") return "https://uk.bookshop.org/search?keywords=" + encodeURIComponent(title);
    return "https://search.worldcat.org/search?q=" + encodeURIComponent(title);
  }

  /* Watching.
   *
   * CEO, 2026-08-16: "We need to link the youtube sources to reliable ones, we
   * cannot [have] a user being redirected to antivaxx, masculinists' or other
   * content creators [who] sell dangerous contents that will be reputational
   * risk."
   *
   * He is right and the previous comment here was wrong. It argued that an open
   * search is "honest about what it is" — but the reader does not experience a
   * URL, they experience where they land, and where they land is a ranked list
   * nobody has vetted. On any topic that touches health, history or identity,
   * that list reliably contains material Qpio would never publish. An app whose
   * entire proposition is that every claim is sourced cannot end its sentence by
   * handing the reader to an algorithm.
   *
   * So the search is scoped to CHANNELS, not to the whole platform. Every
   * channel below is a public broadcaster, a museum, a university or a
   * long-established science publisher — organisations with an editorial
   * standard and something to lose. `/@handle/search?query=` searches inside one
   * channel, so nothing outside the list can surface.
   *
   * The trade is real and worth stating: one channel at a time means fewer
   * results, and sometimes none. Fewer good answers beats more unvetted ones,
   * and the reader can always search for themselves — we simply will not be the
   * one who sent them.
   */
  var WATCH_CHANNELS = {
    // handle, and the categories it is a credible source for. Order matters:
    // the first match wins, so the most topic-appropriate is listed first.
    en: [
      { at: "TED-Ed",            cats: ["Science", "History", "Arts", "Nature", "Tech"] },
      { at: "smithsonianchannel", cats: ["History", "Nature", "Arts"] },
      { at: "bbcearth",          cats: ["Nature"] },
      { at: "NationalGeographic", cats: ["Nature", "Geography"] },
      { at: "veritasium",        cats: ["Science", "Tech"] },
      { at: "TheRoyalInstitution", cats: ["Science"] },
      { at: "britishmuseum",     cats: ["History", "Arts"] }
    ],
    fr: [
      { at: "lesciencecvous",    cats: ["Science", "Tech", "Nature"] },
      { at: "arte",              cats: ["History", "Arts", "Nature", "Geography"] },
      { at: "cnrs",              cats: ["Science", "Nature"] }
    ]
  };

  function watchUrl(title, cat) {
    var lang = window.QLANG === "fr" ? "fr" : "en";
    var list = WATCH_CHANNELS[lang] || WATCH_CHANNELS.en;

    // MOST SPECIALIST WINS, not first-in-list. Picking by list order sent every
    // English subject to TED-Ed, because TED-Ed covers everything — so a reader
    // on a wildlife question got a lesson channel instead of BBC Earth. Ranking
    // by how FEW categories a channel claims makes the specialist win, and it
    // stays correct as channels are added without anyone re-sorting the list.
    var best = null, bestSpan = 99, i;
    for (i = 0; i < list.length; i++) {
      if (cat && list[i].cats.indexOf(cat) === -1) continue;
      if (list[i].cats.length < bestSpan) { best = list[i]; bestSpan = list[i].cats.length; }
    }
    // No vetted channel covers this subject. Send nobody anywhere rather than
    // falling back to an open search — the fallback IS the risk.
    if (!best) return null;
    return "https://www.youtube.com/@" + best.at + "/search?query=" + encodeURIComponent(title);
  }

  // The slug is the entity. "Rock-Hewn_Churches,_Lalibela" → "Rock-Hewn Churches, Lalibela".
  function entityOf(q) {
    if (!q || !q.src) return null;
    var m = /\/wiki\/([^"#?]+)/.exec(q.src);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  // The entity's name in the reader's language. Not a translation — a lookup
  // of the title the French Wikipedia community chose for the same article
  // ("Great_Wall_of_China" → "Grande Muraille"). Built by
  // tools/fetch_fr_titles.py and baked in, so nothing is fetched at runtime.
  // 336 of 347 entities have a French article; the rest keep the English name,
  // which is correct — not every subject has a French page.
  function frTitle(slug) {
    var m = window.CURIO_FR_ENTITIES;
    return (m && slug && m[slug]) || null;
  }
  // Wikipedia appends a disambiguator when two articles share a name —
  // "Victoria (reine)", "Mercury (planet)", "Abdelkader (émir)". It is
  // filing metadata, not part of the name: nobody says "tell me about
  // Victoria bracket queen", and it poisons a bookshop search. Strip it.
  function cleanName(s) {
    return s ? s.replace(/\s*\([^)]*\)\s*$/, "").trim() || s : "";
  }
  function titleOf(slug) {
    if (!slug) return "";
    if (window.QLANG === "fr") {
      var f = frTitle(slug);
      if (f) return cleanName(f);
    }
    return cleanName(slug.replace(/_/g, " "));
  }

  // A French reader should land on the French article. Same lookup, and it
  // closes the long-standing defect of the French bank citing English sources.
  function sourceUrl(q) {
    var slug = entityOf(q);
    if (window.QLANG === "fr" && slug) {
      var f = frTitle(slug);
      if (f) return "https://fr.wikipedia.org/wiki/" + encodeURIComponent(f.replace(/ /g, "_"));
    }
    return q.src;
  }

  // FOUR SLOTS, ALWAYS THE SAME FOUR, ALWAYS IN THIS ORDER.
  //
  // Until 2026-08-09 this returned only the destinations that existed, so the
  // buttons moved: a topic with a museum showed Visit·Read·Sources, one without
  // showed Read·Sources, and the same word sat in a different place on every
  // card. The CEO: "the buttons are in different order depending on the
  // question, this is confusing for the user."
  //
  // So the shape of the card is now fixed and the CONTENT varies. A slot with
  // nothing behind it is still drawn, greyed and unclickable — which turns the
  // absence into information: a reader learns at a glance that this topic has
  // nowhere to visit, and recognises instantly when one appears. Showing the
  // shape of what we do not have yet is only honest as long as it is visibly
  // off; it must never look tappable.
  //
  // Order is fixed by usefulness and can never be bought (VAL-12). `on:false`
  // means no destination exists — never that someone declined to pay.
  var SLOTS = [
    { kind: "read",   icon: "📚", label: "Read" },
    { kind: "visit",  icon: "🏛️", label: "Visit" },
    { kind: "watch",  icon: "🎬", label: "Watch" },
    { kind: "source", icon: "📖", label: "Sources" }
  ];

  function goFor(q) {
    var slug = entityOf(q);
    if (!slug) return [];
    var title = titleOf(slug);
    var p = PLACES[slug];
    var src = q && q.src ? sourceUrl(q) : null;

    var made = {
      read:   { title: title, sub: "", url: readUrl(title) },
      visit:  p ? { title: p.where, sub: p.city, url: p.url } : { title: "", sub: "", url: null },
      watch:  { title: title, sub: "", url: watchUrl(title) },
      source: { title: "", sub: "", url: src }
    };

    return SLOTS.map(function (s) {
      var d = made[s.kind];
      return {
        kind: s.kind, icon: s.icon, label: s.label,
        title: d.title, sub: d.sub, url: d.url, on: !!d.url
      };
    });
  }

  // The one destination a whole-card tap should open: the first slot that has
  // somewhere to go and is not just the citation.
  function primaryOf(dest) {
    var d = (dest || []).filter(function (x) { return x.on && x.kind !== "source"; })[0];
    return d || (dest || []).filter(function (x) { return x.on; })[0] || null;
  }

  // ---------- Keep exploring ----------
  // The bottom row of the CEO's design. Not a second copy of the shelf: the
  // shelf is "the things you just got curious about", this is "the same
  // curiosity, followed sideways". Bolivia the country rather than its navy;
  // the mathematicians behind prime numbers rather than the definition.
  //
  // Every lane is built from TODAY's topics — so it is never generic filler —
  // and a lane with nothing behind it does not render. Same rule as the ways:
  // never show functionality we do not have.
  // Six lanes, always all six. An earlier build hid a lane when today's five
  // questions happened not to feed it, and Museums & Exhibitions simply
  // vanished — but these are not filtered results, they are doors. A door that
  // disappears when the room behind it is quiet is worse than one that opens
  // onto a wider view (CEO, 2026-08-08).
  //
  // `art` is the slug whose Commons photograph backs the tile — chosen so the
  // row reads like a shelf of covers rather than a row of buttons.
  var LANES = [
    { id: "docs",   icon: "🎬", label: "Documentaries",         art: "Great_Barrier_Reef",
      url: function (n) { return watchUrl(n || "history"); } },
    { id: "books",  icon: "📚", label: "Books",                 art: "Timbuktu",
      url: function (n) { return readUrl(n || "history"); } },
    { id: "museum", icon: "🏛️", label: "Museums & Exhibitions", art: "Mona_Lisa", prefer: "hold",
      url: function (n, p) { return p ? p.url : "https://www.museivaticani.va/content/museivaticani/en.html"; } },
    { id: "places", icon: "📍", label: "Places",                art: "Machu_Picchu", prefer: "site",
      url: function (n, p) { return p ? p.url : "https://whc.unesco.org/en/list/"; } },
    { id: "people", icon: "👤", label: "People",                art: "Frida_Kahlo",
      url: function (n) { return "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent((n || "history") + " biography"); } },
    { id: "more",   icon: "✨", label: "Collections",           art: "The_Starry_Night",
      url: function (n) { return "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(n || "collections"); } }
  ];

  // All six lanes. Each points at today's topics where it can, and at the
  // wider collection where it cannot — so the row is personal when there is
  // something to be personal about, and never empty.
  function lanesFor(questions) {
    var names = [], placed = [];
    (questions || []).forEach(function (q) {
      var slug = entityOf(q);
      if (!slug) return;
      names.push(titleOf(slug));
      if (PLACES[slug]) placed.push({ name: titleOf(slug), place: PLACES[slug] });
    });

    return LANES.map(function (L) {
      var p = null;
      if (L.prefer) {
        p = (placed.filter(function (x) { return x.place.kind === L.prefer; })[0] || null);
        if (p) p = p.place;
      }
      var img = (window.CURIO_IMAGES || {})[L.art] || null;
      return {
        id: L.id, icon: L.icon, label: L.label,
        url: L.url(names[0] || "", p),
        img: img ? img.u : null,
        credit: img ? (img.by + " · " + img.lic) : null,
        creditUrl: img ? img.p : null
      };
    });
  }

  // One unexpected thing, chosen from the whole bank. A different appetite
  // from the shelf: the shelf is what you already got curious about, this is
  // what you did not know you wanted (CEO's own distinction).
  function surprise() {
    var all = Object.keys(PLACES);
    var slug = all[Math.floor(Math.random() * all.length)];
    return { name: titleOf(slug), url: PLACES[slug].url };
  }

  window.CURIO_GO = {
    places: PLACES, goFor: goFor, primaryOf: primaryOf, entityOf: entityOf,
    titleOf: titleOf, sourceUrl: sourceUrl, readUrl: readUrl, watchUrl: watchUrl,
    lanesFor: lanesFor, surprise: surprise
  };
})();
