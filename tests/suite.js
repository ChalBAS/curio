/* QPIO UAT SUITE — the acceptance criteria, executed.
 *
 * CEO, 2026-08-11: "let's script the browser tests, especially when we are going
 * to add more languages or more features. It will be critical to mutualize the
 * effort."
 *
 * That sentence is the design. Every journey below is written ONCE and run once
 * per language in LANGS. Adding Spanish later means adding one string — and the
 * whole suite re-runs in Spanish, forever, at no extra authoring cost. Journeys
 * therefore address the app STRUCTURALLY (tab index, element class, position)
 * and never by reading English words off the screen, because a test that reads
 * "Next" is a test that only works in one language.
 *
 * Zero dependencies, on purpose. The app is a zero-build static site and the
 * tests keep that property: this runs in the browser it is testing, so it can
 * be opened on a real phone against uat.qpio.app — the device that matters —
 * rather than only on a laptop with a toolchain.
 *
 * Storage is snapshotted before the run and restored after, so testing never
 * costs the tester their streak.
 */

(function (root) {
  "use strict";

  // Adding a language costs one line. That is the whole point.
  var LANGS = [
    { code: "en", name: "English" },
    { code: "fr", name: "Français" }
  ];

  // Adding a screen costs one line, and it matters as much as language.
  // Proven the hard way: the first version of this suite ran only at 390x780,
  // and PASSED a build with the layout fix deliberately removed — because the
  // card only overflows on a small screen. A layout test that runs at one size
  // is a layout test that misses layout bugs. The small Android is the one that
  // catches things; the tall phone is the one most readers hold.
  var SIZES = [
    { w: 390, h: 780, name: "tall phone" },
    { w: 360, h: 640, name: "small phone" }
  ];

  var TABS = { home: 0, train: 1, stats: 2, settings: 3 };

  /* ---------- tiny harness ---------- */
  function Suite() { this.results = []; this.frame = null; }

  Suite.prototype.log = function (lang, name, ok, detail, soft) {
    var label = this.size ? name + "  [" + this.size.name + "]" : name;
    this.results.push({ lang: lang, name: label, ok: ok, detail: detail || "", soft: !!soft });
    if (root.onResult) root.onResult(this.results[this.results.length - 1]);
  };

  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // Poll rather than sleep a fixed time: a slow phone must not fail a test that
  // a fast laptop passes.
  function until(fn, timeout, step) {
    timeout = timeout || 6000; step = step || 80;
    var t0 = Date.now();
    return new Promise(function (resolve, reject) {
      (function tick() {
        var v;
        try { v = fn(); } catch (e) { v = null; }
        if (v) return resolve(v);
        if (Date.now() - t0 > timeout) return reject(new Error("timed out waiting"));
        setTimeout(tick, step);
      })();
    });
  }

  Suite.prototype.boot = function (lang) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var f = self.frame;
      f.onload = function () {
        var w = f.contentWindow;
        // Console errors are an acceptance criterion, so capture them from the
        // moment the document exists rather than asking afterwards.
        w.__errs = [];
        w.addEventListener("error", function (e) { w.__errs.push(String(e.message)); });
        w.addEventListener("unhandledrejection", function (e) { w.__errs.push("promise: " + e.reason); });
        until(function () { return w.CURIO_QUESTIONS && w.document.querySelector(".tabbar"); }, 12000)
          .then(function () { resolve(w); }).catch(reject);
      };
      // A fresh profile per language, and a cache-buster so the run always
      // tests the deployed build rather than a cached one.
      try {
        localStorage.clear();
        localStorage.setItem("curio.lang", lang);
        localStorage.setItem("curio.onboarded", "1");
      } catch (e) {}
      f.src = "/?uat=" + Date.now();
    });
  };

  var $ = function (w, s) { return w.document.querySelector(s); };
  var $$ = function (w, s) { return [].slice.call(w.document.querySelectorAll(s)); };
  var tab = function (w, which) { var b = $$(w, ".tabbar button")[TABS[which]]; if (b) b.click(); return wait(280); };

  /* usable height = everything above the fixed tab bar. The acceptance
     criterion is not "the page doesn't scroll" — it is "the reader never has to
     scroll to act", which means the action must sit above the bar. */
  function usable(w) {
    var bar = $(w, ".tabbar");
    return bar ? bar.getBoundingClientRect().top : w.innerHeight;
  }

  /* ---------- journeys ---------- */
  var JOURNEYS = [

  { id: "boot", title: "App boots, bank loads, tab bar present",
    run: function (w, s, lang) {
      s.log(lang, "boot · question bank loaded", w.CURIO_QUESTIONS.length > 0, w.CURIO_QUESTIONS.length + " questions");
      s.log(lang, "boot · language resolved", w.QLANG === lang, "QLANG=" + w.QLANG + " expected " + lang);
      s.log(lang, "boot · four tabs", $$(w, ".tabbar button").length === 4, $$(w, ".tabbar button").length + " tabs");
      return Promise.resolve();
    } },

  { id: "daily", title: "A first-time visitor can finish the daily five", perSize: true,
    run: function (w, s, lang) {
      return tab(w, "home").then(function () {
        var start = $$(w, "button").filter(function (b) { return /#daily|challenge|défi/i.test(b.id + " " + b.innerText); })[0]
                 || $$(w, ".mode, .card button")[0];
        if (!start) { s.log(lang, "daily · start button found", false, "no start control on Home"); return; }
        start.click();
        var seen = [], shots = [];
        return until(function () { return $(w, ".qtext"); }).then(function () {
          return (function step(n) {
            if (n > 12) return Promise.resolve();
            var qt = $(w, ".qtext");
            if (!qt) return Promise.resolve();
            // Identity = text + picture, matching the app's own qid(). Sixty-eight
            // flag questions share one sentence, so keying on text alone counts
            // five distinct questions as four. The first run of this suite made
            // exactly that mistake and reported a failure that was its own.
            var im = $(w, ".qart img");
            var txt = qt.textContent.trim() + (im ? "|" + im.getAttribute("src") : "");
            if (seen.indexOf(txt) === -1) seen.push(txt);
            var opts = $$(w, ".opts button:not([disabled])");
            if (!opts.length) return Promise.resolve();
            opts[0].click();
            return wait(420).then(function () {
              var next = $(w, "#next");
              // measure the answered layout — acceptance criterion 2
              // ":not(.is-off)" matters: a greyed door is still a .gf-link, so
              // this check used to pass on a question whose every door was
              // dead. "A destination offered" has to mean one that opens.
              var live = $(w, ".gf-link:not(.is-off)");
              if (next) shots.push({ next: next.getBoundingClientRect().bottom, usable: usable(w),
                                     gf: live ? live.getBoundingClientRect().bottom : null });
              if (!next) return Promise.resolve();
              next.click();
              return wait(380).then(function () { return step(n + 1); });
            });
          })(0);
        }).then(function () {
          s.log(lang, "daily · five distinct questions served", seen.length === 5, seen.length + " served");
          var over = shots.filter(function (x) { return x.next > x.usable + 1; });
          s.log(lang, "daily · Next reachable without scrolling", over.length === 0,
                over.length ? over.length + " of " + shots.length + " questions hid Next behind the tab bar" : shots.length + " questions checked");
          var noDest = shots.filter(function (x) { return x.gf === null; });
          s.log(lang, "daily · a destination offered after each answer", noDest.length === 0,
                noDest.length ? noDest.length + " answers offered nowhere to go" : "all " + shots.length, true);
          var order = shots.filter(function (x) { return x.gf !== null && x.gf >= x.next; });
          s.log(lang, "daily · destination sits above Next", order.length === 0,
                order.length ? order.length + " had Next before the destination" : "order correct");
          s.log(lang, "daily · results screen reached", !!$(w, ".card.result") || !!$(w, ".shelf"), "");
        });
      });
    } },

  { id: "norepeat", title: "No question repeats across consecutive rounds",
    run: function (w, s, lang) {
      return tab(w, "train").then(function () {
        var tiles = $$(w, ".cats:not(.regioncats) .ptile");
        if (!tiles.length) { s.log(lang, "no-repeat · topic picker present", false, "no picker"); return; }
        tiles[0].click();                       // "All"
        return wait(250).then(function () {
          var seen = {}, dupes = [], rounds = 0;
          return (function round(r) {
            if (r >= 3) return Promise.resolve();
            var go = $(w, "#startQuick");
            if (!go) return Promise.resolve();
            go.click(); rounds++;
            return wait(420).then(function () {
              return (function step(n) {
                if (n > 14) return Promise.resolve();
                var qt = $(w, ".qtext");
                if (!qt) return Promise.resolve();
                var img = $(w, ".qart img");
                var key = qt.textContent.trim() + (img ? "|" + img.getAttribute("src") : "");
                if (seen[key]) dupes.push(key.slice(0, 50)); else seen[key] = 1;
                var opts = $$(w, ".opts button:not([disabled])");
                if (!opts.length) return Promise.resolve();
                opts[0].click();
                return wait(300).then(function () {
                  var next = $(w, "#next");
                  if (!next) return Promise.resolve();
                  next.click();
                  return wait(300).then(function () { return step(n + 1); });
                });
              })(0);
            }).then(function () {
              return tab(w, "train").then(function () {
                var t = $$(w, ".cats:not(.regioncats) .ptile"); if (t.length) t[0].click();
                return wait(250).then(function () { return round(r + 1); });
              });
            });
          })(0).then(function () {
            s.log(lang, "no-repeat · zero repeats across " + rounds + " rounds", dupes.length === 0,
                  dupes.length ? dupes.length + " repeated: " + dupes[0] : Object.keys(seen).length + " distinct questions");
          });
        });
      });
    } },

  { id: "pictures", title: "Every picture loads",
    run: function (w, s, lang) {
      var qs = w.CURIO_QUESTIONS.filter(function (q) { return q.img && q.img.u; }).slice(0, 12);
      if (!qs.length) { s.log(lang, "pictures · none in bank", true, "no picture questions"); return Promise.resolve(); }
      return Promise.all(qs.map(function (q) {
        return new Promise(function (res) {
          var i = new w.Image();
          i.onload = function () { res(true); }; i.onerror = function () { res(false); };
          i.src = q.img.u;
          setTimeout(function () { res(i.naturalWidth > 0); }, 7000);
        });
      })).then(function (r) {
        var bad = r.filter(function (x) { return !x; }).length;
        s.log(lang, "pictures · sample loads", bad === 0, bad ? bad + " of " + r.length + " failed" : r.length + " sampled");
        var noAlt = w.CURIO_QUESTIONS.filter(function (q) { return q.img && !(lang === "fr" ? (q.img.alt_fr || q.img.alt) : q.img.alt); }).length;
        s.log(lang, "pictures · alt text in this language", noAlt === 0,
              noAlt ? noAlt + " picture questions unanswerable on a screen reader" : "all described");
      });
    } },

  { id: "language", title: "Nothing English is left on a French screen",
    run: function (w, s, lang) {
      if (lang === "en") { s.log(lang, "language · n/a for English", true, ""); return Promise.resolve(); }
      var EN = /\b(the|and|with|from|that|which|were|been|their|world|between|through|because|still|never|every|when|where|only|more|than|other|after|before|would|could|these|there|your|about)\b/i;
      var found = [];
      var views = ["home", "train", "stats", "settings"];
      return views.reduce(function (p, v) {
        return p.then(function () {
          return tab(w, v).then(function () {
            $$(w, "#app *").forEach(function (n) {
              if (n.children.length) return;
              var t = (n.textContent || "").trim();
              if (t.length > 14 && EN.test(t)) found.push(v + ": " + t.slice(0, 60));
            });
          });
        });
      }, Promise.resolve()).then(function () {
        s.log(lang, "language · no English prose on any tab", found.length === 0,
              found.length ? found.length + " found — " + found[0] : "four tabs swept");
      });
    } },

  /* ------------------------------------------------------------- the doors
     CEO, 12 Sep 2026, rejecting v95: "There are still questions with the wrong
     links ... some of the questions dont have a visit website, showing grey but
     when clicking it still bring to a link. I need the automated tests to check
     the interfaces properly. the automated test should check for these bug as
     it is not the 1st time."

     He is right that it is not the first time, and the reason is that no test
     had ever touched a link. The suite measured where the destination SAT on
     the screen and never what it was or whether it opened. Worse, the "a
     destination offered after each answer" check used querySelector(".gf-link"),
     which matches a greyed one — so a question with all three doors dead
     passed it.

     Three things are asserted here, and each of them is a bug that shipped:
       1. a greyed control opens NOTHING when it is tapped. The stylesheet used
          to take it out of hit-testing, so the tap fell through to the card
          underneath and opened the card's best OTHER destination: tapping a
          greyed Visit sent the reader to a book.
       2. a live door is a real link to a real address — http(s), not "#".
       3. a live door goes where its own word promises. A door that says Read
          and opens YouTube is the "wrong link" complaint in one sentence.
     window.open is replaced for the duration so a wrongly-opened tab is
     counted instead of appearing. */
  { id: "doors", title: "A door that is greyed opens nothing; a door that opens goes where it says",
    run: function (w, s, lang) {
      var opened = [];
      var realOpen = w.open;
      w.open = function (u) { opened.push(String(u || "")); return null; };
      /* Where each kind of door is allowed to lead. The icon identifies the
         door, not its label, so this works in every language — and 📚 (Read, a
         book) and 📖 (Sources, the article) are different doors that look
         alike at a glance, which is exactly why they are listed apart. */
      /* Every place a BOOK is allowed to live. The list started as the four the
         app used in August and failed the day the pipeline's own books arrived:
         it finds an ISBN and offers, in order, somewhere to read it free, Open
         Library, Google Books, then Wikipedia's list of booksellers for that
         ISBN. Those last two are book pages and the list simply did not know
         them. Wikipedia appears here only as Special:BookSources — a Read door
         landing on an ordinary article is still wrong, and still caught. */
      var HOST = { read: /openlibrary\.org|archive\.org|gutenberg\.org|worldcat\.org|books\.google\.[a-z.]+|wikipedia\.org\/wiki\/Special:BookSources/i,
                   source: /wikipedia\.org/i,
                   watch: /youtube\.com|youtu\.be|vimeo\.com/i };
      var wrongKind = [], notALink = [], greyOpened = [], greyIsLink = [];

      var auditDoors = function (where) {
        $$(w, ".way, .gf-link").forEach(function (d) {
          var off = /is-off/.test(d.className);
          var href = d.getAttribute("href");
          if (off) {
            // A dead door must not be a link at all, and tapping it must not open a tab.
            if (href) greyIsLink.push(where + ": " + (d.textContent || "").trim().slice(0, 30));
            var before = opened.length;
            d.click();
            if (opened.length > before) greyOpened.push(where + ": " + (d.textContent || "").trim().slice(0, 40) + " → " + opened[opened.length - 1].slice(0, 60));
            return;
          }
          if (!href || !/^https?:\/\//i.test(href)) { notALink.push(where + ": " + (href || "(none)")); return; }
          // The door's own word decides where it is allowed to lead. Read by
          // its icon rather than its label, so this works in every language.
          var word = d.textContent || "";
          var kind = word.indexOf("📚") !== -1 ? "read"
                   : word.indexOf("📖") !== -1 ? "source"
                   : /▶|🎬|📺/.test(word) ? "watch" : null;
          if (kind && HOST[kind] && !HOST[kind].test(href)) wrongKind.push(where + ": a " + kind + " door → " + href.slice(0, 70));
        });
      };

      return tab(w, "home").then(function () {
        var start = $$(w, "button").filter(function (b) { return /#daily|challenge|défi/i.test(b.id + " " + b.innerText); })[0];
        if (!start) { s.log(lang, "doors · could not start a round", false, "no start control on Home"); return; }
        start.click();
        return until(function () { return $(w, ".qtext"); }).then(function () {
          return (function step(n) {
            if (n > 6) return Promise.resolve();
            if (!$(w, ".qtext")) return Promise.resolve();
            var opts = $$(w, ".opts button:not([disabled])");
            if (!opts.length) return Promise.resolve();
            opts[0].click();
            return wait(420).then(function () {
              auditDoors("answer " + (n + 1));
              var next = $(w, "#next");
              if (!next) return Promise.resolve();
              next.click();
              return wait(380).then(function () { return step(n + 1); });
            });
          })(0);
        }).then(function () {
          // The results shelf is where the fall-through bug lived: the card
          // itself is tappable, so a dead slot on it has something to fall into.
          return until(function () { return $(w, ".card.result") || $(w, ".shelf") || $(w, ".topic"); }, 4000)
            .catch(function () { return null; })
            .then(function () { auditDoors("results shelf"); });
        }).then(function () {
          s.log(lang, "doors · a greyed door opens nothing", greyOpened.length === 0,
                greyOpened.length ? greyOpened.length + " opened a tab — " + greyOpened[0] : "every greyed door stayed shut");
          s.log(lang, "doors · a greyed door is not a link", greyIsLink.length === 0,
                greyIsLink.length ? greyIsLink.length + " greyed doors carry an address" : "none carries an address");
          s.log(lang, "doors · every live door is a real address", notALink.length === 0,
                notALink.length ? notALink.length + " are not — " + notALink[0] : "all http(s)");
          s.log(lang, "doors · a door leads where its word promises", wrongKind.length === 0,
                wrongKind.length ? wrongKind.length + " do not — " + wrongKind[0] : "read and watch doors checked");
        }).then(function () { w.open = realOpen; }, function (e) { w.open = realOpen; throw e; });
      });
    } },

  /* Brain Gym and Fact or Fake were built, wired into the app and shipped
     without a single acceptance check between them. A section nobody tests is a
     section that breaks quietly, and he found the Brain Gym one by hand. */
  { id: "braingym", title: "Brain Gym gives a playable set of five",
    run: function (w, s, lang) {
      return tab(w, "train").then(function () {
        var go = $(w, "#gymToday");
        if (!go) { s.log(lang, "brain gym · the section is on the Train tab", false, "no Brain Gym card"); return; }
        s.log(lang, "brain gym · exercises loaded", !!(w.CURIO_GYM && w.CURIO_GYM.families && w.CURIO_GYM.families.length),
              w.CURIO_GYM ? w.CURIO_GYM.families.length + " kinds of exercise" : "none");
        go.click();
        return until(function () { return $(w, "#gymOpts") || $(w, "#gymReady"); }, 6000).then(function () {
          var ready = $(w, "#gymReady"); if (ready) ready.click();
          return wait(300);
        }).then(function () {
          var opts = $$(w, "#gymOpts button");
          s.log(lang, "brain gym · a puzzle offers four answers", opts.length === 4, opts.length + " offered");
          if (!opts.length) return;
          opts[0].click();
          return wait(400).then(function () {
            s.log(lang, "brain gym · answering shows the reasoning", !!$(w, "#gymAfter"), "");
          });
        });
      });
    } },

  { id: "factorfake", title: "Fact or Fake runs a round and cites a source",
    run: function (w, s, lang) {
      // Fact or Fake lives on the Train tab beside Quick-Fire and Brain Gym —
      // Home carries the daily and the travel card only.
      return tab(w, "train").then(function () {
        var card = $(w, "#modeTruth");
        if (!card) { s.log(lang, "fact or fake · the mode is offered", false, "no Fact or Fake card on the Train tab"); return; }
        s.log(lang, "fact or fake · statements loaded in this language",
              !!(w.CURIO_STATEMENTS && w.CURIO_STATEMENTS.length),
              (w.CURIO_STATEMENTS || []).length + " statements");
        card.click();
        return wait(500).then(function () {
          // Two buttons, "Fact" and "Fake" — not the four-option .opts row the
          // quiz uses. Addressed by class rather than by their words, so this
          // keeps working in every language.
          var choices = $$(w, ".truthbtns button:not([disabled])");
          s.log(lang, "fact or fake · a statement offers a verdict to give", choices.length === 2, choices.length + " choices");
          if (!choices.length) return;
          choices[0].click();
          return wait(420).then(function () {
            var src = $$(w, "a[href^='http']").filter(function (a) { return /wikipedia|source/i.test(a.href + " " + a.textContent); });
            s.log(lang, "fact or fake · the verdict carries a source", src.length > 0, src.length + " source links", true);
          });
        });
      });
    } },

  { id: "console", title: "Nothing red in the console",
    run: function (w, s, lang) {
      s.log(lang, "console · no uncaught errors", (w.__errs || []).length === 0, (w.__errs || []).slice(0, 2).join(" | "));
      return Promise.resolve();
    } }
  ];

  /* ---------- runner ---------- */
  Suite.prototype.run = function (frame) {
    var self = this;
    self.frame = frame;
    var snapshot = {};
    try { Object.keys(localStorage).forEach(function (k) { snapshot[k] = localStorage.getItem(k); }); } catch (e) {}

    return LANGS.reduce(function (p, lang) {
      return p.then(function () {
        return JOURNEYS.reduce(function (q, j) {
          // A layout-sensitive journey runs once per screen; everything else
          // runs once. Re-booting per size is deliberate — a resized iframe
          // does not re-run the media queries the app read at first paint.
          var sizes = j.perSize ? SIZES : [null];
          return q.then(function () {
            return sizes.reduce(function (p2, size) {
              return p2.then(function () {
                self.size = size;
                if (size) { self.frame.style.width = size.w + "px"; self.frame.style.height = size.h + "px"; }
                return self.boot(lang.code).then(function (w) {
                  return Promise.resolve()
                    .then(function () { return j.run(w, self, lang.code); })
                    .catch(function (e) { self.log(lang.code, j.id + " · journey crashed", false, String(e.message || e)); });
                }).catch(function (e) {
                  self.log(lang.code, "boot · failed", false, String(e.message || e));
                });
              });
            }, Promise.resolve());
          });
        }, Promise.resolve()).then(function () { self.size = null; });
      });
    }, Promise.resolve()).then(function () {
      // Never cost the tester their streak.
      try {
        localStorage.clear();
        Object.keys(snapshot).forEach(function (k) { localStorage.setItem(k, snapshot[k]); });
      } catch (e) {}
      return self.results;
    });
  };

  root.QpioUAT = { Suite: Suite, LANGS: LANGS, SIZES: SIZES, JOURNEYS: JOURNEYS };
})(window);
