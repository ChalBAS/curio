// © 2026 Qpio. Brain Gym — the exercises.
//
// CEO, 2026-08-11, recorded in ROADMAP.md FEAT-030:
//   "Once we reach the 2,000 questions we'll start the gym brain section with
//    brain teasers, logic exercises, and neurologic exercises people can do to
//    keep their brain guessing."
//
// WHY THIS IS A DIFFERENT THING FROM THE QUIZ. Every question in Qpio tests
// what you know. These test how you think — and they are the one part of the
// product that needs no prior knowledge at all, in any language, at any age.
// They are also the answer to the ceiling problem: a reader who knows every
// flag has nothing left to beat, and a puzzle nobody has solved before cannot
// be exhausted by knowing things.
//
// THE CLAIM BOUNDARY, and it is not decoration. The founder ruled on
// 2026-08-11 that Qpio may say exactly three things about this section: it is
// FUN, it is CHALLENGING, and YOU WILL GET BETTER AT THESE with time — with
// "better" always carrying its object. Qpio does not claim these make anyone
// smarter, do anything for dementia, or transfer to any other task. That is
// the Lumosity precedent, and it is a promise the copy keeps rather than a
// disclaimer bolted on.
//
// SEEDED, NOT RANDOM. Every exercise is generated from a seed, so the same day
// gives every reader the same set, a puzzle can be linked to, and a wrong
// answer can be reproduced when somebody reports it. Math.random() would make
// all three impossible.
//
// EVERY ANSWER IS CHECKED BY MACHINE. curio-hq/tools/test_braingym.js solves
// each generated puzzle independently of the generator and fails the build on
// any disagreement. A puzzle bank nobody verified is a bank of plausible
// wrong answers.

(function () {
  "use strict";

  /* ------------------------------------------------------------ the dice
     mulberry32: small, fast, and identical in every browser. The point is not
     cryptographic quality, it is that seed 41 gives the same puzzle here, on
     his phone, and in the test that checks the answer. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, xs) { return xs[Math.floor(r() * xs.length)]; }
  function int(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function shuffle(r, xs) {
    var a = xs.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* Three wrong answers that are wrong for a REASON — near misses, not noise.
     An obviously silly option turns a puzzle into a reading test. */
  function optionsAround(r, answer, makeDistractor) {
    var set = [answer], guard = 0;
    while (set.length < 4 && guard++ < 60) {
      var d = makeDistractor(r, set.length);
      if (d !== null && d !== undefined && set.indexOf(d) === -1) set.push(d);
    }
    while (set.length < 4) set.push(answer + set.length * 7 + 1);
    return shuffle(r, set);
  }

  /* =========================================================== SEQUENCES
     Infer the rule, then continue it. The oldest exercise there is, and the
     one that survives translation untouched: a number means the same thing in
     every language, which is why this family leads. */
  var SEQ_RULES = [
    { id: "add", make: function (r) {
        var a = int(r, 2, 12), d = int(r, 3, 13), n = [];
        for (var i = 0; i < 5; i++) n.push(a + d * i);
        return { n: n, next: a + d * 5, why: "each step adds " + d };
      } },
    { id: "mul", make: function (r) {
        var a = int(r, 1, 5), k = int(r, 2, 4), n = [];
        for (var i = 0; i < 5; i++) n.push(a * Math.pow(k, i));
        return { n: n, next: a * Math.pow(k, 5), why: "each step multiplies by " + k };
      } },
    { id: "square", make: function (r) {
        var s = int(r, 1, 6), n = [];
        for (var i = 0; i < 5; i++) n.push((s + i) * (s + i));
        return { n: n, next: (s + 5) * (s + 5), why: "these are the square numbers from " + s + " upward" };
      } },
    { id: "fib", make: function (r) {
        var a = int(r, 1, 6), b = int(r, 2, 9), n = [a, b];
        for (var i = 2; i < 6; i++) n.push(n[i - 1] + n[i - 2]);
        var next = n[5]; n = n.slice(0, 5);
        return { n: n, next: next, why: "each number is the two before it added together" };
      } },
    { id: "alt", make: function (r) {
        var a = int(r, 4, 20), up = int(r, 5, 12), down = int(r, 2, 6), n = [a];
        for (var i = 1; i < 5; i++) n.push(i % 2 ? n[i - 1] + up : n[i - 1] - down);
        return { n: n, next: n[4] + up, why: "it adds " + up + ", then takes away " + down + ", over and over" };
      } },
    { id: "growadd", make: function (r) {
        var a = int(r, 1, 9), d = int(r, 1, 4), step = d, n = [a];
        for (var i = 1; i < 5; i++) { n.push(n[i - 1] + step); step += d; }
        return { n: n, next: n[4] + step, why: "the gap itself grows by " + d + " each time" };
      } }
  ];

  function makeSequence(seed) {
    var r = rng(seed), rule = pick(r, SEQ_RULES), s = rule.make(r);
    var opts = optionsAround(r, s.next, function (rr, i) {
      var jitter = [1, -1, 2, -2, 3][i % 5];
      var d = s.next + (s.n[4] - s.n[3]) * (i === 1 ? 0 : 0) + jitter * Math.max(1, Math.round(Math.abs(s.next) * 0.08) || 1);
      return d === s.next ? null : d;
    });
    return {
      family: "sequences",
      prompt: "What comes next?",
      show: s.n.join("  ·  ") + "  ·  ?",
      options: opts.map(String),
      answer: String(s.next),
      explain: "It is " + s.next + " — " + s.why + ".",
      trains: "spotting a rule from very little evidence"
    };
  }

  /* ============================================================== LOGIC
     Knights always tell the truth, knaves always lie. Two sentences and one
     of them settles it. No knowledge, no arithmetic, no language tricks —
     which is why it works identically in French. */
  function makeKnights(seed) {
    var r = rng(seed);
    var names = shuffle(r, ["Ana", "Bo", "Cai", "Dee", "Eli", "Fen", "Gus", "Hal"]).slice(0, 2);
    var A = names[0], B = names[1];
    var form = int(r, 0, 3);
    var said, answer, explain;

    if (form === 0) {
      /* A: "We are both knaves." A knight cannot say it (it would be false of
         a knight); a knave saying it would make it true, and a knave cannot
         say a true thing. So A is a knave and B is a knight. */
      said = A + ' says: "We are both liars."';
      answer = A + " lies, " + B + " tells the truth";
      explain = "A truth-teller could not say it — it would be false. A liar saying it would make it " +
                "true, and a liar cannot say something true. So " + A + " is the liar, which makes the " +
                "sentence false, which means " + B + " is not a liar.";
    } else if (form === 1) {
      /* A: "At least one of us is a knave." True if either is a knave. A knave
         saying it would make it true — impossible. So A is a knight, and the
         statement is true, so B is a knave. */
      said = A + ' says: "At least one of us is a liar."';
      answer = A + " tells the truth, " + B + " lies";
      explain = "If " + A + " were the liar the sentence would be true, and a liar cannot say a true " +
                "thing. So " + A + " tells the truth — and then the sentence is true, so the liar must be " + B + ".";
    } else if (form === 2) {
      /* A: "B is a knight." B: "A is a knave." If A truthful → B knight → B truthful
         → A knave. Contradiction. So A lies → B is a knave → B's claim "A is a knave"
         would be true, but B lies. Contradiction unless... A lies, so B is a knave;
         B says "A is a knave" which is TRUE, but B always lies. Contradiction both
         ways -> this pair is impossible. Use it as the "no consistent answer" case. */
      said = A + ' says: "' + B + ' tells the truth."  ' + B + ' says: "' + A + ' lies."';
      answer = "Neither can be true — the pair is impossible";
      explain = "Suppose " + A + " tells the truth: then " + B + " does too, so " + B + "'s claim that " +
                A + " lies is true — but " + A + " told the truth. Suppose instead " + A + " lies: then " +
                B + " lies, so " + B + "'s claim is false, meaning " + A + " tells the truth. Both roads " +
                "double back. No arrangement works.";
    } else {
      /* A: "I am a knave." Nobody can say this: a knight would be lying, a knave
         would be telling the truth. */
      said = A + ' says: "I am a liar."';
      answer = "Nobody could say it — it is impossible either way";
      explain = "A truth-teller saying it would be lying. A liar saying it would be telling the truth. " +
                "The sentence rules itself out whoever says it.";
    }

    var wrongs = shuffle(r, [
      A + " tells the truth, " + B + " lies",
      A + " lies, " + B + " tells the truth",
      "Both tell the truth",
      "Both lie",
      "Neither can be true — the pair is impossible",
      "Nobody could say it — it is impossible either way"
    ].filter(function (x) { return x !== answer; })).slice(0, 3);

    return {
      family: "logic",
      prompt: "On this island some people always tell the truth and some always lie. Who is who?",
      show: said,
      options: shuffle(r, wrongs.concat([answer])),
      answer: answer,
      explain: explain,
      trains: "following a chain of consequences without losing your place"
    };
  }

  /* ============================================================ SPATIAL
     A clock face, because it is the one spatial object everybody already
     carries and it needs no picture. Turning hands is rotation, and the
     wrap-around at twelve is what makes it work rather than arithmetic. */
  function makeClock(seed) {
    var r = rng(seed);
    var h = int(r, 1, 12), m = pick(r, [0, 15, 30, 45]);
    var turn = pick(r, [90, 180, 270]);
    var stepsOfFive = turn / 30;          /* the hour hand moves 30° an hour */
    var nh = ((h - 1 + stepsOfFive) % 12) + 1;
    var answer = nh + ":" + (m === 0 ? "00" : m);
    var opts = shuffle(r, [answer].concat(
      [1, 2, 3].map(function (k) {
        var x = ((h - 1 + stepsOfFive + k) % 12) + 1;
        return x + ":" + (m === 0 ? "00" : m);
      }).filter(function (x) { return x !== answer; }).slice(0, 3)));
    return {
      family: "spatial",
      prompt: "Turn the whole clock face clockwise by " + turn + " degrees. What does the hour hand now point at?",
      show: "The clock reads " + h + ":" + (m === 0 ? "00" : m),
      options: opts,
      answer: answer,
      explain: "The hour hand moves one hour for every 30 degrees, so " + turn + " degrees is " +
               stepsOfFive + " hours. From " + h + " that lands on " + nh + ".",
      trains: "turning something in your head without turning your head"
    };
  }

  /* ====================================================== WORKING MEMORY
     Hold a short list, then answer a question about it that you could not
     have prepared for. The load is deliberately light — this is not a test,
     it is the thing you can feel getting easier. */
  var MEM_WORDS = ["river", "copper", "lantern", "harbour", "cedar", "marble", "compass", "saffron",
                   "anchor", "willow", "amber", "quarry", "thistle", "beacon", "orchard", "flint"];
  function makeMemory(seed) {
    var r = rng(seed);
    var n = int(r, 5, 7);
    var list = shuffle(r, MEM_WORDS).slice(0, n);
    var kind = int(r, 0, 2);
    var answer, prompt;
    if (kind === 0) {
      var pos = int(r, 1, n);
      prompt = "Which word was number " + pos + "?";
      answer = list[pos - 1];
    } else if (kind === 1) {
      prompt = "Which word came immediately after " + list[n - 2] + "?";
      answer = list[n - 1];
    } else {
      var longest = list.slice().sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); })[0];
      prompt = "Which of these words was the longest?";
      answer = longest;
    }
    var wrongs = shuffle(r, list.filter(function (w) { return w !== answer; })).slice(0, 3);
    return {
      family: "memory",
      prompt: prompt,
      show: list.join("  ·  "),
      hide: true,                       /* the list is shown, then taken away */
      options: shuffle(r, wrongs.concat([answer])),
      answer: answer,
      explain: "The list was: " + list.join(", ") + ".",
      trains: "holding several things at once while doing something else"
    };
  }

  /* ========================================================== ATTENTION
     One of these is not like the others, and the difference is small on
     purpose. Speed matters less than not being fooled by the obvious. */
  function makeOddOne(seed) {
    var r = rng(seed);
    var kind = int(r, 0, 2);
    var items, answer, why;
    if (kind === 0) {
      var base = int(r, 3, 9);
      items = [base * 2, base * 3, base * 4, base * 5].map(String);
      var odd = base * 4 + 1;
      items[int(r, 0, 3)] = String(odd);
      answer = String(odd);
      why = "every other number divides by " + base + "; " + odd + " does not";
    } else if (kind === 1) {
      var pool = shuffle(r, ["level", "rotor", "civic", "kayak", "refer", "madam", "stats"]);
      var notPal = pick(r, ["ledge", "cider", "torch", "plumb"]);
      items = shuffle(r, pool.slice(0, 3).concat([notPal]));
      answer = notPal;
      why = "the others read the same backwards";
    } else {
      var evens = shuffle(r, [12, 24, 36, 48, 60, 72, 84]).slice(0, 3);
      var oddN = pick(r, [15, 21, 33, 45, 57]);
      items = shuffle(r, evens.concat([oddN])).map(String);
      answer = String(oddN);
      why = "the others are all even";
    }
    return {
      family: "attention",
      prompt: "Which one does not belong?",
      show: items.join("   "),
      options: shuffle(r, items),
      answer: answer,
      explain: answer + " — " + why + ".",
      trains: "noticing the small difference rather than the loud one"
    };
  }

  /* ========================================== ESTIMATION, hand-written
     Fermi problems. There is no looking this up: the whole exercise is
     building an answer out of things you already roughly know. The "answer"
     is a band, and the explanation is the reasoning, because the reasoning is
     the point and the number is not. */
  var FERMI = [
    { q: "Roughly how many times does a human heart beat in one lifetime?",
      band: "About 2 to 3 billion",
      opts: ["About 2 to 3 billion", "About 2 to 3 million", "About 200 million", "About 20 billion"],
      how: "Around 70 beats a minute is about 100,000 a day, about 37 million a year. Multiply by a " +
           "lifetime of roughly 75 years and you land near 2.7 billion." },
    { q: "Roughly how many words does a person speak in a day?",
      band: "About 15,000",
      opts: ["About 15,000", "About 1,500", "About 150,000", "About 500"],
      how: "Speaking runs at roughly 120 words a minute. Two hours of actual talking spread across a " +
           "day is 120 minutes, so about 14,000 — call it 15,000." },
    { q: "Roughly how many piano tuners work in a city of 5 million people?",
      band: "Around 100",
      opts: ["Around 100", "Around 10", "Around 1,000", "Around 10,000"],
      how: "Perhaps one household in fifty has a piano, so 5 million people is maybe 40,000 pianos. " +
           "Tuned once a year, and one tuner handles perhaps 400 a year, that is about 100 tuners." },
    { q: "Roughly how much does all the air inside an ordinary room weigh?",
      band: "About 60 kilograms",
      opts: ["About 60 kilograms", "About 600 grams", "About 6 kilograms", "About 600 kilograms"],
      how: "A room 5m by 4m by 2.5m is 50 cubic metres. Air weighs about 1.2 kg per cubic metre. " +
           "That is 60 kg — roughly a person." },
    { q: "Roughly how many hairs are on an average human head?",
      band: "About 100,000",
      opts: ["About 100,000", "About 10,000", "About 1 million", "About 5,000"],
      how: "Hair grows at roughly 200 per square centimetre, and a scalp is around 500 square " +
           "centimetres. That is about 100,000." },
    { q: "Roughly how far does a car tyre travel before it wears out?",
      band: "About 50,000 kilometres",
      opts: ["About 50,000 kilometres", "About 5,000 kilometres", "About 500,000 kilometres", "About 2,000 kilometres"],
      how: "Tyres are usually replaced somewhere between 40,000 and 60,000 km — about the distance " +
           "round the Earth once." },
    { q: "Roughly how many breaths does a person take in a year?",
      band: "About 8 million",
      opts: ["About 8 million", "About 800,000", "About 80 million", "About 80,000"],
      how: "About 15 breaths a minute is 900 an hour, roughly 21,600 a day. Times 365 gives just " +
           "under 8 million." },
    { q: "Roughly how many grains of rice are in one kilogram?",
      band: "About 50,000",
      opts: ["About 50,000", "About 5,000", "About 500,000", "About 1,000"],
      how: "A grain of rice weighs around 20 milligrams. A kilogram is a million milligrams, so " +
           "about 50,000 grains." }
  ];

  /* ===================================== LATERAL THINKING, hand-written
     The answer is obvious only afterwards, and that lurch is the whole
     experience. Generated puzzles cannot do this — the surprise has to be
     designed — so this family is finite and written by hand, exactly as the
     roadmap says. */
  var LATERAL = [
    { q: "A man lives on the tenth floor. Every morning he takes the lift down. Coming home he takes it to the seventh floor and walks the rest — except on rainy days, when he rides all the way. Why?",
      a: "He is short and can only reach the button for the seventh floor",
      opts: ["He is short and can only reach the button for the seventh floor",
             "He wants the exercise",
             "The lift is broken above the seventh floor",
             "He visits a neighbour on the seventh floor"],
      why: "On rainy days he has an umbrella, and he uses it to press the higher button. Everything " +
           "in the puzzle points at the lift; the answer is about his arm." },
    { q: "Two people are born at the same moment to the same mother, on the same day, in the same place — and they are not twins. How?",
      a: "They are two of a set of triplets",
      opts: ["They are two of a set of triplets", "They were adopted", "One was born a year later", "They have different fathers"],
      why: "'Not twins' invites you to break the birth, when the thing to break is the number two." },
    { q: "A woman shoots her husband, holds him under water for five minutes, then hangs him. Twenty minutes later they go out to dinner together. How?",
      a: "She is a photographer developing a picture",
      opts: ["She is a photographer developing a picture", "He survived the attack", "It was a dream", "She hired an actor"],
      why: "Every verb has a second, ordinary meaning. The puzzle works because you take the first one." },
    { q: "A farmer has 17 sheep. All but 9 run away. How many are left?",
      a: "9",
      opts: ["9", "8", "17", "0"],
      why: "'All but 9 run away' means 9 stayed. The subtraction you reach for is the trap." },
    { q: "You are in a race and you overtake the person in second place. What position are you in now?",
      a: "Second",
      opts: ["Second", "First", "Third", "It depends on the number of runners"],
      why: "You took their place, not the leader's. Almost everyone says first, once." },
    { q: "A doctor gives you three pills and says take one every half hour. How long do the pills last?",
      a: "One hour",
      opts: ["One hour", "One and a half hours", "Half an hour", "Three hours"],
      why: "You take the first one now. The gaps between three pills are two, not three." },
    { q: "Some months have 31 days. How many have 28?",
      a: "All twelve",
      opts: ["All twelve", "One", "Four", "Eleven"],
      why: "Every month has a 28th day. The question never said 'only'." },
    { q: "A man pushes his car to a hotel and tells the owner he is bankrupt. Why?",
      a: "He is playing Monopoly",
      opts: ["He is playing Monopoly", "His car broke down", "He lost his job", "He is being robbed"],
      why: "Each detail is true and the frame is wrong. Once you see the board you cannot unsee it." },
    { q: "What can travel around the world while staying in a corner?",
      a: "A stamp",
      opts: ["A stamp", "The wind", "A shadow", "A satellite"],
      why: "'Corner' is doing two jobs — a place to stay and a place on an envelope." },
    { q: "Forward I am heavy, backward I am not. What am I?",
      a: "A ton",
      opts: ["A ton", "A stone", "A load", "A weight"],
      why: "Read it backwards: 'not'. The puzzle tells you the trick and you still have to see it." }
  ];

  /* ---------------------------------------------------------- the families */
  var FAMILIES = [
    { key: "sequences", name: "Sequences and patterns", icon: "🔢",
      blurb: "Work out the rule, then continue it.", infinite: true, make: makeSequence },
    { key: "logic", name: "Logic and deduction", icon: "🧩",
      blurb: "Some always tell the truth, some always lie. Work out which.", infinite: true, make: makeKnights },
    { key: "spatial", name: "Spatial reasoning", icon: "🧭",
      blurb: "Turn it in your head.", infinite: true, make: makeClock },
    { key: "memory", name: "Working memory", icon: "🧠",
      blurb: "Hold a few things at once, then answer.", infinite: true, make: makeMemory },
    { key: "attention", name: "Attention", icon: "👁",
      blurb: "One of these is not like the others.", infinite: true, make: makeOddOne },
    { key: "estimation", name: "Estimation", icon: "📐",
      blurb: "No looking it up. Build the answer out of what you already know.", infinite: false,
      make: function (seed) {
        var r = rng(seed), f = FERMI[Math.floor(r() * FERMI.length)];
        return { family: "estimation", prompt: f.q, show: "", options: shuffle(r, f.opts),
                 answer: f.band, explain: f.how, trains: "getting near the right answer with no data" };
      } },
    { key: "lateral", name: "Lateral thinking", icon: "💡",
      blurb: "The answer is obvious — afterwards.", infinite: false,
      make: function (seed) {
        var r = rng(seed), f = LATERAL[Math.floor(r() * LATERAL.length)];
        return { family: "lateral", prompt: f.q, show: "", options: shuffle(r, f.opts),
                 answer: f.a, explain: f.why, trains: "letting go of the first reading" };
      } }
  ];

  var BY_KEY = {};
  FAMILIES.forEach(function (f) { BY_KEY[f.key] = f; });

  /* A set of five, one seed, mixed across families — the same shape as the
     daily five, so the reader learns one thing and not two. */
  function makeSet(seed, howMany) {
    var n = howMany || 5, r = rng(seed), out = [];
    var order = shuffle(r, FAMILIES.map(function (f) { return f.key; }));
    for (var i = 0; i < n; i++) {
      var key = order[i % order.length];
      out.push(BY_KEY[key].make((seed * 7919 + i * 104729) >>> 0));
    }
    return out;
  }

  /* The seed for a given day, so everybody gets the same set and it can be
     talked about. Days since 1 Jan 2026, nothing personal in it. */
  function seedForDay(d) {
    var day = d || new Date();
    return Math.floor((Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) -
                       Date.UTC(2026, 0, 1)) / 86400000);
  }

  window.CURIO_GYM = {
    families: FAMILIES,
    byKey: BY_KEY,
    make: function (key, seed) { return BY_KEY[key] ? BY_KEY[key].make(seed >>> 0) : null; },
    makeSet: makeSet,
    seedForDay: seedForDay,
    /* THE ONLY THREE THINGS QPIO MAY SAY ABOUT THIS SECTION.
       Founder ruling, 2026-08-11. Kept here beside the exercises so that the
       next person to write copy for this screen finds the boundary before they
       find a blank page. */
    claims: {
      allowed: ["It is fun.", "It is challenging.",
                "You will get better at these with time — everyone does."],
      neverSay: ["makes you smarter", "raises your IQ", "prevents or slows dementia",
                 "improves memory in daily life", "transfers to work or study",
                 "any medical or cognitive-health claim"]
    },
    counts: { generated: 5, handWritten: FERMI.length + LATERAL.length }
  };
})();
