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
    "Washington_Monument":          { kind: "site", where: "The Washington Monument", city: "Washington, D.C.", url: "https://www.nps.gov/wamo/index.htm" }
  };

  // Reading works for every entity without curation. Bookshop.org is the
  // destination because it pays independent bookshops rather than a warehouse —
  // that is an editorial choice about who we send readers to, and it is the
  // kind of choice that must stay ours (VAL-12).
  //
  // KNOWN GAP: Bookshop.org ships US and UK only, so a reader in Korea is sent
  // to a shop that cannot serve them. The fix is an international-shipping
  // default first, geo-aware later (CEO, 2026-08-08). Recorded here because it
  // is a real defect, not a placeholder.
  function readUrl(title) {
    return "https://bookshop.org/search?keywords=" + encodeURIComponent(title);
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

  // Returns the destinations for one question, best-for-the-learner first.
  // Order is fixed by usefulness and can never be bought (VAL-12).
  function goFor(q) {
    var out = [];
    var slug = entityOf(q);
    if (!slug) return out;
    var title = titleOf(slug);

    var p = PLACES[slug];
    if (p) {
      out.push({
        kind: p.kind === "hold" ? "see" : "visit",
        icon: p.kind === "hold" ? "🏛️" : "🗺️",
        title: p.where,
        sub: p.city,
        url: p.url
      });
    }
    out.push({ kind: "read", icon: "📚", title: title, sub: "", url: readUrl(title) });
    if (q.src) out.push({ kind: "source", icon: "📖", title: "", sub: "", url: sourceUrl(q) });
    return out;
  }

  window.CURIO_GO = {
    places: PLACES, goFor: goFor, entityOf: entityOf, titleOf: titleOf, sourceUrl: sourceUrl
  };
})();
