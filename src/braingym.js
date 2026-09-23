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
// ONE PUZZLE, TWO LANGUAGES, BY CONSTRUCTION. make(key, seed, lang) draws the
// puzzle from the seed first and puts words on it last, so the French and the
// English are the same puzzle with the same answer — never a translation that
// might drift. Until 17 Sep 2026 the French existed only in the review tool,
// and a French reader got English puzzles in the app. Every family now
// renders both languages here, and the review tool reads them from here. The
// French says "tu", as the rest of the app does.
//
// EVERY ANSWER IS CHECKED BY MACHINE. curio-hq/tools/gym_solvers.js solves
// each generated puzzle independently of the generator, in both languages,
// reading only what a reader would see; test_braingym.js fails the build on
// any disagreement. A puzzle bank nobody verified is a bank of plausible
// wrong answers.
//
// READ BY THE PANEL, 11 and 17 Sep 2026. The second reading and an adversary
// that ran every generator through hundreds of thousands of seeds found two
// blockers (a clock puzzle with two right answers whenever the minute hand is
// off the hour; an arithmetic chain that could go negative) and a list of
// smaller things, all applied here and recorded in
// curio-hq/03-Engine/question-intelligence/inventory/gym-panel-reads.json.

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
  function int(r, lo, hi) { if (hi < lo) hi = lo; return lo + Math.floor(r() * (hi - lo + 1)); }
  function shuffle(r, xs) {
    var a = xs.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* Three wrong answers that are wrong for a REASON — near misses, not noise.
     An obviously silly option turns a puzzle into a reading test. The
     distractor maker is given the ATTEMPT number, so every candidate in its
     list gets tried; it used to be given the set size, which only ever
     reached three of them (an adversarial read, 17 Sep 2026). */
  function optionsAround(r, answer, makeDistractor) {
    var set = [answer], attempt = 0;
    while (set.length < 4 && attempt < 60) {
      var d = makeDistractor(r, attempt++);
      if (d !== null && d !== undefined && set.indexOf(d) === -1) set.push(d);
    }
    while (set.length < 4) set.push(answer + set.length * 7 + 1);
    return shuffle(r, set);
  }
  function FR(lang) { return lang === "fr"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  /* "que Ana" is not French; "qu'Ana" is */
  function que(x) { return (/^[aeiouyàâéèêëîïôöùûü]/i.test(x) ? "qu'" : "que ") + x; }

  /* =========================================================== SEQUENCES
     Infer the rule, then continue it. The oldest exercise there is, and the
     one that survives translation untouched: a number means the same thing in
     every language, which is why this family leads. */
  var SEQ_RULES = [
    { id: "add", make: function (r) {
        var a = int(r, 2, 12), d = int(r, 3, 13), n = [];
        for (var i = 0; i < 5; i++) n.push(a + d * i);
        return { n: n, next: a + d * 5, why: "each step adds " + d, whyFr: "on ajoute " + d + " à chaque étape" };
      } },
    { id: "mul", make: function (r) {
        var a = int(r, 1, 5), k = int(r, 2, 4), n = [];
        for (var i = 0; i < 5; i++) n.push(a * Math.pow(k, i));
        return { n: n, next: a * Math.pow(k, 5), why: "each step multiplies by " + k, whyFr: "on multiplie par " + k + " à chaque étape" };
      } },
    { id: "square", make: function (r) {
        var s = int(r, 1, 6), n = [];
        for (var i = 0; i < 5; i++) n.push((s + i) * (s + i));
        return { n: n, next: (s + 5) * (s + 5), why: "these are the square numbers from " + s + " upward", whyFr: "ce sont les carrés des nombres à partir de " + s };
      } },
    { id: "fib", make: function (r) {
        var a = int(r, 1, 6), b = int(r, 2, 9), n = [a, b];
        for (var i = 2; i < 6; i++) n.push(n[i - 1] + n[i - 2]);
        var next = n[5]; n = n.slice(0, 5);
        return { n: n, next: next, why: "each number is the two before it added together", whyFr: "chaque nombre est la somme des deux précédents" };
      } },
    { id: "alt", make: function (r) {
        var a = int(r, 4, 20), up = int(r, 5, 12), down = int(r, 2, 6), n = [a];
        for (var i = 1; i < 5; i++) n.push(i % 2 ? n[i - 1] + up : n[i - 1] - down);
        return { n: n, next: n[4] + up, why: "it adds " + up + ", then takes away " + down + ", over and over", whyFr: "on ajoute " + up + ", puis on retire " + down + ", et ainsi de suite" };
      } },
    { id: "growadd", make: function (r) {
        var a = int(r, 1, 9), d = int(r, 1, 4), step = d, n = [a];
        for (var i = 1; i < 5; i++) { n.push(n[i - 1] + step); step += d; }
        return { n: n, next: n[4] + step, why: "the gap itself grows by " + d + " each time", whyFr: "l'écart lui-même augmente de " + d + " à chaque fois" };
      } }
  ];

  function makeSequence(seed, lang) {
    var r = rng(seed), rule = pick(r, SEQ_RULES), s = rule.make(r);
    var opts = optionsAround(r, s.next, function (rr, i) {
      var jitter = [1, -1, 2, -2, 3, -3][i % 6];
      var d = s.next + jitter * Math.max(1, Math.round(Math.abs(s.next) * 0.08) || 1);
      return d === s.next || s.n.indexOf(d) !== -1 ? null : d;   /* never a number already on show */
    });
    return {
      family: "sequences", form: rule.id,
      prompt: FR(lang) ? "Quelle est la suite ?" : "What comes next?",
      show: s.n.join("  ·  ") + "  ·  ?",
      options: opts.map(String),
      answer: String(s.next),
      explain: FR(lang) ? "C'est " + s.next + " — " + s.whyFr + "." : "It is " + s.next + " — " + s.why + ".",
      trains: FR(lang) ? "repérer une règle à partir de très peu d'indices" : "spotting a rule from very little evidence",
      /* the picture: the five numbers as tiles and a sixth marked "?" — the rule and the answer are never drawn */
      scene: { kind: "tiles", items: s.n.slice(), q: true },
      sceneText: FR(lang) ? "Cinq nombres à la suite : " + s.n.join(", ") + ", puis un point d'interrogation." : "Five numbers in a row: " + s.n.join(", ") + ", then a question mark."
    };
  }

  /* ============================================================== LOGIC
     Knights always tell the truth, knaves always lie. Two sentences and one
     of them settles it. No knowledge, no arithmetic, no language tricks —
     which is why it works identically in French. */
  var NAMES = ["Ali", "Bo", "Cai", "Dan", "Eli", "Fen", "Gus", "Hal"];
  function makeKnights(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var names = shuffle(r, NAMES).slice(0, 2);
    var A = names[0], B = names[1];
    var form = int(r, 0, 3);
    var truth = function (x) { return fr ? x + " dit la vérité" : x + " tells the truth"; };
    var lies = function (x) { return fr ? x + " ment" : x + " lies"; };
    var both = fr ? "Les deux disent la vérité" : "Both tell the truth";
    var bothLie = fr ? "Les deux mentent" : "Both lie";
    var pairImpossible = fr ? "Impossible — les deux phrases sont incompatibles" : "Neither can be true — the pair is impossible";
    var nobody = fr ? "Personne ne peut prononcer cette phrase — impossible dans les deux cas" : "Nobody could say it — it is impossible either way";
    var says = function (who, what) { return fr ? who + " dit : « " + what + " »" : who + ' says: "' + what + '"'; };
    var said, answer, explain;

    if (form === 0) {
      /* A: "We are both liars." A truth-teller cannot say it (it would be
         false); a liar saying it would make it true, and a liar cannot say a
         true thing. So A lies and B tells the truth. */
      said = says(A, fr ? "Nous sommes tous les deux des menteurs." : "We are both liars.");
      answer = lies(A) + ", " + truth(B);
      explain = fr
        ? "Quelqu'un qui dit toujours la vérité ne pourrait pas le dire — ce serait faux. Un menteur qui le dirait rendrait la phrase vraie, et un menteur ne peut rien dire de vrai. Donc " + A + " est le menteur, la phrase est fausse, et " + B + " n'est pas un menteur."
        : "A truth-teller could not say it — it would be false. A liar saying it would make it true, and a liar cannot say something true. So " + A + " is the liar, which makes the sentence false, which means " + B + " is not a liar.";
    } else if (form === 1) {
      /* A: "At least one of us is a liar." A liar saying it would make it
         true — impossible. So A tells the truth, the sentence is true, and the
         liar must be B. */
      said = says(A, fr ? "Au moins l'un de nous deux est un menteur." : "At least one of us is a liar.");
      answer = truth(A) + ", " + lies(B);
      explain = fr
        ? "Si " + A + " était le menteur, la phrase serait vraie, et un menteur ne peut rien dire de vrai. Donc " + A + " dit la vérité — la phrase est vraie, et le menteur est forcément " + B + "."
        : "If " + A + " were the liar the sentence would be true, and a liar cannot say a true thing. So " + A + " tells the truth — and then the sentence is true, so the liar must be " + B + ".";
    } else if (form === 2) {
      /* A: "B tells the truth." B: "A lies." Both roads double back: no
         arrangement is consistent. */
      said = says(A, fr ? B + " dit la vérité." : B + " tells the truth.") + "  " + says(B, fr ? A + " ment." : A + " lies.");
      answer = pairImpossible;
      explain = fr
        ? "Supposons " + que(A) + " dise la vérité : alors " + B + " aussi, donc l'affirmation de " + B + " selon laquelle " + A + " ment est vraie — mais " + A + " a dit la vérité. Supposons au contraire " + que(A) + " mente : alors " + B + " ment aussi, donc son affirmation est fausse, ce qui signifie " + que(A) + " dit la vérité. Les deux chemins se contredisent. Aucune combinaison ne tient."
        : "Suppose " + A + " tells the truth: then " + B + " does too, so " + B + "'s claim that " + A + " lies is true — but " + A + " told the truth. Suppose instead " + A + " lies: then " + B + " lies, so " + B + "'s claim is false, meaning " + A + " tells the truth. Both roads double back. No arrangement works.";
    } else {
      /* A: "I am a liar." Nobody can say this. */
      said = says(A, fr ? "Je suis un menteur." : "I am a liar.");
      answer = nobody;
      explain = fr
        ? "Quelqu'un qui dit la vérité mentirait en le disant. Un menteur, lui, dirait la vérité. La phrase se contredit elle-même, qui que soit celui qui la prononce."
        : "A truth-teller saying it would be lying. A liar saying it would be telling the truth. The sentence rules itself out whoever says it.";
    }

    var wrongs = shuffle(r, [
      truth(A) + ", " + lies(B),
      lies(A) + ", " + truth(B),
      both, bothLie, pairImpossible, nobody
    ].filter(function (x) { return x !== answer; })).slice(0, 3);

    return {
      family: "logic", form: ["both-liars", "at-least-one", "pair", "i-am-liar"][form],
      prompt: fr ? "Sur cette île, certains disent toujours la vérité et d'autres mentent toujours. Qui est qui ?"
                 : "On this island some people always tell the truth and some always lie. Who is who?",
      show: said,
      options: shuffle(r, wrongs.concat([answer])),
      answer: answer,
      explain: explain,
      trains: fr ? "suivre une chaîne de conséquences sans perdre le fil" : "following a chain of consequences without losing your place",
      /* two figures, a speech bubble on whoever speaks; nothing marks who lies */
      scene: { kind: "islanders", names: [NAMES.indexOf(A), NAMES.indexOf(B)], speaks: form === 2 ? [0, 1] : [0] },
      sceneLabels: { names: [A, B] },
      sceneText: fr ? "Deux insulaires, " + A + " et " + B + ". " + (form === 2 ? "Les deux parlent." : A + " parle.") : "Two islanders, " + A + " and " + B + ". " + (form === 2 ? "Both speak." : A + " speaks.")
    };
  }

  /* ============================================================ SPATIAL
     A clock face, because it is the one spatial object everybody already
     carries and it needs no picture. Turning the face is rotation, and the
     wrap-around at twelve is what makes it work rather than arithmetic.

     REWORDED 17 Sep 2026 on the panel's objection: turning the whole face
     turns both hands, so the clock still READS the same time, and the old
     answer "10:15" marked a careful reader wrong. And the time is always on
     the hour now — at 10:45 the hour hand sits three-quarters of the way to
     11, and after the turn it pointed between two offered numbers. The
     adversarial read found that on 72% of seeds. */
  function makeClock(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var h = int(r, 1, 12);
    var turn = pick(r, [90, 180, 270]);
    var steps = turn / 30;                /* the face turns one number per 30° */
    var turnWord = { 90: ["a quarter turn", "un quart de tour"], 180: ["half a turn", "un demi-tour"], 270: ["three quarters of a turn", "trois quarts de tour"] }[turn];
    var nh = ((h - 1 + steps) % 12) + 1;
    var answer = String(nh);
    /* wrong for different reasons: the number it pointed at before (nothing
       moved), the turn taken the other way, and one neighbour of the answer —
       a fixed {before, answer−1, answer, answer+1} shape let a regular reader
       pick the middle of three consecutive numbers without rotating anything */
    var wrongWay = ((h - 1 - steps + 12) % 12) + 1;
    var neighbour = int(r, 0, 1) === 0 ? (nh % 12) + 1 : ((nh + 10) % 12) + 1;
    var opts = [answer];
    [h, wrongWay, neighbour].forEach(function (c) { if (opts.indexOf(String(c)) === -1 && opts.length < 4) opts.push(String(c)); });
    var cands = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(String).filter(function (x) { return opts.indexOf(x) === -1; }));
    while (opts.length < 4) opts.push(cands.pop());
    return {
      family: "spatial", form: "clock",
      /* the face as it reads now, and an arrow for the turn; the turned face is never drawn */
      scene: { kind: "clock", h: h, turn: turn },
      sceneText: fr ? "Une horloge qui indique " + h + " h, avec une flèche pour " + turnWord[1] + " dans le sens des aiguilles d'une montre." : "A clock reading " + h + " o'clock, with an arrow showing " + turnWord[0] + " clockwise.",
      prompt: fr
        ? "Fais tourner toute l'horloge, aiguilles comprises, de " + turn + " degrés (" + turnWord[1] + ") dans le sens des aiguilles d'une montre. L'aiguille des heures pointe maintenant là où se trouvait l'un des chiffres. Lequel ?"
        : "Turn the whole clock — hands and all — clockwise by " + turn + " degrees (" + turnWord[0] + "). The hour hand now points where one of the numbers used to be. Which one?",
      show: fr ? "L'horloge indique " + h + " h" : "The clock reads " + h + " o'clock",
      options: shuffle(r, opts),
      answer: answer,
      explain: fr
        ? "L'horloge tourne d'un chiffre tous les 30 degrés, donc " + turn + " degrés font " + steps + " chiffres. L'aiguille, qui pointait sur le " + h + ", pointe maintenant là où était le " + nh + ". L'horloge, elle, indique toujours " + h + " h — tout a tourné ensemble, aiguilles comprises."
        : "The clock turns one number for every 30 degrees, so " + turn + " degrees is " + steps + " numbers. The hand that pointed at " + h + " now points at where " + nh + " used to be. The clock itself still reads " + h + " o'clock — everything turned together, hands and all.",
      trains: fr ? "faire tourner quelque chose dans sa tête sans tourner la tête" : "turning something in your head without turning your head"
    };
  }

  /* ====================================================== WORKING MEMORY
     Hold a short list, then answer a question about it that you could not
     have prepared for. The load is deliberately light — this is not a test,
     it is the thing you can feel getting easier. The word pool maps one to
     one onto French, all sixteen distinct in both, so the French reader
     holds the same list. */
  var MEM_WORDS = [
    ["river", "rivière"], ["copper", "cuivre"], ["lantern", "lanterne"], ["harbour", "port"],
    ["cedar", "cèdre"], ["marble", "marbre"], ["compass", "boussole"], ["saffron", "safran"],
    ["anchor", "ancre"], ["willow", "saule"], ["amber", "ambre"], ["quarry", "carrière"],
    ["thistle", "chardon"], ["beacon", "balise"], ["orchard", "verger"], ["flint", "silex"]
  ];
  /* WAYS TO HOLD A LIST (22 Sep 2026). Written from their sources by the content function in
     curio-hq/03-Engine/question-intelligence/content/memory-techniques.json and copied here
     verbatim - tools/test_braingym.js fails the build if the two ever differ. Instructions only:
     what to do with a list, and where the way comes from. No claim about what it does to you. */
  var HOLD_WAYS = [
    {
      "id": "story",
      "name": {
        "en": "The story chain",
        "fr": "L'histoire en chaîne"
      },
      "how": {
        "en": "Join the words, in order, into one short, silly story: a kettle sneezes out a feather, which tickles a violin, which drops a pebble… To answer, replay the story from the start.",
        "fr": "Relie les mots, dans l'ordre, en une petite histoire loufoque : une bouilloire éternue et projette une plume, qui chatouille un violon, qui lâche un galet… Pour répondre, déroule l'histoire depuis le début."
      },
      "tip": {
        "en": "Link the words into one silly story, in order.",
        "fr": "Relie les mots en une histoire loufoque, dans l'ordre."
      },
      "origin": {
        "en": "In 1969, psychologists Gordon Bower and Michal Clark asked some of the people in their study to weave each list of ten words into a story.",
        "fr": "En 1969, les psychologues Gordon Bower et Michal Clark ont demandé à une partie des participants de leur étude d'inventer une histoire autour de chaque liste de dix mots."
      }
    },
    {
      "id": "journey",
      "name": {
        "en": "The journey (method of loci)",
        "fr": "Le parcours (méthode des lieux)"
      },
      "how": {
        "en": "Picture a walk through your home and leave one word at each stop: a kettle on the doormat, a feather on the stairs… To answer, walk it again: the third stop is word number 3.",
        "fr": "Imagine une promenade dans ta maison et dépose un mot à chaque étape : une bouilloire sur le paillasson, une plume dans l'escalier… Pour répondre, refais la promenade : la troisième étape, c'est le mot numéro 3."
      },
      "tip": {
        "en": "Walk through your home in your mind, leaving one word at each stop.",
        "fr": "Traverse ta maison en pensée et dépose un mot à chaque étape."
      },
      "origin": {
        "en": "Roman writers on public speaking described placing pictures along a row of imagined places, and Cicero told of the Greek poet Simonides using this method. Other peoples tie knowledge to places in their own traditions, some of it sacred and not open to everyone, such as Aboriginal Australian songlines and the lukasa boards used by Luba historians in today's DR Congo.",
        "fr": "Dans leurs traités d'éloquence, des auteurs romains ont décrit comment placer des images le long d'une suite de lieux imaginés, et Cicéron raconte que le poète grec Simonide s'en était servi. D'autres peuples rattachent le savoir à des lieux dans leurs propres traditions, parfois sacrées et réservées à quelques-uns, comme les chants des pistes (songlines) des Aborigènes d'Australie ou les planchettes lukasa des historiens luba, dans l'actuelle RD Congo."
      }
    },
    {
      "id": "chunking",
      "name": {
        "en": "Small groups (chunking)",
        "fr": "Petits paquets (chunking)"
      },
      "how": {
        "en": "Split the list into pairs (kettle-feather, violin-pebble, tulip-ladder) and say each pair in one breath. To answer, count by pairs: word number 3 starts the second pair.",
        "fr": "Coupe la liste en paquets de deux (bouilloire-plume, violon-galet, tulipe-échelle) et dis chaque paquet d'une traite. Pour répondre, compte par paquet : le mot numéro 3 ouvre le deuxième paquet."
      },
      "tip": {
        "en": "Split the words into pairs and say each pair in one breath.",
        "fr": "Coupe la liste en paquets de deux et dis chaque paquet d'une traite."
      },
      "origin": {
        "en": "The psychologist George A. Miller called such small groups \"chunks\" in a well-known 1956 paper.",
        "fr": "Le psychologue George A. Miller a appelé ces petits groupes des « chunks » dans un article célèbre de 1956."
      }
    },
    {
      "id": "pictures",
      "name": {
        "en": "Vivid pictures",
        "fr": "Images frappantes"
      },
      "how": {
        "en": "Turn each word into a huge, funny or strange picture: a kettle as big as a house, a tulip wearing a crown. Line the pictures up in the order the words came and, to answer, count along the line.",
        "fr": "Transforme chaque mot en une image énorme, drôle ou bizarre : une bouilloire grande comme une maison, une tulipe coiffée d'une couronne. Aligne ces images dans l'ordre des mots et, pour répondre, compte-les une à une."
      },
      "tip": {
        "en": "Make each word a big, strange picture, then line them up.",
        "fr": "Fais de chaque mot une image énorme et bizarre, puis aligne-les."
      },
      "origin": {
        "en": "A Roman handbook on public speaking, written in the late 80s BCE, advised making mental pictures striking, beautiful, ugly or funny.",
        "fr": "Un traité romain d'éloquence, écrit au Ier siècle avant notre ère, conseillait de rendre les images mentales frappantes, belles, laides ou drôles."
      }
    }
  ];

  function makeMemory(seed, lang) {
    var r = rng(seed), fr = FR(lang), w = fr ? 1 : 0;
    var n = int(r, 5, 7);
    var list = shuffle(r, MEM_WORDS).slice(0, n);
    var kind = int(r, 0, 2);
    var answerIdx, prompt;
    if (kind === 0) {
      var pos = int(r, 2, n);            /* 1 would be the "first one" question in other words */
      prompt = fr ? "Quel était le mot numéro " + pos + " ?" : "Which word was number " + pos + "?";
      answerIdx = pos - 1;
    } else if (kind === 1) {
      /* the anchor used to be the second-to-last word every time, so "after X"
         always meant "the last one" — a regular reader learned that in a week */
      var anchor = int(r, 0, n - 2);
      prompt = fr ? "Quel mot venait juste après « " + list[anchor][1] + " » ?" : "Which word came immediately after " + list[anchor][0] + "?";
      answerIdx = anchor + 1;
    } else {
      /* "the longest" used to live here, and could tie (willow/quarry), which
         made the answer arbitrary — a panel finding, 11 Sep. "The first one"
         cannot tie. */
      prompt = fr ? "Quel était le premier mot de la liste ?" : "Which word was the first one on the list?";
      answerIdx = 0;
    }
    var words = list.map(function (p) { return p[w]; });
    var answer = words[answerIdx];
    /* the word the question names is never offered: "what came after X?" answered "X" is no choice at all */
    var named = kind === 1 ? words[anchor] : null;
    var wrongs = shuffle(r, words.filter(function (x) { return x !== answer && x !== named; })).slice(0, 3);
    return {
      family: "memory", form: ["position", "after", "first"][kind],
      /* the words as cards while studying; the same cards empty and numbered when asked */
      scene: { kind: "cards", n: n, anchorIdx: kind === 1 ? anchor : null, posAsked: kind === 0 ? pos : null },
      sceneLabels: { words: words.slice(), anchor: kind === 1 ? list[anchor][w] : null },
      sceneText: fr ? n + " cartes vides, numérotées de 1 à " + n + "." : n + " empty cards, numbered 1 to " + n + ".",
      prompt: prompt,
      show: words.join("  ·  "),
      hide: true,                       /* the list is shown, then taken away */
      options: shuffle(r, wrongs.concat([answer])),
      answer: answer,
      explain: (fr ? "La liste était : " : "The list was: ") + words.join(", ") + ".",
      trains: fr ? "garder une courte liste en tête une fois qu'elle a disparu" : "holding a short list in your head after it has gone"
    };
  }

  /* ========================================================== ATTENTION
     One of these is not like the others, and the difference is small on
     purpose. Speed matters less than not being fooled by the obvious. The
     palindromes are a French pool for French readers, not translations — a
     word that reads the same backwards in one language does not in the other. */
  var PAL = { en: ["level", "rotor", "civic", "kayak", "refer", "madam", "stats"], fr: ["radar", "rotor", "kayak", "été", "ici", "elle", "tôt"] };
  var NOTPAL = { en: ["ledge", "cider", "torch", "plumb"], fr: ["pente", "cidre", "torche", "plomb"] };
  function makeOddOne(seed, lang) {
    var r = rng(seed), fr = FR(lang), L = fr ? "fr" : "en";
    var kind = int(r, 0, 2);
    var items, answer, why;
    if (kind === 0) {
      var base = int(r, 3, 9);
      items = [base * 2, base * 3, base * 4, base * 5].map(String);
      var odd = base * 4 + 1;
      items[int(r, 0, 3)] = String(odd);
      answer = String(odd);
      why = fr ? "tous les autres nombres sont divisibles par " + base + " ; " + odd + " non" : "every other number divides by " + base + "; " + odd + " does not";
    } else if (kind === 1) {
      var order = shuffle(r, [0, 1, 2, 3, 4, 5, 6]).slice(0, 3);
      var notIdx = int(r, 0, 3);
      var pool = order.map(function (i) { return PAL[L][i]; });
      var notPal = NOTPAL[L][notIdx];
      items = shuffle(r, pool.concat([notPal]));
      answer = notPal;
      why = fr ? "les autres se lisent pareil à l'envers" : "the others read the same backwards";
    } else {
      var evens = shuffle(r, [12, 24, 36, 48, 60, 72, 84]).slice(0, 3);
      var oddN = pick(r, [15, 21, 33, 45, 57]);
      items = shuffle(r, evens.concat([oddN])).map(String);
      answer = String(oddN);
      why = fr ? "les autres sont tous pairs" : "the others are all even";
    }
    return {
      family: "attention", form: ["divisor", "palindrome", "even"][kind],
      /* the four items are words in the reader's language (the palindromes are French for a French
         reader), so they travel as labels; the scene itself stays the same in both languages */
      scene: { kind: "tiles", n: 4 },
      sceneLabels: { items: items.slice() },
      sceneText: (fr ? "Quatre éléments : " : "Four items: ") + items.join(", ") + ".",
      prompt: fr ? "Lequel n'est pas à sa place ?" : "Which one does not belong?",
      show: items.join("   "),
      options: shuffle(r, items),
      answer: answer,
      explain: answer + " — " + why + ".",
      trains: fr ? "remarquer la petite différence plutôt que la grande" : "noticing the small difference rather than the loud one"
    };
  }

  /* ========================================================== DEDUCTION
     Two comparisons, three things, one question — and sometimes the honest
     answer is that it cannot be told. That fourth option is right often
     enough that a reader learns to check whether the clues actually reach
     the thing asked about, which is the whole skill. Objects rather than
     people, so the French adjectives have one fixed gender. */
  var THINGS = [
    { en: ["box", "heavier", "lighter", "heaviest", "lightest"], fr: ["boîte", "plus lourde", "plus légère", "la plus lourde", "la plus légère"] },
    { en: ["tower", "taller", "shorter", "tallest", "shortest"], fr: ["tour", "plus haute", "plus basse", "la plus haute", "la plus basse"] },
    { en: ["rope", "longer", "shorter", "longest", "shortest"], fr: ["corde", "plus longue", "plus courte", "la plus longue", "la plus courte"] }
  ];
  var COLOURS = [["red", "rouge"], ["blue", "bleue"], ["green", "verte"], ["yellow", "jaune"]];
  function makeOrdering(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var thing = pick(r, THINGS), T = fr ? thing.fr : thing.en;
    var cols = shuffle(r, COLOURS).slice(0, 3);   /* cols[0] > cols[1] > cols[2] on the attribute */
    var name = function (i) { return fr ? "la " + T[0] + " " + cols[i][1] : "the " + cols[i][0] + " " + T[0]; };
    var Name = function (i) { return cap(name(i)); };
    var clue = function (hi, lo) {
      /* "X is more than Y" or "Y is less than X" — same fact, two surfaces */
      return int(r, 0, 1) === 1
        ? Name(lo) + (fr ? " est " : " is ") + T[2] + (fr ? " que " : " than ") + name(hi) + "."
        : Name(hi) + (fr ? " est " : " is ") + T[1] + (fr ? " que " : " than ") + name(lo) + ".";
    };
    var form = int(r, 0, 2), edges;
    if (form === 0) edges = [[0, 1], [1, 2]];        /* a chain: everything is determined */
    else if (form === 1) edges = [[0, 1], [0, 2]];   /* a fork from the top: only the greatest is known */
    else edges = [[0, 2], [1, 2]];                   /* a fork to the bottom: only the least is known */
    var askGreatest = int(r, 0, 1) === 0;
    var determined = form === 0 || (form === 1 && askGreatest) || (form === 2 && !askGreatest);
    var cannot = fr ? "On ne peut pas le savoir avec ces indices" : "You can't tell from these clues";
    var answer = !determined ? cannot : Name(askGreatest ? 0 : 2);
    var options = shuffle(r, [Name(0), Name(1), Name(2), cannot]);
    var shown = shuffle(r, edges).map(function (e) { return clue(e[0], e[1]); }).join(" ");
    var pivot = form === 1 ? 0 : 2;           /* the thing both clues mention, in the fork forms */
    var explain;
    if (form === 0) explain = fr
      ? "Les deux indices parlent de " + name(1) + " : une chose est au-dessus d'elle, une autre en dessous. Mis bout à bout, de " + T[3] + " à " + T[4] + " : " + name(0) + ", puis " + name(1) + ", puis " + name(2) + ". " + Name(askGreatest ? 0 : 2) + " est donc " + T[askGreatest ? 3 : 4] + "."
      : "Both clues mention " + name(1) + ": one thing is above it, one is below it. Put end to end, from " + T[3] + " to " + T[4] + ": " + name(0) + ", then " + name(1) + ", then " + name(2) + ". So " + name(askGreatest ? 0 : 2) + " is the " + T[askGreatest ? 3 : 4] + ".";
    else if (determined) explain = fr
      ? "Les deux indices parlent de " + name(pivot) + ", et les deux fois elle est " + T[askGreatest ? 1 : 2] + " que l'autre. Elle est donc " + T[askGreatest ? 3 : 4] + " des trois — même si l'ordre des deux autres reste inconnu."
      : "Both clues are about " + name(pivot) + ", and both times it is " + T[askGreatest ? 1 : 2] + " than the other one. So it is the " + T[askGreatest ? 3 : 4] + " of the three — even though the order of the other two is unknown.";
    else explain = fr
      ? "Les deux indices ne comparent jamais " + name(form === 1 ? 1 : 0) + " et " + name(form === 1 ? 2 : 1) + " entre elles. " + cap(T[askGreatest ? 3 : 4]) + " est forcément l'une des deux, mais rien ne dit laquelle."
      : "The clues never compare " + name(form === 1 ? 1 : 0) + " and " + name(form === 1 ? 2 : 1) + " with each other. The " + T[askGreatest ? 3 : 4] + " must be one of them, but nothing says which.";
    return {
      family: "deduction", form: form === 0 ? "chain" : determined ? "fork-determined" : "fork-undetermined",
      /* three things of ONE size, each its colour — which is biggest is exactly what is not shown */
      scene: { kind: "things", thing: thing.en[0], colours: cols.map(function (c) { return { red: 1, blue: 0, green: 3, yellow: 2 }[c[0]]; }) },
      sceneLabels: { names: cols.map(function (c) { return fr ? c[1] : c[0]; }) },
      sceneText: fr ? "Trois " + T[0] + "s : " + cols.map(function (c) { return c[1]; }).join(", ") + ". Laquelle est " + T[askGreatest ? 3 : 4] + " n'est pas montré." : "Three " + T[0] + "s: " + cols.map(function (c) { return c[0]; }).join(", ") + ". Which is " + T[askGreatest ? 3 : 4] + " is not shown.",
      prompt: fr ? "Quelle " + T[0] + " est " + T[askGreatest ? 3 : 4] + " ?" : "Which " + T[0] + " is the " + T[askGreatest ? 3 : 4] + "?",
      show: shown,
      options: options,
      answer: answer,
      explain: explain,
      trains: fr ? "vérifier que les indices portent bien sur ce qu'on te demande" : "checking that the clues actually reach the thing you were asked about"
    };
  }

  /* ========================================================= ARITHMETIC
     A short chain of operations held in the head, no paper. Small numbers on
     purpose: the exercise is keeping your place, not multiplication. Every
     value along the way stays at 2 or above — the first version could reach
     zero and below and then say "take away 0" (an adversarial read, 17 Sep). */
  function makeChain(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var n = int(r, 3, 12), start = n, steps = [], trail = [], ops = [];
    var count = int(r, 3, 4);
    for (var i = 0; i < count; i++) {
      var prev = steps.length ? steps[steps.length - 1] : "";
      var kinds = ["add"];
      if (n <= 40 && !/Halve|Divise/.test(prev)) kinds.push("double");
      if (n >= 4) kinds.push("sub");
      if (n % 2 === 0 && n >= 4 && !/Double/.test(prev)) kinds.push("half");
      if (n > 40) kinds = n % 2 === 0 && !/Double/.test(prev) ? ["sub", "half"] : ["sub"];
      var k = pick(r, kinds), v;
      if (k === "double") { n = n * 2; steps.push(fr ? "Double-le." : "Double it."); ops.push({ k: "mul", v: 2 }); }
      else if (k === "half") { n = n / 2; steps.push(fr ? "Divise-le par deux." : "Halve it."); ops.push({ k: "div", v: 2 }); }
      else if (k === "add") { v = int(r, 3, 9); if (/^(Take away|Retire) / .test(prev) && Number(prev.match(/\d+/)[0]) === v) v = v === 9 ? 3 : v + 1; n = n + v; steps.push(fr ? "Ajoute " + v + "." : "Add " + v + "."); ops.push({ k: "add", v: v }); }
      else { v = int(r, 2, Math.min(7, n - 2)); if (/^(Add|Ajoute) /.test(prev) && Number(prev.match(/\d+/)[0]) === v) v = v >= Math.min(7, n - 2) ? 2 : v + 1; n = n - v; steps.push(fr ? "Retire " + v + "." : "Take away " + v + "."); ops.push({ k: "sub", v: v }); }
      trail.push(n);
    }
    var answer = n;
    var opts = optionsAround(r, answer, function (rr, i) {
      /* the slips a real reader makes: off by one either way, a step missed,
         a step applied twice */
      var d = answer + [1, -1, 2, -2, 3, -3, 4, 5][i % 8];
      return d < 0 || d === answer ? null : d;
    });
    return {
      family: "arithmetic", form: "chain",
      /* the steps as a chain of pills; the values along the way are never drawn */
      scene: { kind: "chain", start: start, ops: ops },
      sceneText: (fr ? "Pars de " + start + ". " : "Start at " + start + ". ") + steps.join(" ") + (fr ? " Puis un point d'interrogation." : " Then a question mark."),
      prompt: (fr ? "Pars de " + start + ". " : "Start with " + start + ". ") + steps.join(" ") + (fr ? " Qu'obtiens-tu ?" : " What do you have?"),
      show: "",
      options: opts.map(String),
      answer: String(answer),
      explain: (fr ? "Étape par étape : " : "Step by step: ") + start + " → " + trail.join(" → ") + ".",
      trains: fr ? "ne pas perdre le fil d'un calcul sans rien écrire" : "keeping your place in a calculation without writing anything down"
    };
  }

  /* =========================================================== CALENDAR
     Days of the week go round in sevens, and the reader who spots that
     100 days is fourteen weeks and two days has done the whole puzzle. Eight
     and fifteen days are skipped: "dans 8 jours" is a week to a French ear,
     and "15 jours" a fortnight, so the French would have had two readings. */
  var DAYS = { en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
               fr: ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] };
  function makeDays(seed, lang) {
    var r = rng(seed), fr = FR(lang), D = fr ? DAYS.fr : DAYS.en;
    var today = int(r, 0, 6), n = int(r, 9, 120), ahead = int(r, 0, 1) === 0;
    if (n === 15) n = 16;
    var target = ((today + (ahead ? n : -n)) % 7 + 7) % 7;
    var weeks = Math.floor(n / 7), rest = n % 7;
    var answer = D[target];
    /* wrong for a reason: counted the other way, or off by one */
    var wrongWay = D[((today + (ahead ? -n : n)) % 7 + 7) % 7], offBy = D[(target + (int(r, 0, 1) ? 1 : 6)) % 7];
    var wrongs = [wrongWay, offBy].filter(function (d, i, a) { return d !== answer && a.indexOf(d) === i; });
    shuffle(r, D.filter(function (d) { return d !== answer && wrongs.indexOf(d) === -1; })).forEach(function (d) { if (wrongs.length < 3) wrongs.push(d); });
    var wk = function (k) { return k + (fr ? " semaine" : " week") + (k === 1 ? "" : "s"); };
    var dy = function (k) { return k + (fr ? " jour" : " day") + (k === 1 ? "" : "s"); };
    return {
      family: "calendar", form: ahead ? "ahead" : "back",
      /* the week as a strip, today marked, the arrow leaving it — the arrow never lands on a day */
      scene: { kind: "week", today: today, n: n, ahead: ahead },
      sceneLabels: { days: fr ? ["L", "M", "M", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"], unit: fr ? "jours" : "days" },
      sceneText: fr ? "Une bande des jours de la semaine. Aujourd'hui, " + D[today] + ". Une flèche marquée " + (ahead ? "plus" : "moins") + " " + n + " jours pointe vers " + (ahead ? "l'avant" : "l'arrière") + "." : "A week strip. Today is " + D[today] + ". An arrow marked " + (ahead ? "plus" : "minus") + " " + n + " days points " + (ahead ? "forward" : "back") + ".",
      prompt: fr
        ? "Nous sommes " + D[today] + ". Quel jour de la semaine " + (ahead ? "serons-nous dans " + n + " jours ?" : "étions-nous il y a " + n + " jours ?")
        : "Today is " + D[today] + ". What day of the week " + (ahead ? "will it be in " + n + " days?" : "was it " + n + " days ago?"),
      show: "",
      options: shuffle(r, wrongs.concat([answer])),
      answer: answer,
      explain: fr
        ? "Les jours de la semaine reviennent tous les sept jours, donc les semaines entières ne comptent pas. " + n + " jours, c'est " + wk(weeks) + (rest ? " et " + dy(rest) : "") + ". " + cap(wk(weeks)) + " plus " + (ahead ? "tard" : "tôt") + ", on retombe sur " + D[today] + (rest ? " ; " + dy(rest) + " plus " + (ahead ? "tard" : "tôt") + ", c'est " + D[target] : "") + "."
        : "The days of the week come round every seven days, so whole weeks do not count. " + n + " days is " + wk(weeks) + (rest ? " and " + dy(rest) : "") + ". " + cap(wk(weeks)) + " " + (ahead ? "on" : "back") + ", you land on " + D[today] + " again" + (rest ? "; " + dy(rest) + " " + (ahead ? "further on" : "further back") + " is " + D[target] : "") + ".",
      trains: fr ? "raisonner sur quelque chose qui revient en boucle" : "reasoning about something that goes round in a circle"
    };
  }

  /* =============================================================== SETS
     Two overlapping groups and one number the reader has to keep from
     counting twice. The classic mistake is adding the two groups; the
     puzzle is built so that mistake is always one of the options. Each
     group carries its own words for "both" and "neither", singular and
     plural, so no sentence reads "1 do both". */
  var GROUPS = [
    { en: ["drink tea", "drink coffee", "drink tea but not coffee", "drink both", "drinks both", "drink neither"],
      fr: ["boivent du thé", "boivent du café", "boivent du thé mais pas de café", "boivent les deux", "boit les deux", "ne boivent ni l'un ni l'autre"] },
    { en: ["play football", "play chess", "play football but not chess", "play both", "plays both", "play neither"],
      fr: ["jouent au football", "jouent aux échecs", "jouent au football mais pas aux échecs", "jouent aux deux", "joue aux deux", "ne jouent ni à l'un ni à l'autre"] },
    { en: ["speak Spanish", "speak Arabic", "speak Spanish but not Arabic", "speak both", "speaks both", "speak neither"],
      fr: ["parlent espagnol", "parlent arabe", "parlent espagnol mais pas arabe", "parlent les deux", "parle les deux", "ne parlent ni l'un ni l'autre"] },
    { en: ["have a cat", "have a dog", "have a cat but not a dog", "have both", "has both", "have neither"],
      fr: ["ont un chat", "ont un chien", "ont un chat mais pas de chien", "ont les deux", "a les deux", "n'ont ni l'un ni l'autre"] }
  ];
  function makeGroups(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var g = pick(r, GROUPS), G = fr ? g.fr : g.en;
    var N = int(r, 20, 40);
    var A = int(r, 8, N - 6), B = int(r, 8, N - 6);
    var lo = Math.max(1, A + B - N + 1), hi = Math.min(A, B) - 1;
    if (hi < lo) { hi = Math.min(A, B); lo = Math.max(0, A + B - N); }
    var both = int(r, lo, hi);
    var neither = N - (A + B - both), onlyA = A - both;
    var askNeither = int(r, 0, 1) === 0;
    var answer = askNeither ? neither : onlyA;
    var naive = askNeither ? N - A - B : A;             /* the double-count mistake */
    var opts = optionsAround(r, answer, function (rr, i) {
      var cand = [naive, answer + both, answer - 1, answer + 2, answer + 1, answer - 2, answer + both + 1, answer + 3][i % 8];
      return (cand < 0 || cand === answer) ? null : cand;
    });
    var bothWord = both === 1 ? G[4] : G[3];
    var whoBothEn = (both === 1 ? "The one who " + G[4] + " is counted" : "The " + both + " who " + G[3] + " are counted");
    var whoBothFr = (both === 1 ? "La personne qui " + G[4] + " est comptée" : "Les " + both + " qui " + G[3] + " sont comptés");
    return {
      family: "sets", form: askNeither ? "neither" : "only",
      /* two overlapping circles with the three given numbers; a "?" on the region asked — onlyA and neither are never drawn */
      scene: { kind: "venn", N: N, A: A, B: B, both: both, askNeither: askNeither },
      sceneLabels: { a: G[0], b: G[1] },
      sceneText: fr ? "Un groupe de " + N + ". " + A + " " + G[0] + ", " + B + " " + G[1] + ", " + both + " " + bothWord + ". Le point d'interrogation est sur " + (askNeither ? "ceux qui ne font ni l'un ni l'autre" : "ceux du premier groupe seulement") + "." : "A group of " + N + ". " + A + " " + G[0] + ", " + B + " " + G[1] + ", " + both + " " + bothWord + ". The question mark is on " + (askNeither ? "the people who do neither" : "the people in the first group only") + ".",
      prompt: fr
        ? "Dans un groupe de " + N + " personnes, " + A + " " + G[0] + " et " + B + " " + G[1] + ", et " + both + " " + bothWord + ". Combien d'entre elles " + (askNeither ? G[5] : G[2]) + " ?"
        : "In a group of " + N + " people, " + A + " " + G[0] + " and " + B + " " + G[1] + ", and " + both + " " + bothWord + ". How many " + (askNeither ? G[5] : G[2]) + "?",
      show: "",
      options: opts.map(String),
      answer: String(answer),
      explain: fr
        ? (askNeither
          ? whoBothFr + (A === B ? " dans chacun des deux groupes de " + A : " dans les " + A + " et dans les " + B) + ". Celles qui sont dans au moins l'un des deux groupes sont donc au nombre de " + A + " + " + B + " − " + both + " = " + (A + B - both) + ", et il en reste " + N + " − " + (A + B - both) + " = " + neither + ". Le total et l'autre groupe n'étaient là que pour distraire."
          : whoBothFr + " dans les " + A + ". " + (both === 1 ? "Retire-la" : "Retire-les") + " : " + A + " − " + both + " = " + onlyA + ". Le total de " + N + " et les " + B + " de l'autre groupe ne servaient à rien.")
        : (askNeither
          ? whoBothEn + (A === B ? " in each of the two groups of " + A : " inside the " + A + " and inside the " + B) + ". So the people in at least one of the two groups are " + A + " + " + B + " − " + both + " = " + (A + B - both) + ", leaving " + N + " − " + (A + B - both) + " = " + neither + "."
          : whoBothEn + " inside the " + A + ". Take " + (both === 1 ? "that one" : "them") + " out: " + A + " − " + both + " = " + onlyA + ". The total of " + N + " and the " + B + " in the other group were only there to distract."),
      trains: fr ? "ne pas compter deux fois ce qui appartient à deux groupes" : "not counting twice what belongs to two groups"
    };
  }

  /* ========================================================== DIRECTION
     Face one way, turn a few times, say where you face. Nothing to see, so
     it has to be done in the head — and "turn around" is the step everyone
     rushes. Three identical turns in a row are redrawn: they are a reflex,
     not a puzzle. */
  var DIRS = { en: ["north", "east", "south", "west"], fr: ["le nord", "l'est", "le sud", "l'ouest"] };
  var TURNS = { en: ["Turn left.", "Turn right.", "Turn around to face the other way."], fr: ["Tourne à gauche.", "Tourne à droite.", "Fais demi-tour."] };
  function makeCompass(seed, lang) {
    var r = rng(seed), fr = FR(lang), D = fr ? DIRS.fr : DIRS.en, T = fr ? TURNS.fr : TURNS.en;
    var facing = int(r, 0, 3), start = facing, count = int(r, 3, 5), kinds = [];
    for (var i = 0; i < count; i++) {
      var t = int(r, 0, 2);
      if (i >= 2 && kinds[i - 1] === t && kinds[i - 2] === t) t = (t + 1 + int(r, 0, 1)) % 3;
      kinds.push(t);
    }
    var turns = [], trail = [D[start]];
    kinds.forEach(function (t) {
      facing = (facing + (t === 0 ? 3 : t === 1 ? 1 : 2)) % 4;
      turns.push(T[t]);
      trail.push(D[facing]);
    });
    var answer = cap(D[facing]);
    var lefts = kinds.filter(function (t) { return t === 0; }).length, rights = kinds.filter(function (t) { return t === 1; }).length, arounds = kinds.filter(function (t) { return t === 2; }).length;
    var tip = fr
      ? " Un raccourci : un tour à gauche et un tour à droite s'annulent, et deux demi-tours aussi."
      : " A shortcut: a left and a right cancel each other out, and so do two turn-arounds.";
    var applies = (lefts && rights) || arounds >= 2;
    return {
      family: "direction", form: "turns",
      /* the rose with the starting arrow and one glyph per turn; the final facing is never drawn */
      scene: { kind: "compass", start: start, turns: kinds.slice() },
      sceneLabels: { dirs: fr ? ["N", "E", "S", "O"] : ["N", "E", "S", "W"] },
      sceneText: (fr ? "Une boussole. Tu regardes vers " + D[start] + ". Tours : " : "A compass. You face " + D[start] + ". Turns: ") + kinds.map(function (t) { return fr ? (t === 0 ? "à gauche" : t === 1 ? "à droite" : "demi-tour") : (t === 0 ? "left" : t === 1 ? "right" : "around"); }).join(", ") + ".",
      prompt: (fr ? "Tu regardes vers " + D[start] + ". " : "You are facing " + D[start] + ". ") + turns.join(" ") + (fr ? " Dans quelle direction regardes-tu maintenant ?" : " Which way are you facing now?"),
      show: "",
      options: shuffle(r, D.map(cap)),
      answer: answer,
      explain: (fr ? "Pas à pas : " : "Step by step: ") + trail.join(" → ") + "." + (applies ? tip : ""),
      trains: fr ? "garder son orientation en tête au fil de plusieurs changements" : "holding an orientation in your head through several changes"
    };
  }

  /* ========================================== ESTIMATION, hand-written
     Fermi problems. There is no looking this up: the whole exercise is
     building an answer out of things you already roughly know. The "answer"
     is a band, and the explanation is the reasoning, because the reasoning is
     the point and the number is not. Each carries its French beside it. */
  var FERMI = [
    { en: { q: "Roughly how many times does a human heart beat in one lifetime?", band: "About 2 to 3 billion",
            opts: ["About 2 to 3 billion", "About 2 to 3 million", "About 200 million", "About 20 billion"],
            how: "Around 70 beats a minute is about 100,000 a day, about 37 million a year. Multiply by a lifetime of roughly 75 years and you land near 2.7 billion." },
      fr: { q: "À peu près combien de fois un cœur humain bat-il en une vie ?", band: "Environ 2 à 3 milliards",
            opts: ["Environ 2 à 3 milliards", "Environ 2 à 3 millions", "Environ 200 millions", "Environ 20 milliards"],
            how: "Autour de 70 battements par minute, c'est environ 100 000 par jour, à peu près 37 millions par an. Sur une vie d'environ 75 ans, on arrive à près de 2,7 milliards." } },
    { en: { q: "Roughly how many words does a person speak in a day?", band: "Roughly 15,000",
            opts: ["Roughly 15,000", "Roughly 1,500", "Roughly 150,000", "Roughly 500"],
            how: "Speaking runs at roughly 120 words a minute. Two hours of actual talking spread across a day is 120 minutes, so about 14,000 — call it 15,000. Studies disagree on the exact figure; the method is the point." },
      fr: { q: "À peu près combien de mots une personne prononce-t-elle en une journée ?", band: "À peu près 15 000",
            opts: ["À peu près 15 000", "À peu près 1 500", "À peu près 150 000", "À peu près 500"],
            how: "On parle à raison d'environ 120 mots par minute. Deux heures de parole réelle réparties sur la journée font 120 minutes, soit environ 14 000 — disons 15 000. Les études divergent sur le chiffre exact ; c'est la méthode qui compte." } },
    { en: { q: "Roughly how many piano tuners work in a city of 5 million people?", band: "Around 100",
            opts: ["Around 100", "Around 10", "Around 1,000", "Around 10,000"],
            how: "Perhaps one household in fifty has a piano, so 5 million people is maybe 40,000 pianos. Tuned once a year, and one tuner handles perhaps 400 a year, that is about 100 tuners." },
      fr: { q: "À peu près combien d'accordeurs de piano travaillent dans une ville de 5 millions d'habitants ?", band: "Environ 100",
            opts: ["Environ 100", "Environ 10", "Environ 1 000", "Environ 10 000"],
            how: "Un foyer sur cinquante a peut-être un piano : 5 millions d'habitants, c'est peut-être 40 000 pianos. À un accordage par an et 400 pianos par accordeur et par an, cela fait environ 100 accordeurs." } },
    { en: { q: "Roughly how much does all the air inside an ordinary room weigh?", band: "About 60 kilograms",
            opts: ["About 60 kilograms", "About 600 grams", "About 6 kilograms", "About 600 kilograms"],
            how: "A room 5m by 4m by 2.5m is 50 cubic metres. Air weighs about 1.2 kg per cubic metre. That is 60 kg — roughly a person." },
      fr: { q: "À peu près combien pèse tout l'air d'une pièce ordinaire ?", band: "Environ 60 kilos",
            opts: ["Environ 60 kilos", "Environ 600 grammes", "Environ 6 kilos", "Environ 600 kilos"],
            how: "Une pièce de 5 m sur 4 sur 2,5 fait 50 mètres cubes. L'air pèse environ 1,2 kg par mètre cube. Cela fait 60 kg — à peu près le poids d'une personne." } },
    { en: { q: "Roughly how many hairs are on an average human head?", band: "About 100,000",
            opts: ["About 100,000", "About 10,000", "About 1 million", "About 5,000"],
            how: "Hair grows at roughly 200 per square centimetre, and a scalp is around 500 square centimetres. That is about 100,000." },
      fr: { q: "À peu près combien de cheveux y a-t-il sur une tête humaine ?", band: "Environ 100 000",
            opts: ["Environ 100 000", "Environ 10 000", "Environ 1 million", "Environ 5 000"],
            how: "On compte environ 200 cheveux par centimètre carré, et un cuir chevelu fait autour de 500 centimètres carrés. Cela fait environ 100 000." } },
    { en: { q: "Roughly how far does a car tyre travel before it wears out?", band: "About 50,000 kilometres",
            opts: ["About 50,000 kilometres", "About 5,000 kilometres", "About 500,000 kilometres", "About 2,000 kilometres"],
            how: "Tyres are usually replaced somewhere between 40,000 and 60,000 km — about the distance round the Earth once." },
      fr: { q: "À peu près quelle distance un pneu de voiture parcourt-il avant d'être usé ?", band: "Environ 50 000 kilomètres",
            opts: ["Environ 50 000 kilomètres", "Environ 5 000 kilomètres", "Environ 500 000 kilomètres", "Environ 2 000 kilomètres"],
            how: "Les pneus sont en général remplacés entre 40 000 et 60 000 km — à peu près le tour de la Terre." } },
    { en: { q: "Roughly how many breaths does a person take in a year?", band: "About 8 million",
            opts: ["About 8 million", "About 800,000", "About 80 million", "About 80,000"],
            how: "About 15 breaths a minute is 900 an hour, roughly 21,600 a day. Times 365 gives just under 8 million." },
      fr: { q: "À peu près combien de fois une personne respire-t-elle en un an ?", band: "Environ 8 millions",
            opts: ["Environ 8 millions", "Environ 800 000", "Environ 80 millions", "Environ 80 000"],
            how: "Environ 15 respirations par minute font 900 par heure, à peu près 21 600 par jour. Multiplié par 365, cela fait un peu moins de 8 millions." } },
    { en: { q: "Roughly how many grains of rice are in one kilogram?", band: "About 50,000",
            opts: ["About 50,000", "About 5,000", "About 500,000", "About 1,000"],
            how: "A grain of rice weighs around 20 milligrams. A kilogram is a million milligrams, so about 50,000 grains." },
      fr: { q: "À peu près combien de grains de riz y a-t-il dans un kilo ?", band: "Environ 50 000",
            opts: ["Environ 50 000", "Environ 5 000", "Environ 500 000", "Environ 1 000"],
            how: "Un grain de riz pèse autour de 20 milligrammes. Un kilo fait un million de milligrammes, donc environ 50 000 grains." } },
    /* --- added 17 Sep 2026 --- */
    { en: { q: "Roughly how much water does a person drink over a lifetime?", band: "About 50,000 litres",
            opts: ["About 50,000 litres", "About 5,000 litres", "About 500,000 litres", "About 500 litres"],
            how: "Call it 2 litres a day. That is about 730 litres a year, and over 75 years about 55,000 litres — a small swimming pool." },
      fr: { q: "À peu près combien d'eau une personne boit-elle au cours de sa vie ?", band: "Environ 50 000 litres",
            opts: ["Environ 50 000 litres", "Environ 5 000 litres", "Environ 500 000 litres", "Environ 500 litres"],
            how: "Disons 2 litres par jour. Cela fait environ 730 litres par an, et sur 75 ans environ 55 000 litres — une petite piscine." } },
    { en: { q: "Roughly how many steps does a person walk in a year?", band: "About 2 million",
            opts: ["About 2 million", "About 200,000", "About 20 million", "About 20,000"],
            how: "An ordinary day is somewhere around 5,000 steps. Times 365 is a little over 1.8 million — and guess 3,000 or 8,000 a day instead, you still land nearest 2 million. That is the point: a rough anchor is enough when the options are ten times apart." },
      fr: { q: "À peu près combien de pas une personne fait-elle en un an ?", band: "Environ 2 millions",
            opts: ["Environ 2 millions", "Environ 200 000", "Environ 20 millions", "Environ 20 000"],
            how: "Une journée ordinaire, c'est autour de 5 000 pas. Multiplié par 365, cela fait un peu plus de 1,8 million — et même avec 3 000 ou 8 000 pas par jour, la réponse la plus proche reste 2 millions. C'est tout l'intérêt : un ordre de grandeur suffit quand chaque réponse proposée vaut dix fois la précédente." } },
    { en: { q: "Roughly how many hours does a person spend asleep over a lifetime?", band: "About 200,000 hours",
            opts: ["About 200,000 hours", "About 20,000 hours", "About 2 million hours", "About 2,000 hours"],
            how: "About 8 hours a night is roughly 2,900 hours a year. Over 75 years that is about 220,000 hours — a quarter of a century spent asleep." },
      fr: { q: "À peu près combien d'heures une personne passe-t-elle à dormir au cours de sa vie ?", band: "Environ 200 000 heures",
            opts: ["Environ 200 000 heures", "Environ 20 000 heures", "Environ 2 millions d'heures", "Environ 2 000 heures"],
            how: "Environ 8 heures par nuit, c'est à peu près 2 900 heures par an. Sur 75 ans, environ 220 000 heures — un quart de siècle passé à dormir." } },
    { en: { q: "Roughly how many times does a person blink in a day?", band: "About 15,000",
            opts: ["About 15,000", "About 1,500", "About 150,000", "About 150"],
            how: "Around 15 blinks a minute, for about 16 waking hours. That is 15 × 60 × 16, about 14,000 — call it 15,000." },
      fr: { q: "À peu près combien de fois une personne cligne-t-elle des yeux en une journée ?", band: "Environ 15 000",
            opts: ["Environ 15 000", "Environ 1 500", "Environ 150 000", "Environ 150"],
            how: "Autour de 15 clignements par minute, pendant environ 16 heures d'éveil. Cela fait 15 × 60 × 16, environ 14 000 — disons 15 000." } },
    { en: { q: "Roughly how much blood does a human heart pump in a day?", band: "About 7,000 litres",
            opts: ["About 7,000 litres", "About 700 litres", "About 70 litres", "About 70,000 litres"],
            how: "At rest the heart moves about 5 litres a minute. A day has 1,440 minutes, so about 7,200 litres — a small road tanker." },
      fr: { q: "À peu près combien de sang un cœur humain pompe-t-il en une journée ?", band: "Environ 7 000 litres",
            opts: ["Environ 7 000 litres", "Environ 700 litres", "Environ 70 litres", "Environ 70 000 litres"],
            how: "Au repos, le cœur fait circuler environ 5 litres par minute. Une journée compte 1 440 minutes, donc environ 7 200 litres — un petit camion-citerne." } },
    { en: { q: "Roughly how many leaves are on a big, mature oak tree?", band: "About 200,000",
            opts: ["About 200,000", "About 20,000", "About 2,000", "About 2 million"],
            how: "A crown 15 metres across shades about 180 square metres of ground. Look up through a leafy tree and you see several leaves stacked over any point — call it five layers — so about 900 square metres of leaf. At 50 square centimetres a leaf, that is around 180,000." },
      fr: { q: "À peu près combien de feuilles porte un grand chêne adulte ?", band: "Environ 200 000",
            opts: ["Environ 200 000", "Environ 20 000", "Environ 2 000", "Environ 2 millions"],
            how: "Une couronne de 15 mètres de large ombrage environ 180 mètres carrés de sol. Lève les yeux sous un arbre bien feuillu : plusieurs feuilles se superposent au-dessus de chaque point — disons cinq couches — soit environ 900 mètres carrés de feuillage. À 50 centimètres carrés la feuille, cela fait autour de 180 000." } },
    { en: { q: "Roughly how long would it take to count to a million out loud, one number a second, without stopping?", band: "About 12 days",
            opts: ["About 12 days", "About 12 hours", "About 12 weeks", "About 12 months"],
            how: "A day has 86,400 seconds. A million divided by 86,400 is about 11.6 — so nearly twelve days, with no sleep. (Big numbers take longer than a second to say, so the real figure is higher still.)" },
      fr: { q: "À peu près combien de temps faudrait-il pour compter jusqu'à un million à voix haute, un nombre par seconde, sans s'arrêter ?", band: "Environ 12 jours",
            opts: ["Environ 12 jours", "Environ 12 heures", "Environ 12 semaines", "Environ 12 mois"],
            how: "Une journée compte 86 400 secondes. Un million divisé par 86 400 fait environ 11,6 — donc près de douze jours, sans dormir. (On met plus d'une seconde à prononcer les grands nombres, alors le vrai chiffre est encore plus élevé.)" } },
    { en: { q: "Roughly how many words are in a typical 300-page novel?", band: "About 90,000",
            opts: ["About 90,000", "About 40,000", "About 200,000", "About 9,000"],
            how: "A printed page holds around 300 words. Three hundred pages of that is about 90,000." },
      fr: { q: "À peu près combien de mots contient un roman ordinaire de 300 pages ?", band: "Environ 90 000",
            opts: ["Environ 90 000", "Environ 40 000", "Environ 200 000", "Environ 9 000"],
            how: "Une page imprimée contient autour de 300 mots. Trois cents pages de ce genre, cela fait environ 90 000." } },
    { en: { q: "A fair-weather cloud about a kilometre across holds about half a gram of water in every cubic metre. Roughly how much does the whole cloud weigh?", band: "About 500 tonnes",
            opts: ["About 500 tonnes", "About 500 kilograms", "About 5 tonnes", "About 500,000 tonnes"],
            how: "A cloud a kilometre in each direction is a billion cubic metres. Half a gram a billion times is 500,000 kilograms — 500 tonnes, floating because that water is spread through an enormous volume of air." },
      fr: { q: "Un nuage de beau temps d'environ un kilomètre de large contient à peu près un demi-gramme d'eau par mètre cube. À peu près combien pèse le nuage entier ?", band: "Environ 500 tonnes",
            opts: ["Environ 500 tonnes", "Environ 500 kilos", "Environ 5 tonnes", "Environ 500 000 tonnes"],
            how: "Un nuage d'un kilomètre dans chaque direction fait un milliard de mètres cubes. Un demi-gramme multiplié par un milliard, c'est 500 000 kilos — 500 tonnes, qui tiennent en l'air parce que cette eau est dispersée dans un volume d'air immense." } },
    { en: { q: "Roughly how many times does the Earth turn on its axis during one human lifetime?", band: "About 27,000",
            opts: ["About 27,000", "About 9,000", "About 75,000", "About 270,000"],
            how: "Once a day. Around 365 days a year for about 75 years is a little over 27,000 turns." },
      fr: { q: "À peu près combien de fois la Terre tourne-t-elle sur elle-même au cours d'une vie humaine ?", band: "Environ 27 000",
            opts: ["Environ 27 000", "Environ 9 000", "Environ 75 000", "Environ 270 000"],
            how: "Une fois par jour. Autour de 365 jours par an pendant environ 75 ans, cela fait un peu plus de 27 000 tours." } }
  ];

  /* ===================================== LATERAL THINKING, hand-written
     The answer is obvious only afterwards, and that lurch is the whole
     experience. Generated puzzles cannot do this — the surprise has to be
     designed — so this family is finite and written by hand, exactly as the
     roadmap says. Every one is written to work in French as well as English:
     a puzzle that only works in one language is not a Qpio puzzle. The
     options are kept short, so the right one is never the only one that
     explains itself (a panel finding, 17 Sep). */
  var LATERAL = [
    { en: { q: "A man lives on the tenth floor. Every morning he takes the lift down. Coming home he takes it to the seventh floor and walks the rest — except on rainy days, when he rides all the way. Why?",
            a: "He is short and can only reach the button for the seventh floor",
            opts: ["He is short and can only reach the button for the seventh floor", "He wants the exercise", "The lift is broken above the seventh floor", "He visits a neighbour on the seventh floor"],
            why: "On rainy days he has an umbrella, and he uses it to press the higher button. Everything in the puzzle points at the lift; the answer is about his arm." },
      fr: { q: "Un homme habite au dixième étage. Chaque matin, il prend l'ascenseur pour descendre. En rentrant, il monte jusqu'au septième et finit à pied — sauf les jours de pluie, où il monte jusqu'en haut. Pourquoi ?",
            a: "Il est petit et n'atteint que le bouton du septième",
            opts: ["Il est petit et n'atteint que le bouton du septième", "Il veut faire de l'exercice", "L'ascenseur est en panne au-dessus du septième", "Il rend visite à un voisin du septième"],
            why: "Les jours de pluie, il a un parapluie, et il s'en sert pour appuyer sur le bouton du dixième. Tout dans l'énigme pointe vers l'ascenseur ; la réponse, elle, tient à la longueur de son bras." } },
    { en: { q: "Two people are born at the same moment to the same mother, on the same day, in the same place — and they are not twins. How?",
            a: "They are two of a set of triplets",
            opts: ["They are two of a set of triplets", "They were adopted", "One was born a year later", "They have different fathers"],
            why: "'Not twins' invites you to break the birth, when the thing to break is the number two." },
      fr: { q: "Deux personnes naissent au même instant, de la même mère, le même jour, au même endroit — et ce ne sont pas des jumeaux. Comment ?",
            a: "Ce sont deux triplés",
            opts: ["Ce sont deux triplés", "Elles ont été adoptées", "L'une est née un an plus tard", "Elles ont des pères différents"],
            why: "« Pas des jumeaux » te pousse à remettre en cause la naissance, alors que ce qu'il faut remettre en cause, c'est le chiffre deux." } },
    { en: { q: "A woman shoots her husband, holds him under water for five minutes, then hangs him. Twenty minutes later they go out to dinner together. How?",
            a: "She is a photographer developing a picture",
            opts: ["She is a photographer developing a picture", "He survived the attack", "It was a dream", "She hired an actor"],
            why: "Every verb has a second, ordinary meaning. The puzzle works because you take the first one." },
      fr: { q: "Une femme tire sur son mari, le plonge cinq minutes dans l'eau, puis le pend. Vingt minutes plus tard, ils sortent dîner ensemble. Comment ?",
            a: "Elle est photographe et développe une photo",
            opts: ["Elle est photographe et développe une photo", "Il a survécu à l'attaque", "C'était un rêve", "Elle a engagé un acteur"],
            why: "Chaque verbe a un second sens, tout à fait ordinaire — celui du labo photo : on tire une épreuve, on la plonge dans le bain, on la pend pour la faire sécher. L'énigme marche parce qu'on prend le premier sens." } },
    { en: { q: "A farmer has 17 sheep. All but 9 run away. How many are left?",
            a: "9", opts: ["9", "8", "17", "0"],
            why: "'All but 9 run away' means 9 stayed. The subtraction you reach for is the trap." },
      fr: { q: "Un fermier a 17 moutons. Tous sauf 9 s'enfuient. Combien en reste-t-il ?",
            a: "9", opts: ["9", "8", "17", "0"],
            why: "« Tous sauf 9 s'enfuient » veut dire que 9 sont restés. La soustraction qu'on a le réflexe de faire est le piège." } },
    { en: { q: "You are in a race and you overtake the person in second place. What position are you in now?",
            a: "Second", opts: ["Second", "First", "Third", "It depends on the number of runners"],
            why: "You took their place, not the leader's. Almost everyone says first, once." },
      fr: { q: "Tu es dans une course et tu doubles le deuxième. À quelle place es-tu maintenant ?",
            a: "Deuxième", opts: ["Deuxième", "Première", "Troisième", "Cela dépend du nombre de coureurs"],
            why: "Tu as pris sa place, pas celle de la première. Presque tout le monde répond « première » la première fois." } },
    { en: { q: "A doctor gives you three pills and says take one every half hour. How long until you have taken them all?",
            a: "One hour", opts: ["One hour", "One and a half hours", "Half an hour", "Three hours"],
            why: "You take the first one now. The gaps between three pills are two, not three." },
      fr: { q: "Un médecin te donne trois comprimés et te dit d'en prendre un toutes les demi-heures. Au bout de combien de temps les auras-tu tous pris ?",
            a: "Une heure", opts: ["Une heure", "Une heure et demie", "Une demi-heure", "Trois heures"],
            why: "Tu prends le premier tout de suite. Entre trois comprimés il y a deux intervalles, pas trois." } },
    { en: { q: "Some months have 31 days. How many have 28?",
            a: "All twelve", opts: ["All twelve", "One", "Four", "Eleven"],
            why: "Every month has a 28th day. The question never said 'only'." },
      fr: { q: "Certains mois ont 31 jours. Combien en ont 28 ?",
            a: "Tous les douze", opts: ["Tous les douze", "Un", "Quatre", "Onze"],
            why: "Chaque mois a un 28e jour. La question n'a jamais dit « seulement »." } },
    { en: { q: "A man pushes his car to a hotel and tells the owner he is bankrupt. Why?",
            a: "He is playing Monopoly", opts: ["He is playing Monopoly", "His car broke down", "He lost his job", "He is being robbed"],
            why: "Each detail is true and the frame is wrong. Once you see the board you cannot unsee it." },
      fr: { q: "Un homme pousse sa voiture jusqu'à un hôtel et dit au propriétaire qu'il est ruiné. Pourquoi ?",
            a: "Il joue au Monopoly", opts: ["Il joue au Monopoly", "Sa voiture est tombée en panne", "Il a perdu son travail", "On le dévalise"],
            why: "Chaque détail est vrai et le cadre est faux. Une fois qu'on a vu le plateau, on ne voit plus que lui." } },
    { en: { q: "What can travel around the world while staying in a corner?",
            a: "A stamp", opts: ["A stamp", "The wind", "A shadow", "A satellite"],
            why: "'Corner' is doing two jobs — a place to stay and a place on an envelope." },
      fr: { q: "Qu'est-ce qui peut faire le tour du monde en restant dans un coin ?",
            a: "Un timbre", opts: ["Un timbre", "Le vent", "Une ombre", "Un satellite"],
            why: "« Coin » a deux sens : un endroit où l'on reste, et le coin d'une enveloppe." } },
    /* "Forward I am heavy, backward I am not" was an English word-play (ton /
       not) with no French form. Replaced 17 Sep 2026 — the panel's finding
       and the standing rule agree: every puzzle exists in every live language. */
    { en: { q: "If you have it, you want to share it. If you share it, you no longer have it. What is it?",
            a: "A secret", opts: ["A secret", "A cold", "A photograph", "Good news"],
            why: "The two halves describe the same act from two sides. The only thing sharing destroys is the fact that nobody else knows." },
      fr: { q: "Si tu l'as, tu veux le partager. Si tu le partages, tu ne l'as plus. Qu'est-ce que c'est ?",
            a: "Un secret", opts: ["Un secret", "Un rhume", "Un souvenir", "Un potin"],
            why: "Les deux moitiés décrivent le même geste vu des deux côtés. La seule chose que le partage détruit, c'est le fait que personne d'autre ne le sache." } },
    /* --- added 17 Sep 2026 --- */
    { en: { q: "Two fathers and two sons go fishing. Each catches exactly one fish, yet only three fish are caught. How?",
            a: "A grandfather, his son and his grandson",
            opts: ["A grandfather, his son and his grandson", "A father and his two sons", "Two brothers and their father", "Four friends who share a boat"],
            why: "'Two fathers' and 'two sons' describe three people, because the man in the middle is both a father and a son." },
      fr: { q: "Deux pères et deux fils vont à la pêche. Chacun attrape exactement un poisson, et pourtant il n'y a que trois poissons en tout. Comment ?",
            a: "Un grand-père, son fils et son petit-fils",
            opts: ["Un grand-père, son fils et son petit-fils", "Un père et ses deux fils", "Deux frères et leur père", "Quatre amis dans le même bateau"],
            why: "« Deux pères » et « deux fils » décrivent trois personnes, parce que l'homme du milieu est à la fois père et fils." } },
    { en: { q: "You are running a race on a straight course and you overtake the runner in last place. What position are you in now?",
            a: "It cannot happen",
            opts: ["It cannot happen", "Last", "Second to last", "First"],
            why: "To overtake someone you have to be behind them, and nobody is behind the person in last place. On a straight course there is no way round it: you were not in the race." },
      fr: { q: "Pendant une course en ligne droite, tu doubles le dernier coureur. À quelle place es-tu maintenant ?",
            a: "C'est impossible",
            opts: ["C'est impossible", "Dernière", "Avant-dernière", "Première"],
            why: "Pour doubler quelqu'un, il faut être derrière lui, et personne n'est derrière le dernier. En ligne droite, pas d'échappatoire : tu n'étais pas dans la course." } },
    /* the coin puzzle ("two coins add up to 30, one is not a 20") was replaced
       17 Sep: with four options on screen, "two 15s" also fits every word of
       it — a panel finding. This one has one answer in both languages. */
    { en: { q: "An explorer builds a hut whose every window looks south. One morning a bear ambles past. What colour is the bear?",
            a: "White", opts: ["White", "Brown", "Black", "You can't tell"],
            why: "Every window can look south only at the North Pole, where every direction is south. The only bears there are polar bears." },
      fr: { q: "Un explorateur construit une cabane dont chaque fenêtre donne au sud. Un matin, un ours passe devant. De quelle couleur est l'ours ?",
            a: "Blanc", opts: ["Blanc", "Brun", "Noir", "On ne peut pas savoir"],
            why: "Toutes les fenêtres ne peuvent donner au sud qu'au pôle Nord, où toutes les directions sont le sud. Les seuls ours qui y vivent sont les ours polaires." } },
    { en: { q: "In a shop, a customer asks: \"How much for one?\" \"Twenty.\" \"And for twelve?\" \"Forty.\" \"And for a hundred and twelve?\" \"Sixty.\" What is she buying?",
            a: "House numbers", opts: ["House numbers", "Lottery tickets", "Stamps", "Bus tickets"],
            why: "The price is twenty per digit: one digit, two digits, three digits. She is buying the numbers for her front door." },
      fr: { q: "Dans une boutique, une cliente demande : « Combien pour un ? » « Vingt. » « Et pour douze ? » « Quarante. » « Et pour cent douze ? » « Soixante. » Qu'achète-t-elle ?",
            a: "Des numéros de maison", opts: ["Des numéros de maison", "Des billets de loterie", "Des timbres", "Des tickets de bus"],
            why: "Le prix est de vingt par chiffre : un chiffre, deux chiffres, trois chiffres. Elle achète les chiffres de sa porte d'entrée." } },
    { en: { q: "A rope ladder hangs over the side of a ship, its bottom rung just touching the water. The rungs are 30 cm apart. The tide rises 90 cm. How many rungs are now under water?",
            a: "None", opts: ["None", "Three", "Two", "One"],
            why: "The ladder is attached to the ship, and the ship floats. Everything rises together. The arithmetic was a decoy." },
      fr: { q: "Une échelle de corde pend sur le flanc d'un navire, le barreau du bas effleurant l'eau. Les barreaux sont espacés de 30 cm. La marée monte de 90 cm. Combien de barreaux sont maintenant sous l'eau ?",
            a: "Aucun", opts: ["Aucun", "Trois", "Deux", "Un"],
            why: "L'échelle est accrochée au navire, et le navire flotte. Tout monte ensemble. Le calcul était un leurre." } },
    { en: { q: "What gets wetter the more it dries?",
            a: "A towel", opts: ["A towel", "A raincoat", "A river", "The rain"],
            why: "'Dries' is doing two jobs: what the towel does to you, and what happens to the towel." },
      fr: { q: "Qu'est-ce qui se mouille en séchant ?",
            a: "Une serviette", opts: ["Une serviette", "Un imperméable", "Une rivière", "La pluie"],
            why: "« Sécher » a deux sens : ce que la serviette te fait, et ce qui arrive à la serviette." } },
    { en: { q: "A bus driver goes the wrong way down a one-way street, passes three police officers, and none of them stops him. Why?",
            a: "He was walking", opts: ["He was walking", "The bus was empty", "It was the middle of the night", "The street had just changed direction"],
            why: "'Bus driver' is his job, not what he was doing. Nothing says he was driving." },
      fr: { q: "Un chauffeur de bus prend une rue à sens unique à contresens, passe devant trois policiers, et aucun ne l'arrête. Pourquoi ?",
            a: "Il est à pied", opts: ["Il est à pied", "Le bus est vide", "C'est en pleine nuit", "La rue vient de changer de sens"],
            why: "« Chauffeur de bus » est son métier, pas ce qu'il est en train de faire. Rien ne dit qu'il conduit." } },
    { en: { q: "Before Mount Everest was measured and given that name, what was the highest mountain on Earth?",
            a: "Mount Everest", opts: ["Mount Everest", "K2", "Kilimanjaro", "Nobody can know"],
            why: "Measuring a mountain does not make it taller. It was there, and it was the highest, long before the survey of 1856 — the people living beside it already called it Chomolungma and Sagarmatha." },
      fr: { q: "Avant que l'Everest ne soit mesuré et ne reçoive ce nom, quelle était la plus haute montagne du monde ?",
            a: "L'Everest", opts: ["L'Everest", "Le K2", "Le Kilimandjaro", "Personne ne peut le savoir"],
            why: "Mesurer une montagne ne la rend pas plus haute. Elle était là, et elle était la plus haute, bien avant le relevé de 1856 — les peuples qui vivent à ses pieds l'appelaient déjà Chomolungma et Sagarmatha." } },
    { en: { q: "A man looks at a portrait and says: \"I have no brothers or sisters, but that man's father is my father's son.\" Who is in the portrait?",
            a: "His son", opts: ["His son", "Himself", "His father", "His nephew"],
            why: "'My father's son', for a man with no siblings, is the man himself. So the man in the portrait is someone whose father is the speaker — his son." },
      fr: { q: "Un homme regarde un portrait et dit : « Je n'ai ni frère ni sœur, mais le père de cet homme est le fils de mon père. » Qui est sur le portrait ?",
            a: "Son fils", opts: ["Son fils", "Lui-même", "Son père", "Son neveu"],
            why: "« Le fils de mon père », pour un homme sans frère ni sœur, c'est lui-même. L'homme du portrait a donc pour père celui qui parle — c'est son fils." } },
    { en: { q: "Three switches in a corridor control one old-style light bulb in a closed room, and no light shows from outside. You may do what you like with the switches, but you may open the door only once. How do you find out which switch works the bulb?",
            a: "Hold a hand near the bulb to feel if it is warm", opts: ["Hold a hand near the bulb to feel if it is warm", "Listen for a click", "Count the switches", "It cannot be done with one look"],
            why: "Turn the first switch on for a few minutes, then off; turn the second on; open the door. Lit means the second switch, warm means the first, cold and dark means the third. The bulb gives two kinds of evidence, and everyone looks for only one." },
      fr: { q: "Trois interrupteurs dans un couloir commandent une seule ampoule à l'ancienne dans une pièce fermée, et aucune lumière ne filtre à l'extérieur. Tu peux faire ce que tu veux avec les interrupteurs, mais tu ne peux ouvrir la porte qu'une seule fois. Comment savoir quel interrupteur commande l'ampoule ?",
            a: "Approcher la main de l'ampoule pour sentir si elle est chaude", opts: ["Approcher la main de l'ampoule pour sentir si elle est chaude", "Écouter s'il y a un déclic", "Compter les interrupteurs", "Impossible en un seul coup d'œil"],
            why: "Allume le premier interrupteur quelques minutes, puis éteins-le ; allume le deuxième ; ouvre la porte. Allumée : c'est le deuxième. Chaude : c'est le premier. Froide et éteinte : c'est le troisième. L'ampoule donne deux sortes d'indices, et tout le monde n'en cherche qu'une." } }
  ];

  function makeHand(bank, familyKey, trainsEn, trainsFr) {
    return function (seed, lang) {
      var r = rng(seed), fr = FR(lang);
      var idx = Math.floor(r() * bank.length);
      var item = bank[idx], t = fr ? item.fr : item.en;
      /* the order is drawn once, on indices, so both languages show the same
         choices in the same places */
      var order = shuffle(r, [0, 1, 2, 3]);
      var options = order.map(function (i) { return t.opts[i]; });
      var answer = t.band !== undefined ? t.band : t.a;
      return { family: familyKey, form: "#" + idx, prompt: t.q, show: "", options: options, answer: answer,
               explain: t.how || t.why, trains: fr ? trainsFr : trainsEn, handWrittenIndex: idx,
               /* an estimation carries one emoji as its picture (never a flag: Windows has none); a lateral riddle
                  deliberately carries no picture — any drawing would spoil the lurch or mislead on purpose */
               icon: bank === FERMI ? FERMI_ICONS[idx] : undefined };
    };
  }
  var FERMI_ICONS = ["❤️", "💬", "🎹", "🚪", "💇", "🛞", "🫁", "🍚", "💧", "👣", "😴", "👁️", "🩸", "🌳", "🔢", "📖", "☁️", "🌍"];

  /* ================================================================= SPOT
     Sixteen tiles, one different. Tap it. CEO, 21 Sep 2026: "games where we
     pay attention to details, for example find an object in an image". The
     difference is one attribute — a turn, a fill, a missing dot — or, in the
     hardest form, the one tile that has BOTH the named shape and the named
     colour while every other tile has one or the other. The shape word is
     always in the prompt, so no form rests on colour alone. Cells are named
     by row letter and column number, the same in both languages. */
  var TILE_SHAPES = ["tri", "ring", "sq", "arrow", "star", "dia"];
  var ASYM_TILES = ["tri", "nsq", "arrow"];          /* a quarter turn shows */
  var CELL_IDS = (function () { var ids = [], rows = "ABCD".split(""), i, c; for (i = 0; i < rows.length; i++) for (c = 1; c <= 4; c++) ids.push(rows[i] + c); return ids; })();
  var SHAPE_WORDS = { en: { tri: "triangle", ring: "ring", sq: "square", nsq: "square", arrow: "arrow", star: "star", dia: "diamond" },
                      fr: { tri: "triangle", ring: "anneau", sq: "carré", nsq: "carré", arrow: "flèche", star: "étoile", dia: "losange" } };
  var SHAPE_FEM = { arrow: true, star: true };        /* French gender of the shape words */
  var COLOUR_WORDS = { en: ["blue", "red", "yellow", "green", "violet"], frM: ["bleu", "rouge", "jaune", "vert", "violet"], frF: ["bleue", "rouge", "jaune", "verte", "violette"] };
  var DIR_WORDS = { en: { 0: "pointing up", 90: "pointing right", 180: "pointing down", 270: "pointing left" }, fr: { 0: "vers le haut", 90: "vers la droite", 180: "vers le bas", 270: "vers la gauche" } };
  var ORDINALS = { en: ["first", "second", "third", "fourth"], fr: ["première", "deuxième", "troisième", "quatrième"] };
  function cellWords(cellIdx, cols, fr) {
    var row = Math.floor(cellIdx / cols), col = cellIdx % cols;
    return fr ? "rangée " + (row + 1) + ", " + ORDINALS.fr[col] + " case" : "row " + (row + 1) + ", " + ORDINALS.en[col] + " along";
  }
  function tileWords(t, fr) {
    var w = (t.c !== undefined && t.c !== null ? (fr ? (SHAPE_FEM[t.s] ? COLOUR_WORDS.frF : COLOUR_WORDS.frM)[t.c] + " " : COLOUR_WORDS.en[t.c] + " ") : "");
    var s = SHAPE_WORDS[fr ? "fr" : "en"][t.s];
    var out = fr ? s + (w ? " " + w.trim() : "") : w + s;
    /* A rotation grid states the direction of EVERY tile, including the ones at 0.
       Otherwise the turned tile is the only label carrying an extra word, which
       hands the answer to anyone reading the grid through the labels. */
    if (t.dir || t.r) out += " " + DIR_WORDS[fr ? "fr" : "en"][t.r || 0];
    if (!t.f) out += fr ? ", vide" : ", outline";
    if (t.d) out += fr ? ", avec un point" : ", with a dot";
    return out;
  }
  function gridText(tiles, cols, fr) {
    var rows = [], i;
    for (i = 0; i < tiles.length; i += cols) rows.push((fr ? "Rangée " : "Row ") + "ABCD"[i / cols] + (fr ? " : " : ": ") + tiles.slice(i, i + cols).map(function (t) { return tileWords(t, fr); }).join(", ") + ".");
    return (fr ? "Une grille de " + (tiles.length / cols) + " rangées et " + cols + " colonnes. " : "A grid of " + (tiles.length / cols) + " rows by " + cols + " columns. ") + rows.join(" ");
  }
  function makeSpot(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var form = pick(r, ["rotation", "rotation", "rotation", "fill", "fill", "missing-dot", "missing-dot", "conjunction", "conjunction", "conjunction"]);
    var odd = int(r, 0, 15), tiles = [], i, what, whatFr, diff, prompt;
    if (form === "rotation") {
      var s = pick(r, ASYM_TILES), rot = pick(r, [0, 90, 180, 270]), rot2 = (rot + 90) % 360;
      for (i = 0; i < 16; i++) tiles.push({ s: s, r: i === odd ? rot2 : rot, f: 1, d: 0, dir: 1 });
      what = "one turned a different way"; whatFr = "tournée autrement"; diff = "r";   /* feminine: it describes "la case" */
    } else if (form === "fill") {
      var s2 = pick(r, TILE_SHAPES), solid = int(r, 0, 1) === 1;
      for (i = 0; i < 16; i++) tiles.push({ s: s2, r: 0, f: (i === odd ? !solid : solid) ? 1 : 0, d: 0 });
      what = solid ? "outline one" : "solid one"; whatFr = solid ? "vide" : "pleine"; diff = "f";   /* feminine: it describes "la case" */
    } else if (form === "missing-dot") {
      var s3 = pick(r, TILE_SHAPES);
      for (i = 0; i < 16; i++) tiles.push({ s: s3, r: 0, f: 0, d: i === odd ? 0 : 1 });
      what = "one without a dot"; whatFr = "sans point"; diff = "d";
    } else {
      /* the only tile with BOTH the shape and the colour; every other tile has one or the other,
         every row holds at least one of each kind of near miss, and a red target never sits
         among green distractors (nor green among red) */
      var ts = pick(r, TILE_SHAPES), tc = int(r, 0, 4);
      var TURNED_TWIN = { sq: "dia", dia: "sq" };    /* a diamond IS a square turned; the two never share a grid */
      var otherShapes = TILE_SHAPES.filter(function (x) { return x !== ts && x !== TURNED_TWIN[ts]; });
      /* Pairs a reader cannot reliably separate, by either axis: red/green and blue/green are the
         classic confusions, blue/green are also the same brightness (contrast 1.004), and blue/violet
         is closer still for the commonest colour blindness than the red/green pair. */
      var CONFUSABLE = { 0: [3, 4], 1: [3], 3: [0, 1], 4: [0] };
      var barred = CONFUSABLE[tc] || [];
      var otherColours = [0, 1, 2, 3, 4].filter(function (c) { return c !== tc && barred.indexOf(c) === -1 && (CONFUSABLE[c] || []).indexOf(tc) === -1; });
      for (i = 0; i < 16; i++) tiles.push(null);
      for (var row = 0; row < 4; row++) {
        var cells = [row * 4, row * 4 + 1, row * 4 + 2, row * 4 + 3].filter(function (c) { return c !== odd; });
        var kinds = shuffle(r, ["colour", "shape"].concat([int(r, 0, 1) ? "colour" : "shape", int(r, 0, 1) ? "colour" : "shape"]).slice(0, cells.length));
        cells.forEach(function (c, k) { tiles[c] = kinds[k] === "colour" ? { s: pick(r, otherShapes), r: 0, f: 1, d: 0, c: tc } : { s: ts, r: 0, f: 1, d: 0, c: pick(r, otherColours) }; });
      }
      tiles[odd] = { s: ts, r: 0, f: 1, d: 0, c: tc };
      what = COLOUR_WORDS.en[tc] + " " + SHAPE_WORDS.en[ts];
      whatFr = SHAPE_WORDS.fr[ts] + " " + (SHAPE_FEM[ts] ? COLOUR_WORDS.frF : COLOUR_WORDS.frM)[tc];
      diff = "sc";
    }
    var fem = form === "conjunction" && SHAPE_FEM[tiles[odd].s];
    prompt = form === "conjunction"
      ? (fr ? "Trouve " + (fem ? "la seule " : "le seul ") + whatFr + "." : "Find the only " + what + ".")
      : (fr ? "Touche la case différente." : "Tap the one that is different.");
    return {
      family: "spot", form: form, input: "tap",
      prompt: prompt, show: "",
      options: CELL_IDS.slice(), answer: CELL_IDS[odd],
      explain: CELL_IDS[odd] + " — " + cellWords(odd, 4, fr) + (fr ? " : " + (form === "conjunction" ? (fem ? "la seule " : "le seul ") + whatFr : "la seule " + whatFr) : ": the only " + what) + ".",
      trains: fr ? "repérer la petite différence au milieu de choses identiques" : "noticing the one small difference in a crowd of sameness",
      scene: { kind: "grid", cols: 4, rows: 4, tiles: tiles, diff: diff },
      sceneText: gridText(tiles, 4, fr)
    };
  }

  /* ================================================================= TWIN
     A pattern of nine coloured tiles; four candidates; one is the same (or, in
     the harder form, the same turned a quarter turn), the other three each
     differ in one tile. Colours are the five tile tones, always including the
     two furthest apart in brightness. */
  var COLOUR_LETTERS = ["c", "b", "y", "g", "v"];
  var POSITIONS = { en: ["top-left", "top-centre", "top-right", "middle-left", "centre", "middle-right", "bottom-left", "bottom-centre", "bottom-right"],
                    fr: ["en haut à gauche", "en haut au centre", "en haut à droite", "au milieu à gauche", "au centre", "au milieu à droite", "en bas à gauche", "en bas au centre", "en bas à droite"] };
  function rot90(g) { return [g[6], g[3], g[0], g[7], g[4], g[1], g[8], g[5], g[2]]; }
  function serial(g) { return g.map(function (c) { return COLOUR_LETTERS[c]; }).join(""); }
  function makeTwin(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var turned = int(r, 0, 2) === 0;
    /* Red and amber are the two furthest apart in brightness (contrast 1.93) and are always in.
       Blue and green are the SAME brightness (1.004), so they never share a grid - otherwise a wrong
       option can be identical to the answer in greyscale, or to a colour-blind reader. */
    var rest = shuffle(r, [0, 3, 4]).slice(0, 2);
    if (rest.indexOf(0) !== -1 && rest.indexOf(3) !== -1) rest = [rest[0], 4];
    var cols = [1, 2].concat(rest);
    var grid, tries = 0, ok = false, i;
    while (!ok && tries < 60) {
      tries++; grid = [];
      for (i = 0; i < 9; i++) grid.push(cols[int(r, 0, 3)]);
      var distinct = {}; grid.forEach(function (c) { distinct[c] = 1; });
      var lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8]];
      var mono = lines.some(function (L) { return grid[L[0]] === grid[L[1]] && grid[L[1]] === grid[L[2]]; });
      var sym = serial(rot90(grid)) === serial(grid);
      ok = Object.keys(distinct).length >= 3 && !mono && !sym;
    }
    var twin = turned ? rot90(grid) : grid.slice();
    var edits = [], foils = [], seen = { };
    seen[serial(twin)] = 1; if (turned) seen[serial(grid)] = 1;
    var edit = function () {
      /* one tile changed from the twin — the grid is rebuilt from the twin on every try, so a
         retry never stacks a second change on the first (the solver caught exactly that) */
      var g, idx, colr, t = 0;
      do { g = twin.slice(); idx = int(r, 0, 8); colr = pick(r, cols.filter(function (c) { return c !== twin[idx]; })); g[idx] = colr; t++; } while (seen[serial(g)] && t < 40);
      seen[serial(g)] = 1; edits.push(idx); return g;
    };
    if (turned) foils.push(grid.slice());
    while (foils.length < 3) foils.push(edit());
    var opts = shuffle(r, [twin].concat(foils)).map(serial);
    var rowsWords = function (g) { var out = [], k; for (k = 0; k < 9; k += 3) out.push(g.slice(k, k + 3).map(function (c) { return fr ? COLOUR_WORDS.frM[c] : COLOUR_WORDS.en[c]; }).join(" ")); return out.join(" / "); };
    var whereWords = edits.map(function (e) { return POSITIONS[fr ? "fr" : "en"][e]; }).join(", ");
    return {
      family: "twin", form: turned ? "turned" : "same",
      prompt: turned ? (fr ? "Lequel est ce motif tourné d'un quart de tour dans le sens des aiguilles d'une montre ?" : "Which one is this pattern turned a quarter turn clockwise?")
                     : (fr ? "Lequel est exactement le même ?" : "Which one is exactly the same?"),
      show: (fr ? "Rangées : " : "Rows: ") + rowsWords(grid),
      options: opts, answer: serial(twin),
      explain: turned
        ? (fr ? "L'un d'eux était le motif pas tourné du tout — l'erreur facile. Les deux autres avaient chacun une case fausse : " + whereWords + "." : "One of them was the pattern not turned at all — the easy mistake. The other two each had one tile wrong: " + whereWords + ".")
        : (fr ? "Les trois autres avaient chacun une case fausse : " + whereWords + "." : "The other three each had one tile wrong: " + whereWords + "."),
      trains: fr ? "comparer deux choses case par case sans se fier au premier coup d'œil" : "comparing two things tile by tile without trusting the first glance",
      scene: { kind: "twin", grid: grid.slice(), turned: turned },
      sceneText: (fr ? "Un motif de trois rangées. " : "A pattern of three rows. ") + rowsWords(grid) + "."
    };
  }

  /* ============================================================== CHANGED
     Nine different objects; look, then look again — one has changed. Either
     a new object took a cell, or the same object turned upside down. */
  var OBJECT_KEYS = ["house", "star", "ring", "arrow", "cup", "leaf", "key", "moon", "drop", "bell", "heart", "cloud"];
  /* Which way up a thing is, said the same way everywhere: in the first grid, in the
     per-cell labels of the second, and in the explanation. The French agrees with the
     object, which the labels did not - "cle, retourne" was shipping on 98% of grids. */
  function orientWords(o, fr) {
    return o.r ? (fr ? (OBJECT_FEM[o.s] ? ", retournée" : ", retourné") : ", upside down")
               : (fr ? ", à l’endroit" : ", upright");
  }

  /* "leaf" is NOT in this list: its outline maps onto itself under a half turn (within 2.2 of 56
     units, inside the stroke), so the change would be invisible and the puzzle unanswerable. */
  var ASYM_OBJECTS = ["house", "arrow", "cup", "key", "drop", "bell", "heart"];
  var OBJECT_WORDS = { en: { house: "house", star: "star", ring: "ring", arrow: "arrow", cup: "cup", leaf: "leaf", key: "key", moon: "moon", drop: "drop", bell: "bell", heart: "heart", cloud: "cloud" },
                       fr: { house: "maison", star: "étoile", ring: "anneau", arrow: "flèche", cup: "tasse", leaf: "feuille", key: "clé", moon: "lune", drop: "goutte", bell: "cloche", heart: "cœur", cloud: "nuage" } };
  var OBJECT_FEM = { star: true, arrow: true, cup: true, leaf: true, key: true, moon: true, drop: true, bell: true, house: true };
  var CELLS9 = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
  function makeChanged(seed, lang) {
    var r = rng(seed), fr = FR(lang), W = OBJECT_WORDS[fr ? "fr" : "en"];
    var all = shuffle(r, OBJECT_KEYS), onGrid = all.slice(0, 9), spare = all.slice(9);
    /* Some objects start upside down. Before this, everything began upright, so the single
       upside-down object in the second grid WAS the answer - no memory needed, and its label
       said so outright. Now the reader has to remember which one turned. */
    var before = onGrid.map(function (s) { return { s: s, r: (ASYM_OBJECTS.indexOf(s) !== -1 && int(r, 0, 2) === 0) ? 180 : 0 }; });
    var how = int(r, 0, 1) ? "rotate" : "swap", idx;
    if (how === "rotate") { var cand = []; before.forEach(function (o, i) { if (ASYM_OBJECTS.indexOf(o.s) !== -1) cand.push(i); }); idx = pick(r, cand); }
    else idx = int(r, 0, 8);
    var after = before.map(function (o) { return { s: o.s, r: o.r }; });
    if (how === "rotate") {
      after[idx].r = before[idx].r === 180 ? 0 : 180;
      /* At least one OTHER object must also be upside down in the second grid, or the one
         that is upside down is the answer - visible without remembering anything, and named
         outright by its label. */
      var others = after.map(function (o, k) { return (k !== idx && ASYM_OBJECTS.indexOf(o.s) !== -1) ? k : -1; }).filter(function (k) { return k >= 0; });
      if (!after.some(function (o, k) { return k !== idx && o.r === 180; }) && others.length) {
        var k2 = pick(r, others); before[k2].r = 180; after[k2].r = 180;
      }
    } else after[idx] = { s: pick(r, spare), r: 0 };
    var art = function (s) { return (fr ? (OBJECT_FEM[s] ? "une " : "un ") : (/^[aeiou]/i.test(W[s]) ? "an " : "a ")) + W[s]; };
    var gridWords = function (set) { var out = [], k; for (k = 0; k < 9; k += 3) out.push((fr ? "Rangée " : "Row ") + "ABC"[k / 3] + (fr ? " : " : ": ") + set.slice(k, k + 3).map(function (o) { return W[o.s] + (how === "rotate" ? orientWords(o, fr) : ""); }).join("; ") + "."); return out.join(" "); };
    return {
      family: "changed", form: how, input: "tap", hide: true,
      prompt: fr ? "Touche ce qui a changé." : "Tap what changed.",
      show: "",
      options: CELLS9.slice(), answer: CELLS9[idx],
      explain: how === "swap"
        ? (fr ? CELLS9[idx] + " était " + art(before[idx].s) + " ; c'est maintenant " + art(after[idx].s) + "." : CELLS9[idx] + " was " + art(before[idx].s) + "; it is now " + art(after[idx].s) + ".")
        : (fr ? CELLS9[idx] + " — " + (OBJECT_FEM[before[idx].s] ? "la " : "le ") + W[before[idx].s] + (before[idx].r === 180 ? " s'est remis" + (OBJECT_FEM[before[idx].s] ? "e" : "") + " à l'endroit." : " s'est retourné" + (OBJECT_FEM[before[idx].s] ? "e" : "") + ".") : CELLS9[idx] + " — the " + W[before[idx].s] + (before[idx].r === 180 ? " turned right side up." : " turned upside down.")),
      trains: fr ? "garder une image en tête une fois qu'elle a disparu" : "holding a picture in your head after it has gone",
      scene: { kind: "change", cols: 3, rows: 3, before: before, after: after, how: how },
      sceneText: gridWords(before)
    };
  }

  /* =============================================================== SHELLS
     Three balls swap places four to six times; keep your eye on the ringed
     one. Halfway through all three change colour AND their inner mark together,
     so colour is useless on purpose and the change shows without colour
     vision. Motion is a list of frames the app plays; without motion the same
     frames are a comic strip. */
  function makeShells(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var start = int(r, 0, 2), count = int(r, 4, 6), swaps = [], prev = null, i;
    var pairs = [[0, 1], [1, 2], [0, 2]];
    for (i = 0; i < count; i++) { var p; do { p = pick(r, pairs); } while (prev && p === prev); swaps.push(p); prev = p; }
    var recolourAt = Math.floor(count / 2);
    var pos = [0, 1, 2], frames = [{ slots: pos.slice(), ring: true, recoloured: false }];
    swaps.forEach(function (sw, k) {
      var a = pos.indexOf(sw[0]), b = pos.indexOf(sw[1]); pos[a] = sw[1]; pos[b] = sw[0];
      frames.push({ slots: pos.slice(), swap: sw, recoloured: k + 1 >= recolourAt });
    });
    var end = pos[start];
    var lost = fr ? "Je l'ai perdue" : "I lost it";
    var swapWords = swaps.map(function (s) { return (s[0] + 1) + "↔" + (s[1] + 1); }).join(", ");
    var swapSentences = swaps.map(function (s) { return fr ? "La " + (s[0] + 1) + " et la " + (s[1] + 1) + " échangent leurs places" : (s[0] + 1) + " and " + (s[1] + 1) + " swap"; }).join(". ");
    return {
      family: "shells", form: String(count),
      prompt: fr ? "Ne quitte pas des yeux la balle cerclée. Où est-elle maintenant ?" : "Keep your eye on the ringed ball. Where is it now?",
      show: "",
      options: ["1", "2", "3", lost], answer: String(end + 1),
      explain: (fr ? "Elle est partie de la " + (start + 1) + ". Échanges : " + swapWords + ". Elle finit en " + (end + 1) + "." : "It started at " + (start + 1) + ". Swaps: " + swapWords + ". It ends at " + (end + 1) + ".") +
               (count === 6 ? (fr ? " À six échanges, c'est facile à perdre — ceux à quatre sont plus doux." : " It is easy to lose at six swaps — the four-swap ones are kinder.") : ""),
      trains: fr ? "garder un œil sur une seule chose pendant que tout bouge autour" : "keeping track of one thing while everything around it moves",
      scene: { kind: "shells", n: 3, start: start, swaps: swaps, recolourAt: recolourAt, ms: 600, gap: 250, frames: frames },
      sceneText: (fr ? "Trois balles. Celle qui est cerclée est en position " + (start + 1) + ". Puis : " : "Three balls. The ringed one is at position " + (start + 1) + ". Then: ") + swapSentences + "."
    };
  }

  /* ======================================================= DRILLS ("Moves")
     Routines with nothing to answer. CEO, 21 Sep 2026: "games that don't
     necessarily need an answer, like … using your non-dominant hand to do a
     simple task or make shapes". A drill is a different object in a different
     registry: never in the day's five, never counted as a puzzle, no score.
     The line under each names the ACT it trains; no word about the brain. */
  var DRILL_SHAPES = ["circle", "eight", "triangle", "star", "spiral", "wave"];
  var SHAPE_NAMES = { en: { circle: "a circle", eight: "a figure of eight", triangle: "a triangle", star: "a star", spiral: "a spiral", wave: "a wave" },
                      fr: { circle: "un cercle", eight: "un huit", triangle: "un triangle", star: "une étoile", spiral: "une spirale", wave: "une vague" } };
  /* THE DEMOS (CEO, 23 Sep 2026: "some people are more visual like me ... make sure the
     demo video realistic use a human avatar"). A few seconds of one person - the same
     generated woman in every routine - doing the move at a table, facing the reader.
     She faces the reader like a coach, so she MIRRORS: when the reader is told "left
     hand", she moves the hand on the left of the screen. Generated by AI and checked frame
     by frame for the right number of fingers and the right movement. Kept under img/gen/,
     which is where the app looks to know a picture is generated and must be marked; each
     file also says so inside itself. The text is what a screen reader says instead. */
  var DEMOS = {
    hands: { src: "img/gen/moves/hands.mp4", poster: "img/gen/moves/hands.jpg",
      en: "A woman at a table traces a shape on the table with one finger of the hand on the left of the screen; her other hand rests.", fr: "Une femme, à une table, trace une forme sur la table avec un doigt de la main à gauche de l'écran ; son autre main se repose.",
      noteEn: "Use the hand you do not write with. Your shape may be different: follow the dot.", noteFr: "Prends la main avec laquelle tu n'écris pas. Ta forme peut être différente : suis le point." },
    bilateral: { src: "img/gen/moves/bilateral.mp4", poster: "img/gen/moves/bilateral.jpg",
      en: "A woman at a table draws a circle with each hand, both hands moving at the same time.", fr: "Une femme, à une table, dessine un cercle de chaque main, les deux mains bougeant en même temps.",
      noteEn: "Here, two circles. Your two shapes will be different: follow the dots.", noteFr: "Ici, deux cercles. Tes deux formes seront différentes : suis les points." },
    /* Two hands, two shapes: this clip was MEASURED, not only looked at - the movement in
       each half of the picture, four times a second, is well above a still hand's all through
       the loop (the panel caught an earlier clip in which the hands took turns, the very
       habit this routine exists to break). It draws two circles, not two different shapes:
       no generator managed two different shapes at once, and the line under it says so. */
    /* Thumb to each finger: a PHOTO, not a video. In ten attempts across three video models
       (23 Sep 2026: seedance_2_0 x7, kling3_0 x2, and stills) not one showed the thumb
       touching each finger in turn - they bunched the fingers, made a fist or a "hang loose"
       sign, or skipped the middle finger - and a demo that teaches the wrong move is worse
       than none. So the first screen shows her holding the hand up, palm facing out, which
       settles the orientation, and the moving drawing under it shows the touches in order. */
    fingers: { src: "img/gen/moves/pose-right.jpg", poster: "img/gen/moves/pose-right.jpg", photo: true,
      en: "A woman at a table holds up one open hand, palm facing out, fingers spread.", fr: "Une femme, à une table, lève une main ouverte, paume tournée vers l'avant, doigts écartés.",
      noteEn: "Palm facing away from you, fingers open, like her. The drawing below shows the order.", noteFr: "Paume tournée vers l'avant, doigts ouverts, comme elle. Le dessin ci-dessous montre l'ordre." }
  };
  function demoFor(key, fr) { var x = DEMOS[key]; return x ? { src: x.src, poster: x.poster, photo: !!x.photo, alt: fr ? x.fr : x.en, note: fr ? x.noteFr : x.noteEn } : null; }

  /* WHAT COMES NEXT (CEO, 23 Sep 2026: "in the transition you announce what is coming like
     left hand, then right hand, both hands give people the time to put down their phone ...
     not these schema, we don't know if the hand is palm face up or down"). Before the first
     hand and before every change of hands, the routine says which hand in large words and
     shows the same woman holding that pose - a photograph, so it is plain which way the
     palm faces. Mirrored like the videos: "Right hand" shows the hand on the right of the
     screen. The heading and the sentence carry the meaning; the photo only shows it. */
  var POSES = {
    right: "img/gen/moves/pose-right.jpg", left: "img/gen/moves/pose-left.jpg", both: "img/gen/moves/pose-both.jpg",
    tableOne: "img/gen/moves/pose-table-one.jpg", tableBoth: "img/gen/moves/pose-table-both.jpg"
  };
  var HEADS = {
    right: { en: "Right hand", fr: "Main droite" }, left: { en: "Left hand", fr: "Main gauche" },
    both: { en: "Both hands", fr: "Les deux mains" }, other: { en: "Your other hand", fr: "Ton autre main" },
    swap: { en: "Swap shapes", fr: "On inverse les formes" }
  };
  function announce(head, fr, text, pose, scene) {
    var b = { label: HEADS[head][fr ? "fr" : "en"], text: text };
    if (pose) b.photo = POSES[pose];
    if (scene) b.scene = scene;
    return b;
  }

  var SAFETY = { en: "Go gently. Stop if anything hurts.", fr: "Vas-y doucement. Arrête si quelque chose fait mal." };
  function drillTotal(steps) { return steps.reduce(function (a, s) { return a + s.seconds; }, 0); }

  function makeHandsDrill(seed, lang) {
    var r = rng(seed), fr = FR(lang), N = SHAPE_NAMES[fr ? "fr" : "en"];
    var pair = shuffle(r, DRILL_SHAPES).slice(0, 2), A = pair[0], B = pair[1];
    var steps = [
      { id: "intro", seconds: 15, text: fr ? "Pose le téléphone, ou tiens-le dans ta main qui écrit. L'autre main travaille — sur la table, dans l'air ou sur l'écran. Passe si ça ne te convient pas." : "Put the phone down, or hold it in the hand you write with. The other hand does the work — on the table, in the air, or on the screen. Skip this one if it does not suit you." },
      { id: "a", seconds: 30, hands: "other",
        before: announce("other", fr, fr ? "Pose le téléphone, ou garde-le dans la main avec laquelle tu écris. Puis trace avec l'autre main : sur la table, dans l'air ou sur l'écran." : "Put the phone down, or keep it in the hand you write with. Then trace with the other hand: on the table, in the air or on the screen.", "tableOne"),
        text: (fr ? "Suis le point avec un doigt de ton autre main : " + N[A] + (A === "wave" ? ", de gauche à droite." : A === "eight" ? ", en suivant le point." : ", dans le sens des aiguilles d'une montre.") : "Follow the dot with a finger of your other hand: " + N[A] + (A === "wave" ? ", from left to right." : A === "eight" ? ", following the dot." : ", clockwise.")), scene: { kind: "path", shape: A, dir: 1, lap: 8 } },
      { id: "b", seconds: 30, hands: "other", text: (fr ? "Maintenant celle-ci, dans l'autre sens : " + N[B] + "." : "Now this one, the other way round: " + N[B] + "."), scene: { kind: "path", shape: B, dir: -1, lap: 6 } },
      { id: "c", seconds: 20, hands: "other", text: (fr ? "Encore une fois, un peu plus vite : " + N[A] + "." : "Once more, a little faster: " + N[A] + "."), scene: { kind: "path", shape: A, dir: 1, lap: 6 } }
    ];
    return { family: "hands", kind: "drill", title: fr ? "L'autre main" : "The other hand", intro: steps[0].text, hands: "one", steps: steps, total: drillTotal(steps), demo: demoFor("hands", fr),
             trains: fr ? "tracer une forme familière avec la main que tu n'utilises jamais pour ça" : "tracing a familiar shape with the hand you never use for it",
             safety: SAFETY[fr ? "fr" : "en"], variant: DRILL_SHAPES.indexOf(A) * 6 + DRILL_SHAPES.indexOf(B) };
  }

  var FINGER_ORDERS = [[2, 4, 1, 3], [1, 3, 2, 4], [3, 1, 4, 2], [4, 2, 3, 1], [2, 1, 4, 3], [1, 4, 2, 3]];
  var FINGER_NAMES = { en: ["thumb", "index", "middle", "ring", "little"], fr: ["pouce", "index", "majeur", "annulaire", "auriculaire"] };
  function makeFingersDrill(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var beatIdx = int(r, 0, 2), beat = [0.8, 1.0, 1.2][beatIdx], scrambleIdx = int(r, 0, 5), scramble = FINGER_ORDERS[scrambleIdx];
    var up = [1, 2, 3, 4, 3, 2, 1], names = function (o) { return o.map(function (i) { return FINGER_NAMES[fr ? "fr" : "en"][i]; }).join(", "); };
    /* with motion off nothing lights, so the order is written out */
    var order = function (o) { return (fr ? "Dans l'ordre : " : "In order: ") + names(o) + "."; };
    var steps = [
      { id: "intro", seconds: 12, scene: { kind: "hand", side: "R", order: [1, 2, 3, 4], beat: 1.2 }, still: order([1, 2, 3, 4]), text: fr ? "Regarde comment faire, puis touche Étape suivante. Ton pouce va toucher chaque doigt à tour de rôle — suis le doigt allumé. Une seule main, c'est très bien ; tu peux t'arrêter quand tu veux." : "Watch how it goes, then tap Next step. Your thumb will touch each finger in turn — follow the lit finger. One hand is fine; you can stop whenever you like." },
      { id: "one", seconds: 25, hands: "one",
        before: announce("right", fr, fr ? "Pose le téléphone, ou tiens-le dans la main gauche. Puis lève la main droite, paume tournée vers l'avant, doigts ouverts." : "Put the phone down, or hold it in your left hand. Then hold up your right hand, palm facing away from you, fingers open.", "right"),
        still: order(up), text: fr ? "Touche le doigt allumé avec ton pouce." : "Touch the lit finger with your thumb.", scene: { kind: "hand", side: "R", order: up, beat: beat } },
      { id: "other", seconds: 25, hands: "other",
        before: announce("left", fr, fr ? "Pose le téléphone, ou passe-le dans la main droite. Puis lève la main gauche, paume tournée vers l'avant, doigts ouverts." : "Put the phone down, or move it to your right hand. Then hold up your left hand, palm facing away from you, fingers open.", "left"),
        still: order(up), text: fr ? "Pareil : touche le doigt allumé avec ton pouce." : "Same again: touch the lit finger with your thumb.", scene: { kind: "hand", side: "L", order: up, beat: beat * 0.8 } },
      { id: "both", seconds: 20, hands: "both",
        before: announce("both", fr, fr ? "Pose le téléphone à plat, puis lève les deux mains, paumes tournées vers l'avant, doigts ouverts." : "Put the phone down flat, then hold up both hands, palms facing away from you, fingers open.", "both"),
        still: order(up), text: fr ? "Chaque pouce touche le même doigt, sur sa main, en même temps." : "Each thumb touches the same finger on its own hand, at the same time.", scene: { kind: "hand", side: "both", order: up, orderRight: up.slice().reverse(), beat: beat } },
      { id: "new", seconds: 18, hands: "both", text: (fr ? "Dernière : un nouvel ordre. " : "Last one: a new order. ") + scramble.join("-") + " (" + names(scramble) + ").", scene: { kind: "hand", side: "both", order: scramble, orderRight: scramble, beat: beat } }
    ];
    return { family: "fingers", kind: "drill", title: fr ? "Le pouce sur chaque doigt" : "Thumb to each finger", intro: steps[0].text, hands: "one", steps: steps, total: drillTotal(steps), demo: demoFor("fingers", fr),
             trains: fr ? "toucher chaque doigt avec le pouce dans un ordre inhabituel" : "touching each finger to the thumb in an order that is not the usual one",
             safety: SAFETY[fr ? "fr" : "en"], variant: beatIdx * 6 + scrambleIdx };
  }

  /* every pair differs, so the swap always changes something (the panel, 23 Sep 2026: the old
     triangle-and-triangle deal announced a swap in which nothing changed) */
  var BILATERAL_PAIRS = [["circle", "wave"], ["circle", "triangle"], ["eight", "circle"], ["triangle", "wave"]];
  function makeBilateralDrill(seed, lang) {
    var r = rng(seed), fr = FR(lang), N = SHAPE_NAMES[fr ? "fr" : "en"];
    var pi = int(r, 0, 3), A = BILATERAL_PAIRS[pi][0], B = BILATERAL_PAIRS[pi][1];
    var steps = [
      { id: "intro", seconds: 15, text: fr ? "Pose le téléphone à plat. Celui-ci se fait à deux mains. Trace sur la table, comme dans la vidéo, ou directement sur les points. Au début, les mains se battent — c'est normal." : "Put the phone down flat. This one takes both hands. Trace on the table, like the video, or right on the dots. Everyone's hands fight at the start." },
      { id: "two", seconds: 30, hands: "both",
        before: announce("both", fr, fr ? "Pose le téléphone à plat, puis un doigt de chaque main sur la table." : "Put the phone down flat, then rest one finger of each hand on the table.", "tableBoth"),
        text: (fr ? "L'index gauche suit le point de gauche (" + N[A] + "), l'index droit celui de droite (" + N[B] + ") — en même temps." : "Left finger follows the left dot (" + N[A] + "), right finger follows the right dot (" + N[B] + ") — at the same time."), scene: { kind: "path2", left: A, right: B, lapL: 8, lapR: 6, dirL: 1, dirR: 1 } },
      { id: "swap", seconds: 30, hands: "both", swap: true,
        before: announce("swap", fr, fr ? "Chaque main trace maintenant la forme de l'autre." : "Each hand now draws the other hand's shape.", null, { kind: "switch", swap: true, left: B, right: A }),
        text: fr ? "Formes inversées : à gauche, " + N[B] + " ; à droite, " + N[A] + "." : "Shapes swapped: left, " + N[B] + "; right, " + N[A] + ".", scene: { kind: "path2", left: B, right: A, lapL: 6, lapR: 8, dirL: 1, dirR: 1 } },
      { id: "circles", seconds: 20, hands: "both", text: fr ? "Deux cercles, en sens inverse." : "Two circles, opposite ways.", scene: { kind: "path2", left: "circle", right: "circle", lapL: 7, lapR: 7, dirL: 1, dirR: -1 } }
    ];
    return { family: "bilateral", kind: "drill", title: fr ? "Deux mains, deux formes" : "Two hands, two shapes", intro: steps[0].text, hands: "two", steps: steps, total: drillTotal(steps), demo: demoFor("bilateral", fr),
             trains: fr ? "bouger les deux mains en même temps quand elles veulent faire la même chose" : "moving both hands at once when they want to do the same thing",
             safety: SAFETY[fr ? "fr" : "en"], variant: pi };
  }

  /* twelve small things done the unusual way; nothing with eyes closed, standing, walking, balance, heat or edges — a child seated with a phone in one hand */
  var NEURO = [
    { id: "unlock", pool: "other", glyph: "phone", en: "Next time you pick your phone up, hold it in your other hand and unlock it with that thumb.", fr: "La prochaine fois que tu prends ton téléphone, tiens-le dans ton autre main et déverrouille-le avec ce pouce-là." },
    { id: "airname", pool: "other", glyph: "hand", en: "Write your name in the air with your other hand.", fr: "Écris ton prénom dans l'air avec ton autre main." },
    { id: "sixdots", pool: "other", glyph: "dots", en: "Touch these six dots in order with your other thumb. Nothing lights up — you keep the order yourself.", fr: "Touche ces six points dans l'ordre avec ton autre pouce. Rien ne s'allume — c'est toi qui gardes l'ordre.", scene: { kind: "dots" } },
    { id: "litdot", pool: "other", glyph: "dots", en: "With your other hand, follow the lit dot with a finger. It moves on its own — there is nothing to get right.", fr: "Avec ton autre main, suis le point allumé avec un doigt. Il avance tout seul — il n'y a rien à réussir.", scene: { kind: "dotgrid", beat: 1.5 } },
    { id: "arms", pool: "rest", glyph: "cross", en: "Cross your arms the other way from usual — notice how odd it feels.", fr: "Croise les bras dans l'autre sens que d'habitude — remarque comme c'est étrange." },
    { id: "clasp", pool: "rest", glyph: "hand", en: "Clasp your hands with the other thumb on top.", fr: "Joins les mains avec l'autre pouce dessus." },
    { id: "months", pool: "rest", glyph: "calendar", en: "Say the months of the year backwards.", fr: "Dis les mois de l'année à l'envers." },
    { id: "foot", pool: "rest", glyph: "foot", en: "Tap your foot while counting down from 30 in threes.", fr: "Tape du pied en comptant à rebours de 30, de trois en trois." },
    { id: "point", pool: "rest", glyph: "hand", en: "Fold your arms, then point at something with the hand underneath.", fr: "Croise les bras, puis montre quelque chose avec la main du dessous." },
    { id: "square", pool: "rest", glyph: "foot", en: "Sitting down, trace a square with one foot while one hand draws a circle in the air.", fr: "Assis, trace un carré avec un pied pendant qu'une main dessine un cercle dans l'air." },
    { id: "five", pool: "rest", glyph: "eye", en: "Look around the room, then look at the screen and name five things you saw.", fr: "Regarde la pièce, puis regarde l'écran et nomme cinq choses que tu as vues." },
    { id: "watch", pool: "rest", glyph: "watch", en: "Put your watch or bracelet on the other wrist for the rest of today.", fr: "Mets ta montre ou ton bracelet à l'autre poignet pour le reste de la journée." }
  ];
  function makeNeurobicsDrill(seed, lang) {
    var r = rng(seed), fr = FR(lang);
    var other = NEURO.map(function (x, i) { return x.pool === "other" ? i : -1; }).filter(function (i) { return i >= 0; });
    var rest = NEURO.map(function (x, i) { return x.pool === "rest" ? i : -1; }).filter(function (i) { return i >= 0; });
    var chosen = shuffle(r, [pick(r, other)].concat(shuffle(r, rest).slice(0, 3)));
    var steps = [{ id: "intro", seconds: 12, text: fr ? "Quatre petits gestes, faits autrement. Passe ce qui ne te convient pas — touche Étape suivante." : "Four small things, done the unusual way. Skip any that do not suit you — tap Next step." }];
    chosen.forEach(function (i) { var it = NEURO[i]; steps.push({ id: it.id, seconds: 15, text: fr ? it.fr : it.en, scene: it.scene || { kind: "glyph", glyph: it.glyph } }); });
    return { family: "neurobics", kind: "drill", title: fr ? "Un petit geste, autrement" : "A small thing, differently", intro: steps[0].text, hands: "one", steps: steps, total: drillTotal(steps),
             trains: fr ? "faire une chose familière d'une façon inhabituelle, exprès" : "doing a familiar thing the unfamiliar way, on purpose",
             safety: SAFETY[fr ? "fr" : "en"], variant: chosen.slice().sort(function (a, b) { return a - b; }).join("-"), items: chosen.slice() };
  }

  var DRILLS = [
    { key: "hands", name: "The other hand", nameFr: "L'autre main", icon: "✋", hands: "one",
      blurb: "Follow a moving dot with the hand you never use for it.", blurbFr: "Suis un point qui bouge avec la main que tu n'utilises jamais pour ça.", make: makeHandsDrill },
    { key: "fingers", name: "Thumb to each finger", nameFr: "Le pouce sur chaque doigt", icon: "🖐", hands: "one",
      blurb: "Touch each finger with your thumb, in an order you did not choose.", blurbFr: "Touche chaque doigt avec le pouce, dans un ordre que tu n'as pas choisi.", make: makeFingersDrill },
    { key: "bilateral", name: "Two hands, two shapes", nameFr: "Deux mains, deux formes", icon: "🤲", hands: "two",
      blurb: "Each hand traces its own shape. At the same time.", blurbFr: "Chaque main trace sa propre forme. En même temps.", make: makeBilateralDrill },
    { key: "neurobics", name: "A small thing, differently", nameFr: "Un petit geste, autrement", icon: "🔁", hands: "one",
      blurb: "Four everyday things, done the unusual way.", blurbFr: "Quatre gestes de tous les jours, faits autrement.", make: makeNeurobicsDrill }
  ];
  var DRILL_BY_KEY = {};
  DRILLS.forEach(function (d) { DRILL_BY_KEY[d.key] = d; });

  /* ---------------------------------------------------------- the families */
  var FAMILIES = [
    { key: "sequences", name: "Sequences and patterns", nameFr: "Suites et motifs", icon: "🔢", maths: true,
      blurb: "Work out the rule, then continue it.", blurbFr: "Trouve la règle, puis continue-la.", infinite: true, make: makeSequence },
    { key: "logic", name: "Logic and deduction", nameFr: "Logique et déduction", icon: "🧩",
      blurb: "Some always tell the truth, some always lie. Work out which.", blurbFr: "Certains disent toujours la vérité, d'autres mentent toujours. À toi de voir qui est qui.", infinite: true, make: makeKnights },
    { key: "spatial", name: "Spatial reasoning", nameFr: "Raisonnement spatial", icon: "🕰",
      blurb: "Turn it in your head.", blurbFr: "Fais-le tourner dans ta tête.", infinite: true, make: makeClock },
    /* named for what the reader does - the claims standard bars "memory" and "attention" (C, ruled 11 Aug 2026) */
    { key: "memory", name: "Hold a list", nameFr: "Garder une liste en tête", icon: "📝",
      blurb: "Hold a few things at once, then answer.", blurbFr: "Garde plusieurs choses en tête, puis réponds.", infinite: true, make: makeMemory },
    { key: "attention", name: "Odd one out", nameFr: "Lequel ne va pas ?", icon: "🔎",
      blurb: "One of these is not like the others.", blurbFr: "L'un de ces éléments n'est pas comme les autres.", infinite: true, make: makeOddOne },
    { key: "deduction", name: "Clues and conclusions", nameFr: "Indices et conclusions", icon: "🔍",
      blurb: "Two clues, three things. Sometimes the answer is that it cannot be told.", blurbFr: "Deux indices, trois objets. Parfois, la réponse est qu'on ne peut pas savoir.", infinite: true, make: makeOrdering },
    { key: "arithmetic", name: "Mental arithmetic", nameFr: "Calcul mental", icon: "➕", maths: true,
      blurb: "A short chain of steps, held in your head.", blurbFr: "Une courte suite d'étapes, gardée en tête.", infinite: true, make: makeChain },
    { key: "calendar", name: "Days of the week", nameFr: "Jours de la semaine", icon: "📅", maths: true,
      blurb: "Count forward or back through the week.", blurbFr: "Compte en avant ou en arrière dans la semaine.", infinite: true, make: makeDays },
    { key: "sets", name: "Two groups", nameFr: "Deux groupes", icon: "⭕", maths: true,
      blurb: "Some people are in both. Do not count them twice.", blurbFr: "Certains sont dans les deux. Ne les compte pas deux fois.", infinite: true, make: makeGroups },
    { key: "direction", name: "Which way", nameFr: "Quelle direction", icon: "🧭",
      blurb: "Turn a few times. Which way are you facing?", blurbFr: "Tourne quelques fois. Dans quelle direction regardes-tu ?", infinite: true, make: makeCompass },
    /* the four of 21 Sep 2026 — attention to detail, on a picture */
    { key: "spot", name: "Find the odd tile", nameFr: "L'intrus dans la grille", icon: "🎯",
      blurb: "One of sixteen is different. Tap it.", blurbFr: "Un sur seize est différent. Touche-le.", infinite: true, make: makeSpot },
    { key: "twin", name: "Find the twin", nameFr: "Trouve le jumeau", icon: "🪞",
      blurb: "Four patterns. One is the same as the model.", blurbFr: "Quatre motifs. Un seul est le même que le modèle.", infinite: true, make: makeTwin },
    { key: "changed", name: "What changed?", nameFr: "Qu'est-ce qui a changé ?", icon: "🔄",
      blurb: "Look, then look again. One thing moved.", blurbFr: "Regarde, puis regarde encore. Une chose a bougé.", infinite: true, make: makeChanged },
    { key: "shells", name: "Follow the ball", nameFr: "Suis la balle", icon: "🎱", needsMotion: true,
      blurb: "Three balls swap places. Keep your eye on one.", blurbFr: "Trois balles échangent leur place. N'en quitte pas une des yeux.", infinite: true, make: makeShells },
    { key: "estimation", name: "Estimation", nameFr: "Estimation", icon: "📐",
      blurb: "No looking it up. Build the answer out of what you already know.", blurbFr: "Pas question de chercher : construis la réponse à partir de ce que tu sais déjà.", infinite: false,
      make: makeHand(FERMI, "estimation", "getting near the right answer with no data", "s'approcher de la bonne réponse sans aucune donnée") },
    { key: "lateral", name: "Lateral thinking", nameFr: "Pensée latérale", icon: "💡",
      blurb: "The answer is obvious — afterwards.", blurbFr: "La réponse est évidente — après coup.", infinite: false,
      make: makeHand(LATERAL, "lateral", "letting go of the first reading", "renoncer à sa première lecture") }
  ];

  var BY_KEY = {};
  FAMILIES.forEach(function (f) { BY_KEY[f.key] = f; });

  /* A set of five, one seed, mixed across families — the same shape as the
     daily five, so the reader learns one thing and not two. */
  function makeSet(seed, howMany, lang, opts) {
    var n = howMany || 5, r = rng(seed), out = [];
    /* a family can be left out (the ball game needs motion a reader may have
       turned off) or the set restricted (the maths four) — applied BEFORE the
       seeded shuffle, so the substitution is the same on every device */
    var pool = FAMILIES.filter(function (f) {
      if (opts && opts.exclude && opts.exclude.indexOf(f.key) !== -1) return false;
      if (opts && opts.only && opts.only.indexOf(f.key) === -1) return false;
      return true;
    });
    if (!pool.length) pool = FAMILIES;
    var order = shuffle(r, pool.map(function (f) { return f.key; }));
    for (var i = 0; i < n; i++) {
      var key = order[i % order.length];
      out.push(BY_KEY[key].make((seed * 7919 + i * 104729) >>> 0, lang));
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

  var infinite = FAMILIES.filter(function (f) { return f.infinite; }).length;
  window.CURIO_GYM = {
    families: FAMILIES,
    byKey: BY_KEY,
    languages: ["en", "fr"],
    make: function (key, seed, lang) { return BY_KEY[key] ? BY_KEY[key].make(seed >>> 0, lang || "en") : null; },
    makeSet: makeSet,
    seedForDay: seedForDay,
    /* the routines with nothing to answer — their own list, never in a set of five */
    drills: DRILLS,
    drillByKey: DRILL_BY_KEY,
    makeDrill: function (key, seed, lang) { return DRILL_BY_KEY[key] ? DRILL_BY_KEY[key].make(seed >>> 0, lang || "en") : null; },
    neuroBank: NEURO,
    /* what a tap cell or a twin option says to a screen reader, in the reader's language */
    /* What a QUESTION screen may draw. A puzzle that hides its list (hide: true) shows
       the words while the reader studies and must never show them again when asked -
       so the words are stripped here, and only the anchor the prompt already names is
       kept. The study screen reads sceneLabels itself; every drawing made at question
       time goes through this, and the build checks it. (22 Sep 2026: the question
       screen passed the full labels, and every memory puzzle showed its own answer.) */
    holdWays: HOLD_WAYS,
    /* the way suggested on a given list puzzle: fixed by its words, so the same puzzle always
       suggests the same way, and a round of five meets several */
    holdWayFor: function (p) {
      var s = JSON.stringify(p && p.scene || {}) + "|" + (p && p.options ? p.options.indexOf(p.answer) : 0), h = 0, i;
      for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return HOLD_WAYS[h % HOLD_WAYS.length];
    },
    questionLabels: function (p) {
      var l = p && p.sceneLabels ? p.sceneLabels : {};
      if (!p || !p.hide) return l;
      var out = {}, k;
      for (k in l) if (Object.prototype.hasOwnProperty.call(l, k) && k !== "words") out[k] = l[k];
      return out;
    },
    cellLabel: function (p, i, lang) {
      var fr = lang === "fr", id = p.options[i], what;
      if (p.scene.kind === "grid") what = tileWords(p.scene.tiles[i], fr);
      else { var o = p.scene.after[i]; what = OBJECT_WORDS[fr ? "fr" : "en"][o.s] + (p.form === "rotate" ? orientWords(o, fr) : ""); }
      return (fr ? "Rangée " + id.charAt(0) + ", colonne " + id.charAt(1) + " : " : "Row " + id.charAt(0) + ", column " + id.charAt(1) + ": ") + what;
    },
    twinLabel: function (o, lang) {
      var fr = lang === "fr", cells = o.split("").map(function (ch) { return COLOUR_LETTERS.indexOf(ch); }), rows = [], k;
      for (k = 0; k < 9; k += 3) rows.push(cells.slice(k, k + 3).map(function (c) { return fr ? COLOUR_WORDS.frM[c] : COLOUR_WORDS.en[c]; }).join(" "));
      return rows.join(" / ");
    },
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
    counts: { families: FAMILIES.length, generated: infinite, handWritten: FERMI.length + LATERAL.length,
              estimation: FERMI.length, lateral: LATERAL.length, drills: DRILLS.length }
  };
})();
