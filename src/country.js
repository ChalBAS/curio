// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// WHERE THE READER IS — and, more to the point, who they represent.
//
// Three things need this, in order of when they arrive:
//   1. NOW — "Read" must send a reader to a shop or library that can actually
//      serve them. Bookshop.org ships US and UK only, so every other reader was
//      being sent to a checkout that would refuse them (known defect, logged in
//      golinks.js on 2026-08-08).
//   2. SOON — "Visit" should prefer the nearest exhibition, not the most famous.
//   3. LATER — country leaderboards and contests. The CEO's frame: the CrossFit
//      Games, where you compete for a country you choose to represent.
//
// PRIVACY, which is why this is a picker and not a lookup:
//   No IP geolocation. No Geolocation API. No permission prompt. The reader
//   chooses, the choice is stored in localStorage on their own device, and it
//   is never transmitted anywhere — there is no server to transmit it to. It is
//   also optional: "Prefer not to say" is a first-class answer and everything
//   still works. This is representation, not surveillance.
//
// Names come from Intl.DisplayNames in the reader's own language where the
// browser supports it (Chrome 81+, Safari 14+, Firefox 86+), and fall back to
// the baked English list below. Flags are derived from the code itself — two
// regional-indicator code points — so there are no flag images to ship, to
// license, or to get wrong.

(function () {
  "use strict";

  var KEY = "curio.country";

  // ISO 3166-1 alpha-2. UN members plus the observer states and the inhabited
  // territories a reader might reasonably call home. Alphabetical by English
  // name so the fallback list is already sorted.
  var NAMES = {
    AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AD: "Andorra", AO: "Angola",
    AG: "Antigua and Barbuda", AR: "Argentina", AM: "Armenia", AW: "Aruba",
    AU: "Australia", AT: "Austria", AZ: "Azerbaijan", BS: "Bahamas", BH: "Bahrain",
    BD: "Bangladesh", BB: "Barbados", BY: "Belarus", BE: "Belgium", BZ: "Belize",
    BJ: "Benin", BM: "Bermuda", BT: "Bhutan", BO: "Bolivia",
    BA: "Bosnia and Herzegovina", BW: "Botswana", BR: "Brazil", BN: "Brunei",
    BG: "Bulgaria", BF: "Burkina Faso", BI: "Burundi", KH: "Cambodia",
    CM: "Cameroon", CA: "Canada", CV: "Cape Verde", CF: "Central African Republic",
    TD: "Chad", CL: "Chile", CN: "China", CO: "Colombia", KM: "Comoros",
    CG: "Congo - Brazzaville", CD: "Congo - Kinshasa", CR: "Costa Rica",
    CI: "Côte d’Ivoire", HR: "Croatia", CU: "Cuba", CW: "Curaçao", CY: "Cyprus",
    CZ: "Czechia", DK: "Denmark", DJ: "Djibouti", DM: "Dominica",
    DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt", SV: "El Salvador",
    GQ: "Equatorial Guinea", ER: "Eritrea", EE: "Estonia", SZ: "Eswatini",
    ET: "Ethiopia", FO: "Faroe Islands", FJ: "Fiji", FI: "Finland", FR: "France",
    GF: "French Guiana", PF: "French Polynesia", GA: "Gabon", GM: "Gambia",
    GE: "Georgia", DE: "Germany", GH: "Ghana", GI: "Gibraltar", GR: "Greece",
    GL: "Greenland", GD: "Grenada", GP: "Guadeloupe", GU: "Guam", GT: "Guatemala",
    GG: "Guernsey", GN: "Guinea", GW: "Guinea-Bissau", GY: "Guyana", HT: "Haiti",
    HN: "Honduras", HK: "Hong Kong SAR China", HU: "Hungary", IS: "Iceland",
    IN: "India", ID: "Indonesia", IR: "Iran", IQ: "Iraq", IE: "Ireland",
    IM: "Isle of Man", IL: "Israel", IT: "Italy", JM: "Jamaica", JP: "Japan",
    JE: "Jersey", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya", KI: "Kiribati",
    XK: "Kosovo", KW: "Kuwait", KG: "Kyrgyzstan", LA: "Laos", LV: "Latvia",
    LB: "Lebanon", LS: "Lesotho", LR: "Liberia", LY: "Libya", LI: "Liechtenstein",
    LT: "Lithuania", LU: "Luxembourg", MO: "Macao SAR China", MG: "Madagascar",
    MW: "Malawi", MY: "Malaysia", MV: "Maldives", ML: "Mali", MT: "Malta",
    MH: "Marshall Islands", MQ: "Martinique", MR: "Mauritania", MU: "Mauritius",
    YT: "Mayotte", MX: "Mexico", FM: "Micronesia", MD: "Moldova", MC: "Monaco",
    MN: "Mongolia", ME: "Montenegro", MA: "Morocco", MZ: "Mozambique",
    MM: "Myanmar (Burma)", NA: "Namibia", NR: "Nauru", NP: "Nepal",
    NL: "Netherlands", NC: "New Caledonia", NZ: "New Zealand", NI: "Nicaragua",
    NE: "Niger", NG: "Nigeria", KP: "North Korea", MK: "North Macedonia",
    NO: "Norway", OM: "Oman", PK: "Pakistan", PW: "Palau",
    PS: "Palestinian Territories", PA: "Panama", PG: "Papua New Guinea",
    PY: "Paraguay", PE: "Peru", PH: "Philippines", PL: "Poland", PT: "Portugal",
    PR: "Puerto Rico", QA: "Qatar", RE: "Réunion", RO: "Romania", RU: "Russia",
    RW: "Rwanda", WS: "Samoa", SM: "San Marino", ST: "São Tomé and Príncipe",
    SA: "Saudi Arabia", SN: "Senegal", RS: "Serbia", SC: "Seychelles",
    SL: "Sierra Leone", SG: "Singapore", SX: "Sint Maarten", SK: "Slovakia",
    SI: "Slovenia", SB: "Solomon Islands", SO: "Somalia", ZA: "South Africa",
    KR: "South Korea", SS: "South Sudan", ES: "Spain", LK: "Sri Lanka",
    KN: "St. Kitts and Nevis", LC: "St. Lucia", VC: "St. Vincent and Grenadines",
    SD: "Sudan", SR: "Suriname", SE: "Sweden", CH: "Switzerland", SY: "Syria",
    TW: "Taiwan", TJ: "Tajikistan", TZ: "Tanzania", TH: "Thailand",
    TL: "Timor-Leste", TG: "Togo", TO: "Tonga", TT: "Trinidad and Tobago",
    TN: "Tunisia", TR: "Türkiye", TM: "Turkmenistan", TV: "Tuvalu", UG: "Uganda",
    UA: "Ukraine", AE: "United Arab Emirates", GB: "United Kingdom",
    US: "United States", UY: "Uruguay", UZ: "Uzbekistan", VU: "Vanuatu",
    VA: "Vatican City", VE: "Venezuela", VN: "Vietnam", VI: "U.S. Virgin Islands",
    YE: "Yemen", ZM: "Zambia", ZW: "Zimbabwe"
  };

  // A flag from two letters: 'FR' → 🇫🇷, built from two regional-indicator code
  // points. No flag images to ship, license, or get politically wrong.
  //
  // EXCEPT ON WINDOWS, which has no flag emoji at all — Segoe UI Emoji leaves
  // them out on purpose. There the pair falls back to two letterlike glyphs and
  // the picker reads "us United States", which looks like a bug. Caught on the
  // CEO's own desktop, 2026-08-09.
  //
  // So we ask the renderer rather than the user agent string: draw a flag on a
  // canvas in solid black and look for a coloured pixel. A real flag glyph is
  // multicoloured; the letter fallback is not. One test, cached, no font list
  // to maintain and no browser to sniff.
  var _flags = null;
  function flagsRender() {
    if (_flags !== null) return _flags;
    _flags = false;
    try {
      var c = document.createElement("canvas");
      c.width = 16; c.height = 16;
      var x = c.getContext("2d");
      if (x) {
        x.fillStyle = "#000"; x.textBaseline = "top"; x.font = "16px sans-serif";
        x.fillText("🇫🇷", 0, 0);   // 🇫🇷
        var d = x.getImageData(0, 0, 16, 16).data;
        for (var i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 0 && (d[i] !== d[i + 1] || d[i + 1] !== d[i + 2])) { _flags = true; break; }
        }
      }
    } catch (e) { _flags = false; }
    return _flags;
  }

  function flagOf(cc) {
    if (!cc || cc.length !== 2 || !flagsRender()) return "";
    return cc.toUpperCase().replace(/./g, function (c) {
      return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65);
    });
  }

  // What to actually print: the flag where it renders, the name always.
  function labelOf(cc) {
    var f = flagOf(cc);
    return (f ? f + "  " : "") + nameOf(cc);
  }

  var _dn = null, _dnLang = null;
  function displayNames() {
    var lang = window.QLANG || "en";
    if (_dn && _dnLang === lang) return _dn;
    _dnLang = lang;
    try {
      _dn = (typeof Intl !== "undefined" && Intl.DisplayNames)
        ? new Intl.DisplayNames([lang], { type: "region" }) : null;
    } catch (e) { _dn = null; }
    return _dn;
  }

  function nameOf(cc) {
    if (!cc) return "";
    var dn = displayNames();
    if (dn) { try { var n = dn.of(cc); if (n && n !== cc) return n; } catch (e) {} }
    return NAMES[cc] || cc;
  }

  // Sorted in the reader's own language, with the reader's own collation —
  // "Égypte" belongs next to "Équateur" for a French reader, not at the end.
  function list() {
    var out = Object.keys(NAMES).map(function (cc) {
      return { code: cc, name: nameOf(cc), flag: flagOf(cc), label: labelOf(cc) };
    });
    var lang = window.QLANG || "en";
    try { out.sort(function (a, b) { return a.name.localeCompare(b.name, lang); }); }
    catch (e) { out.sort(function (a, b) { return a.name < b.name ? -1 : 1; }); }
    return out;
  }

  function get() {
    try {
      var v = localStorage.getItem(KEY);
      return (v && NAMES[v]) ? v : null;
    } catch (e) { return null; }
  }

  function set(cc) {
    try {
      if (cc && NAMES[cc]) localStorage.setItem(KEY, cc);
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }

  // A one-time guess to pre-select in the picker — never stored, never acted
  // on. Derived from the browser's own locale, which the reader already chose;
  // no network call and no permission prompt. They still have to confirm it.
  function guess() {
    var langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var m = /[-_]([A-Za-z]{2})$/.exec(langs[i] || "");
      if (m) { var cc = m[1].toUpperCase(); if (NAMES[cc]) return cc; }
    }
    return null;
  }

  window.CURIO_COUNTRY = {
    get: get, set: set, list: list, nameOf: nameOf, flagOf: flagOf,
    labelOf: labelOf, flagsRender: flagsRender,
    guess: guess, has: function (cc) { return !!NAMES[cc]; }
  };
})();
