/* Qpio i18n layer — UI-chrome strings only (D-035 / D-022: FR first).
   - Language preference: localStorage "curio.lang" = "auto" | "en" | "fr" (raw
     string, not JSON — read before app.js boots).
   - window.QLANG: resolved language ("en" | "fr").
   - window.t(s): returns the translation of the EXACT English string s when
     QLANG !== "en" and a dictionary entry exists; otherwise returns s unchanged.
   - window.I18N.fr: one flat dict keyed by the exact English source string.
     Keys must match app.js/index.html byte-for-byte (including … ’ and
     trailing spaces). Values use French typography: espace insécable ( )
     before ! ? : and inside « », apostrophe typographique (’), tutoiement.
   - Templates: keys may contain {placeholders}; app.js fills them AFTER t().
   - Factual content (questions, statements, packs) is NOT translated here —
     it ships via per-language banks (questions.fr.js / truthlab.fr.js) from
     the Editor-in-Chief's verified pipeline. */
(function () {
  "use strict";

  // ---------- resolve language ----------
  var pref = "auto";
  try { pref = localStorage.getItem("curio.lang") || "auto"; } catch (e) {}
  if (pref !== "en" && pref !== "fr") pref = "auto";
  var resolved = pref;
  if (resolved === "auto") {
    resolved = (navigator.language || "").toLowerCase().indexOf("fr") === 0 ? "fr" : "en";
  }
  window.QLANG = resolved;

  // Exact English innerHTML of the iOS install hint (mirrors index.html).
  var IOS_HINT_EN = 'Install Qpio: tap <b>Share</b> <span style="font-size:16px">􀈂</span> then <b>Add to Home Screen</b>.';

  // ---------- French dictionary ----------
  window.I18N = {
    fr: {
      // --- static chrome (index.html) ---
      "Install Qpio: tap <b>Share</b> <span style=\"font-size:16px\">􀈂</span> then <b>Add to Home Screen</b>.":
        "Installe Qpio : touche <b>Partager</b> <span style=\"font-size:16px\">􀈂</span> puis <b>Sur l’écran d’accueil</b>.",
      "⬇ Install": "⬇ Installer",
      "Comfort & settings": "Confort et réglages",
      "Comfort and settings": "Confort et réglages",
      "knowledge · free · forever": "savoir · gratuit · pour toujours",
      "Dismiss": "Fermer",

      // --- home: hero ---
      "Free forever": "Gratuit pour toujours",
      "Kids mode": "Mode enfants",
      "Feed your brain today.": "Nourris ton cerveau aujourd’hui.",
      "Five questions. Same for everyone, everywhere. Every answer teaches you something worth knowing. Keep the streak alive.":
        "Cinq questions. Les mêmes pour tout le monde, partout. Chaque réponse t’apprend quelque chose qui vaut la peine d’être su. Garde ta série en vie.",
      "Review today's ✓": "Revoir le défi du jour ✓",
      "Play daily challenge": "Jouer au défi du jour",
      "🔥 1 day": "🔥 1 jour",
      "🔥 {n} days": "🔥 {n} jours",

      // --- home: Memory Vault card ---
      "🗝️ Memory Vault": "🗝️ Coffre de la mémoire",
      "1 fact ready to strengthen. Beat them 5 times over 2 months and they’re yours for good.":
        "1 fait à consolider. Réussis-le 5 fois sur 2 mois et il est à toi pour de bon.",
      "{n} facts ready to strengthen. Beat them 5 times over 2 months and they’re yours for good.":
        "{n} faits à consolider. Réussis-les 5 fois sur 2 mois et ils sont à toi pour de bon.",
      "Review": "Réviser",
      "All {n} facts strengthened for now. Next review: {date}. Facts mastered for good: {m} 🏅":
        "Tes {n} faits sont consolidés pour l’instant. Prochaine révision : {date}. Faits maîtrisés pour de bon : {m} 🏅",

      // --- home: mode cards ---
      "Quick-Fire": "Quiz éclair",
      "Ten questions, {s}s each. Chase your high score.": "Dix questions, {s} s chacune. Bats ton record.",
      "Ten questions, no timer. Chase your high score.": "Dix questions, sans chrono. Bats ton record.",
      "Daily Challenge": "Défi du jour",
      "Done today — {score}/{total}. Come back tomorrow.": "Fait pour aujourd’hui — {score}/{total}. Reviens demain.",
      "Today's five. Shareable score. The daily ritual.": "Les cinq du jour. Un score à partager. Le rituel quotidien.",
      "Fact or Fake?": "Vrai ou Faux ?",
      "Real facts hide among convincing fakes. Spot the tricks — every verdict comes with a source.":
        "De vrais faits se cachent parmi des faux très convaincants. Repère les pièges — chaque verdict vient avec sa source.",
      "Before you travel": "Avant de partir",
      "{n} cities, told from their own history. Learn the place, the food, and a few words before you go.":
        "{n} villes, racontées depuis leur propre histoire. Découvre le lieu, la cuisine et quelques mots avant d’y aller.",

      // --- home: quick-fire picker ---
      "Quick-Fire topic": "Thème du Quiz éclair",
      "History by region — every part of the world, on its own terms:":
        "L’histoire par région — chaque partie du monde, selon ses propres termes :",
      "Start Quick-Fire ⚡": "Lancer le Quiz éclair ⚡",
      "All": "Tout",
      "🌍 All regions": "🌍 Toutes les régions",

      // --- categories (display only — stored values stay English) ---
      "History": "Histoire",
      "Science": "Science",
      "Geography": "Géographie",
      "Arts": "Arts",
      "Tech": "Tech",
      "Nature": "Nature",

      // --- region labels (display only) ---
      "Africa": "Afrique",
      "Americas": "Amériques",
      "Asia": "Asie",
      "Europe": "Europe",
      "Middle East": "Moyen-Orient",
      "Global": "Mondial",

      // --- Brain Map ---
      "🧠 Your Brain Map": "🧠 Ta carte du cerveau",
      "Accuracy by domain — earn Sage in all six.": "Précision par domaine — décroche le rang de Sage dans les six.",
      "{pct}% of {n}": "{pct} % sur {n}",
      "unexplored": "inexploré",
      "Unexplored": "Inexploré",
      "Explorer": "Explorateur",
      "Apprentice": "Apprenti",
      "Scholar": "Érudit",
      "Sage": "Sage",

      // --- leaderboard ---
      "🏆 Quick-Fire leaderboard (this device)": "🏆 Classement Quiz éclair (cet appareil)",
      "No scores yet. Play Quick-Fire to claim the top spot.": "Pas encore de score. Joue au Quiz éclair pour prendre la première place.",

      // --- stats card ---
      "Your stats": "Tes statistiques",
      "current streak": "série en cours",
      "best streak": "meilleure série",
      "quick-fire best": "record Quiz éclair",
      "facts mastered": "faits maîtrisés",

      // --- footer ---
      "Qpio — knowledge is free, forever. No ads, no data selling.":
        "Qpio — le savoir est gratuit, pour toujours. Pas de pub, pas de vente de données.",
      "I am curious to become wise. 🧠": "La curiosité me rend sage. 🧠",

      // --- comfort panel ---
      "← Home": "← Accueil",
      "Knowledge is for everyone. Tune Qpio to the way <b>you</b> read, hear and think — nothing here is ever paywalled.":
        "Le savoir est pour tout le monde. Règle Qpio selon <b>ta</b> façon de lire, d’écouter et de penser — rien ici n’est jamais payant.",
      "⏱️ Quick-Fire timer": "⏱️ Chrono du Quiz éclair",
      "Timers measure speed, not knowledge. Turn them off if they get in the way — scoring adapts fairly.":
        "Un chrono mesure la vitesse, pas le savoir. Désactive-le s’il te gêne — le score s’adapte équitablement.",
      "Normal (15s)": "Normal (15 s)",
      "Relaxed (30s)": "Détendu (30 s)",
      "Off": "Désactivé",
      "On": "Activé",
      "🔤 Dyslexia-friendly reading": "🔤 Lecture adaptée à la dyslexie",
      "Wider spacing, taller lines, a rounder font.": "Espacement élargi, lignes plus hautes, police plus ronde.",
      "🔍 Text size": "🔍 Taille du texte",
      "Normal": "Normal",
      "Large": "Grand",
      "Extra large": "Très grand",
      "🔊 Read questions aloud": "🔊 Lecture des questions à voix haute",
      "Qpio speaks each question, its options, and the depth fact. Uses your device's built-in voice — free, even offline.":
        "Qpio lit chaque question, ses options et le fait à retenir. Utilise la voix intégrée de ton appareil — gratuit, même hors ligne.",
      "Read aloud is on. Every question will be spoken.": "La lecture à voix haute est activée. Chaque question sera lue.",
      "🎬 Motion": "🎬 Animations",
      "Reduced turns off animations and transitions.": "« Réduites » désactive les animations et les transitions.",
      "Full": "Toutes",
      "Reduced": "Réduites",
      "🌓 Contrast": "🌓 Contraste",
      "High": "Élevé",
      "👶 Age mode": "👶 Tranche d’âge",
      "Kids mode uses kid-friendly questions only (ages ~8–12). No account, no tracking — ever.":
        "Le mode enfants n’utilise que des questions adaptées aux enfants (environ 8–12 ans). Pas de compte, pas de traçage — jamais.",
      "Everyone": "Tout le monde",
      "Kids (8–12)": "Enfants (8–12 ans)",
      "Auto follows your device language. Changing this reloads the app.":
        "Auto suit la langue de ton appareil. Changer recharge l’appli.",
      "Replay the intro": "Revoir l’intro",
      "Reset all my data on this device": "Effacer toutes mes données sur cet appareil",
      "Erase streaks, scores, vault and settings on this device?":
        "Effacer les séries, les scores, le coffre et les réglages sur cet appareil ?",

      // --- quiz engine ---
      "← Quit": "← Quitter",
      "Easy": "Facile",
      "Medium": "Moyen",
      "Hard": "Difficile",
      "Vault": "Coffre",
      "Read this question aloud": "Lire cette question à voix haute",
      "🧠 You’ve seen this one. Strengthen it: recall the answer from memory first (+25).":
        "🧠 Tu l’as déjà vue. Consolide-la : retrouve d’abord la réponse de mémoire (+25).",
      "Type your answer…": "Écris ta réponse…",
      "Type your answer from memory": "Écris ta réponse de mémoire",
      "Check": "Vérifier",
      "Show the options instead": "Montre-moi plutôt les options",
      "Correct! ": "Correct ! ",
      "Time! ": "Temps écoulé ! ",
      "Not quite. ": "Pas tout à fait. ",
      "📖 Check the source ↗": "📖 Vérifie la source ↗",
      "Next →": "Suivant →",
      "See results →": "Voir les résultats →",
      "🕳️ Go deeper": "🕳️ Creuser plus loin",
      "🕳️ Bottom reached": "🕳️ Fond atteint",

      // --- daily result ---
      "Today's challenge": "Le défi du jour",
      "🔥 1-day streak": "🔥 Série de 1 jour",
      "🔥 {n}-day streak": "🔥 Série de {n} jours",
      " — your best ever!": " — ton record absolu !",
      "🗝️ 1 fact added to your Memory Vault — they’ll come back until you own them.":
        "🗝️ 1 fait ajouté à ton Coffre de la mémoire — il reviendra jusqu’à ce que tu le maîtrises.",
      "🗝️ {n} facts added to your Memory Vault — they’ll come back until you own them.":
        "🗝️ {n} faits ajoutés à ton Coffre de la mémoire — ils reviendront jusqu’à ce que tu les maîtrises.",
      "Share result": "Partager le résultat",
      "Home": "Accueil",
      "1-day streak": "série de 1 jour",
      "{n}-day streak": "série de {n} jours",
      "free, forever.": "gratuit, pour toujours.",
      "Shared! 🎉": "Partagé ! 🎉",
      "Copied to clipboard! 📋 Paste it anywhere.": "Copié dans le presse-papiers ! 📋 Colle-le où tu veux.",

      // --- praise (quiz results) ---
      "Flawless. Certified sage. 🧠": "Sans faute. Niveau sage atteint. 🧠",
      "Sharp. Very sharp.": "Brillant. Vraiment brillant.",
      "Solid work.": "Du solide.",
      "Room to grow — you learned something.": "Encore de la marge — mais tu as appris quelque chose.",
      "Everyone starts somewhere. Now you know more.": "Tout le monde commence quelque part. Maintenant, tu en sais plus.",

      // --- vault session result ---
      "Vault cleared. 🗝️": "Coffre vidé. 🗝️",
      "Strengthening in progress.": "Consolidation en cours.",
      "{a} climbed the ladder · {b} reset to tomorrow": "{a} en progression · {b} à revoir demain",
      "Facts mastered for good so far: {n} 🏅": "Faits maîtrisés pour de bon jusqu’ici : {n} 🏅",
      "Review more": "Réviser encore",

      // --- city packs (UI chrome only — pack content stays English for now) ---
      "← Cities": "← Villes",
      "Learn a place before you land — its real story (not just the tourist version), its food, and a few words of the local language. Free, offline, no ads.":
        "Apprends à connaître un lieu avant d’atterrir — sa vraie histoire (pas seulement la version touristique), sa cuisine et quelques mots de la langue locale. Gratuit, hors ligne, sans pub.",
      "▶ Play the {city} quiz ({n})": "▶ Jouer au quiz {city} ({n})",
      "Key phrases": "Phrases clés",
      "Say it": "Écouter",
      "🧭 Know before you go": "🧭 À savoir avant de partir",
      "ready for your trip 🧳": "le voyage peut commencer 🧳",
      "Play again": "Rejouer",
      "Back to {city}": "Retour à {city}",

      // --- Fact or Fake ---
      "Fact — this is real": "Vrai — c’est un fait",
      "Fake — don’t fall for it": "Faux — ne te fais pas avoir",
      "Read aloud": "Lire à voix haute",
      "Nice catch! ": "Bien vu ! ",
      "Gotcha — ": "Et non — ",
      "🏆 New best!": "🏆 Nouveau record !",
      "Unfoolable. 🔎": "Impossible à berner. 🔎",
      "Sharp eye for nonsense.": "Un œil affûté pour débusquer le faux.",
      "The fakes are sneaky — that’s the point.": "Les faux sont sournois — c’est fait exprès.",
      "Now you know the tricks. They only work once.": "Maintenant tu connais les ficelles. Elles ne marchent qu’une fois.",
      "Every claim you just checked had a source. Real life should be so kind — so ask for one.":
        "Chaque affirmation que tu viens de vérifier avait une source. La vraie vie devrait en faire autant — alors exige-la.",

      // --- quick-fire result ---
      "🏆 New high score!": "🏆 Nouveau record !",
      "{c}/{t} correct": "{c}/{t} bonnes réponses",
      "Save to leaderboard": "Enregistrer au classement",
      "Name for the leaderboard:": "Ton nom pour le classement :",
      "Saved! ⭐": "Enregistré ! ⭐",

      // --- onboarding ---
      "Knowledge should be free.": "Le savoir devrait être gratuit.",
      "Qpio (say: cue-pee-oh) is a free knowledge app — no ads, no paywalls, ever. Every answer teaches you a fact worth keeping, with the source one tap away.":
        "Qpio (prononce : « ku-pio ») est une appli de savoir gratuite — sans pub, sans paywall, pour toujours. Chaque réponse t’apprend un fait qui vaut la peine d’être retenu, avec la source à portée de doigt.",
      "Five questions a day.": "Cinq questions par jour.",
      "Everyone in the world gets the same daily five. Keep your streak alive — and facts you miss come back until you own them for good.":
        "Tout le monde reçoit les cinq mêmes questions chaque jour. Garde ta série en vie — et les faits que tu rates reviennent jusqu’à ce que tu les maîtrises pour de bon.",
      "Made for the way you learn.": "Conçu pour ta façon d’apprendre.",
      "Timers off, dyslexia-friendly reading, read-aloud, high contrast — free in Comfort settings (⚙️). A Kids mode too: no accounts, no tracking.":
        "Chrono désactivable, lecture adaptée à la dyslexie, lecture à voix haute, contraste élevé — gratuits dans les réglages Confort (⚙️). Et un mode enfants : pas de compte, pas de traçage.",
      "Play today's challenge ▶": "Jouer au défi du jour ▶",
      "Skip": "Passer"
    }
  };

  // ---------- t() ----------
  window.t = function (s) {
    var lang = window.QLANG;
    if (lang !== "en" && window.I18N[lang] && Object.prototype.hasOwnProperty.call(window.I18N[lang], s)) {
      return window.I18N[lang][s];
    }
    return s;
  };

  // ---------- static index.html chrome ----------
  // i18n.js loads at the end of <body>, after these elements exist.
  document.documentElement.lang = resolved;
  if (resolved !== "en") {
    var hint = document.getElementById("iosHintText");
    if (hint) hint.innerHTML = window.t(IOS_HINT_EN);
    var iosClose = document.getElementById("iosClose");
    if (iosClose) iosClose.setAttribute("aria-label", window.t("Dismiss"));
    var install = document.getElementById("installBtn");
    if (install) install.textContent = window.t("⬇ Install");
    var gear = document.getElementById("gearBtn");
    if (gear) {
      gear.title = window.t("Comfort & settings");
      gear.setAttribute("aria-label", window.t("Comfort and settings"));
    }
    var tag = document.querySelector(".top .tag");
    if (tag) tag.textContent = window.t("knowledge · free · forever");
  }
})();
