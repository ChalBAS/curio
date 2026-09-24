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
      // --- leaderboard identity + how the score works (2026-08-13) ---
      "You": "Toi",
      "🏷️ Your name on the leaderboard": "🏷️ Ton nom au classement",
      "Your name on the leaderboard": "Ton nom au classement",
      "Your name on the board (optional)": "Ton nom au classement (facultatif)",
      "Shown only on this device. Leave it blank and the board simply says “You”.":
        "Visible uniquement sur cet appareil. Laisse-le vide et le classement affichera simplement « Toi ».",
      "How these points are worked out": "Comment ces points sont calculés",
      "<b>100</b> for every right answer.": "<b>100</b> pour chaque bonne réponse.",
      "<b>up to +150</b> for speed — 10 points for each second still on the clock, capped at 15 seconds, so Relaxed can never out-score Normal.":
        "<b>jusqu’à +150</b> pour la vitesse — 10 points par seconde restant au chrono, plafonnés à 15 secondes, pour que le mode Détendu ne puisse jamais dépasser le mode Normal.",
      "<b>+25 or +50</b> when the question is a harder one.": "<b>+25 ou +50</b> quand la question est plus difficile.",
      "<b>+25</b> when you recall a Vault answer from memory before seeing the options.":
        "<b>+25</b> quand tu retrouves de mémoire une réponse du Coffre avant de voir les options.",
      "A wrong answer scores nothing — it never takes points away.":
        "Une mauvaise réponse ne rapporte rien — elle n’enlève jamais de points.",
      "Saved as your best — {pts} points. ⭐": "Enregistré comme ton meilleur score — {pts} points. ⭐",
      "Your best is still {pts} points.": "Ton meilleur score reste {pts} points.",

      "Free forever": "Gratuit pour toujours",
      // "Free to play" replaces "Free forever" on the hero (CEO, 2026-08-13:
      // "this is more accurate"). The old key stays until every surface moves.
      "Free to play": "Gratuit",
      "Kids mode": "Mode enfants",
      "Feed your brain today.": "Nourris ton cerveau aujourd’hui.",
      "Five questions. Same for everyone, everywhere. Every answer teaches you something worth knowing.":
        "Cinq questions. Les mêmes pour tout le monde, partout. Chaque réponse t’apprend quelque chose qui vaut la peine d’être su.",
      "Review today's ✓": "Revoir le défi du jour ✓",
      "Play daily challenge": "Jouer au défi du jour",
      "▶ Resume — question {n} of {total}": "▶ Reprendre — question {n} sur {total}",
      "You left today’s challenge part-finished. Pick it up where you stopped — it waits until tomorrow’s five arrive.":
        "Tu as laissé le défi du jour en cours. Reprends là où tu t’es arrêté — il t’attend jusqu’aux cinq questions de demain.",
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

      // --- tab bar (FEAT-027) ---
      // "Train", not "Games": Qpio is not a games app (CEO, 2026-08-06).
      "Main navigation": "Navigation principale",

      // --- result screen + the shelf (CEO design, 2026-08-08) ---
      "{score} out of {total}": "{score} sur {total}",
      "Today": "Aujourd’hui",
      "🗝️ 1 fact saved": "🗝️ 1 fait mis de côté",
      "🗝️ {n} facts saved": "🗝️ {n} faits mis de côté",
      "Topics you might want to know more about": "Des sujets que tu voudras peut-être creuser",
      "Curiosity doesn’t stop here.": "La curiosité ne s’arrête pas là.",
      // CEO, 2026-08-08: "in French we don't say 'raté', we say incorrect or
      // correct — raté has negative connotations, it is something we say to
      // insult people." Both my earlier attempts ("Raté", then "Manqué") judged
      // the person. These state the answer.
      "Missed": "Incorrect",
      "Not quite": "Incorrect",
      "Time": "Temps écoulé",
      "Correct": "Correct",
      "Sources": "Sources",
      "Share": "Partager",
      "Photo: {by} · {lic}": "Photo : {by} · {lic}",

      // --- Keep exploring lanes. Passed as t(L.label) from golinks.js, so
      // check_i18n.py cannot see them — they are listed here by hand. ---
      // --- second-level filters: sciences, and the travel categories ---
      "✨ All": "✨ Tout",
      "Pick a science:": "Choisis une science :",
      "Pick what you like to explore:": "Choisis ce que tu aimes explorer :",
      "Life Sciences": "Sciences de la vie",
      "Chemistry": "Chimie",
      "Physics": "Physique",
      "Earth & Space": "Terre et espace",
      "Mathematics": "Mathématiques",
      "Social Sciences": "Sciences sociales",
      "Countries & Flags": "Pays et drapeaux",
      "Landscapes": "Paysages",
      "Cities & Places": "Villes et lieux",

      "Keep exploring": "Continuer à explorer",
      "Surprise me": "Surprends-moi",
      "Back": "Retour",
      "← Back": "← Retour",

      // --- daily notification ---
      "A question a day": "Une question par jour",
      "Get today's actual question as a notification — not a reminder to play, the question itself. On Android, install Qpio to your home screen and your phone will deliver it once a day on its own. Elsewhere it arrives while Qpio is open. Turn it off any time.":
        "Reçois la vraie question du jour en notification — pas un rappel de jouer, la question elle-même. Sur Android, installe Qpio sur ton écran d’accueil et ton téléphone te la livrera une fois par jour, tout seul. Ailleurs, elle arrive quand Qpio est ouvert. Désactivable à tout moment.",
      "Your browser cannot show notifications. On iPhone, add Qpio to your home screen first.":
        "Ton navigateur ne peut pas afficher de notifications. Sur iPhone, ajoute d’abord Qpio à l’écran d’accueil.",
      "Notifications are blocked for this site in your browser settings.":
        "Les notifications sont bloquées pour ce site dans les réglages de ton navigateur.",
      "Turn on": "Activer",
      "Turn off": "Désactiver",
      "from": "à partir de",
      "Send a test now": "Envoyer un test maintenant",
      "Permission": "Autorisation",
      "granted": "accordée",
      "denied": "refusée",
      "default": "pas encore demandée",
      "yes": "oui",
      "Installed as an app": "Installée comme application",
      "no — needed for automatic delivery": "non — nécessaire pour la livraison automatique",
      "Sent today": "Envoyée aujourd’hui",
      "Waiting — delivers from {h}:00 once your phone wakes the app": "En attente — livrée à partir de {h}:00, dès que ton téléphone réveille l’appli",
      "Automatic delivery armed": "Livraison automatique armée",
      "Automatic delivery not armed yet — open Qpio a few times so the phone trusts it, then toggle off and on.": "Livraison automatique pas encore armée — ouvre Qpio quelques fois pour que le téléphone lui fasse confiance, puis désactive et réactive.",
      "This browser cannot wake Qpio on its own (needs Chrome on Android); the question arrives when you open Qpio.": "Ce navigateur ne peut pas réveiller Qpio tout seul (il faut Chrome sur Android) ; la question arrive quand tu ouvres Qpio.",
      "Test sent — check your notification shade. Tapping it opens today's challenge.": "Test envoyé — regarde tes notifications. En la touchant, tu ouvres le défi du jour.",
      "Could not reach the service worker — reload once and try again.": "Impossible de joindre le service worker — recharge la page et réessaie.",
      "Get today's actual question as a notification — the question itself, and tapping it opens Qpio straight into the daily challenge. On Android, install Qpio to your home screen and your phone delivers it on its own. Turn it off any time.": "Reçois la vraie question du jour en notification — la question elle-même, et en la touchant tu ouvres Qpio directement sur le défi du jour. Sur Android, installe Qpio sur ton écran d’accueil et ton téléphone la livre tout seul. Désactivable à tout moment.",
      "{n} to explore": "{n} à explorer",
      "Nothing here yet": "Rien ici pour l’instant",
      // The short form, for the three doors under an answer: at 360px a
      // cell is 112px wide and the long sentence truncates mid-word.
      "None yet": "Rien",

      // --- the country you represent ---
      "The country you represent": "Le pays que tu représentes",
      "Which country do you represent?": "Quel pays représentes-tu ?",
      "Prefer not to say": "Je préfère ne pas le dire",
      // The one question asked at onboarding about how someone found Qpio.
      // The option labels are translated too: they are passed through t() from
      // a list, so the scanner cannot see them and would otherwise leave a
      // French reader a French screen with an English dropdown on it.
      "How did you hear about Qpio?": "Comment as-tu connu Qpio ?",
      "One tap, and it helps us know where to put our effort. It is kept as a single word — no link to you, and nothing follows you around.": "Un seul geste, et cela nous aide à savoir où porter nos efforts. C’est gardé sous la forme d’un simple mot — aucun lien avec toi, et rien ne te suit.",
      "A search engine": "Un moteur de recherche",
      "Someone told me": "Quelqu’un m’en a parlé",
      "Somewhere else": "Ailleurs",
      "I do not remember": "Je ne m’en souviens plus",

      // --- Settings › Privacy & your data (24 Sep 2026) ---
      // The promise below (D-087) is shown only on this screen. Its French has
      // not yet been approved (open question 4 of the build spec).
      "Privacy & your data": "Confidentialité et tes données",
      "What is kept on this device, what Qpio counts, and your choices.":
        "Ce qui est gardé sur cet appareil, ce que Qpio compte et tes choix.",
      "Your curiosity is yours.": "Ta curiosité t’appartient.",
      "Qpio collects only information that has a defined purpose for improving the product, understanding its performance, operating a feature the reader chose, or fulfilling a transaction the reader initiated. We are transparent about what we collect, we do not sell reader data, and anonymous behaviour is not turned into a personal profile.":
        "Qpio ne collecte que les informations qui ont une finalité définie : améliorer le produit, comprendre ses performances, faire marcher une fonctionnalité choisie par le lecteur ou réaliser une transaction qu’il a initiée. Nous sommes transparents sur ce que nous collectons, nous ne vendons pas les données de nos lecteurs et les comportements anonymes ne sont pas transformés en profils personnels.",
      "On this device": "Sur cet appareil",
      "Your progress, the facts in your Memory Vault, your settings and your leaderboard name are kept in this browser, on this device.":
        "Ta progression, les faits de ton Coffre de la mémoire, tes réglages et ton nom au classement sont gardés dans ce navigateur, sur cet appareil.",
      "See what is stored": "Voir ce qui est enregistré",
      "not set": "aucun",
      "Scores on this device's leaderboard": "Scores au classement de cet appareil",
      "not chosen": "non choisi",
      "How you said you found Qpio": "Comment tu as connu Qpio",
      "not answered": "sans réponse",
      "Facts in your Memory Vault": "Faits dans ton Coffre de la mémoire",
      "Questions answered": "Questions auxquelles tu as répondu",
      "{n}, {c} of them correct": "{n}, dont {c} justes",
      "Days you played the Daily Challenge": "Jours où tu as joué au Défi du jour",
      "{n}, since {date}": "{n}, depuis le {date}",
      "none": "aucun",
      "{n} now, best {b}": "{n} en cours, record {b}",
      "Best Quick-Fire score": "Record au Quiz éclair",
      "Kinds kept in your Gym Vault": "Types gardés dans ton coffre du gym",
      "Questions seen in the last 45 days": "Questions vues ces 45 derniers jours",
      "Your settings": "Tes réglages",
      "text size, timer, reading aids, age mode and language":
        "taille du texte, chrono, aides à la lecture, tranche d’âge et langue",
      "Daily reminder": "Rappel quotidien",
      "on, from {h}:00": "activé, à partir de {h}:00",
      "on": "activé",
      "off": "désactivé",
      "Counting": "Comptage",
      "When this device first played (used for counting)": "Première partie sur cet appareil (sert au comptage)",
      "week of {date}": "semaine du {date}",
      "Round summaries waiting to be sent": "Résumés de parties en attente d’envoi",
      "A count of the summaries sent, and of any that could not be": "Le nombre de résumés envoyés, et de ceux qui n’ont pas pu l’être",
      "kept only here, never sent": "gardé ici seulement, jamais envoyé",
      "Pictures kept so they load faster": "Images gardées pour s’afficher plus vite",
      "Small notes that help the app work": "Petites notes qui aident l’app à fonctionner",
      "Your browser is blocking storage on this site, so nothing is kept here.":
        "Ton navigateur bloque le stockage sur ce site : rien n’est gardé ici.",
      "Save a copy": "Enregistrer une copie",
      "A file with everything listed above, in full, laid out for computers to read. To move your progress to another device, use your backup code instead.":
        "Un fichier avec tout ce qui est listé ci-dessus, en entier, mis en forme pour être lu par un ordinateur. Pour transférer ta progression sur un autre appareil, utilise plutôt ton code de sauvegarde.",
      "Saved. Look in your downloads.": "Enregistré. Regarde dans tes téléchargements.",
      "Your browser would not save the file. Here is the same text, to copy:":
        "Ton navigateur n’a pas voulu enregistrer le fichier. Voici le même texte, à copier :",
      "Copy the text": "Copier le texte",
      "Everything Qpio keeps about you in this browser, on this device, saved on {date}.":
        "Tout ce que Qpio garde sur toi dans ce navigateur, sur cet appareil, enregistré le {date}.",
      "Delete everything on this device": "Tout effacer sur cet appareil",
      "Delete everything on this device?": "Tout effacer sur cet appareil ?",
      "This deletes:": "Cela efface :",
      "your progress, your Memory Vault, your streak and your scores":
        "ta progression, ton Coffre de la mémoire, ta série et tes scores",
      "your name, country and settings, including language": "ton nom, ton pays et tes réglages, langue comprise",
      "your daily reminder, which will stop": "ton rappel quotidien, qui s’arrêtera",
      "the pictures kept so they load faster": "les images gardées pour s’afficher plus vite",
      "This cannot be undone. Qpio has no copy that could bring it back.":
        "C’est définitif. Qpio n’en a aucune copie qui permettrait de le récupérer.",
      "To keep your progress, copy your backup code in Settings first.":
        "Pour garder ta progression, copie d’abord ton code de sauvegarde dans les Réglages.",
      "Counting stays off.": "Le comptage reste désactivé.",
      "Kids mode stays on.": "Le mode enfants reste activé.",
      "Your browser will still remember that you allowed notifications. You can remove that in your browser's settings.":
        "Ton navigateur se souviendra encore que tu as autorisé les notifications. Tu peux retirer cette autorisation dans ses réglages.",
      "Unsure? Ask a grown-up first.": "Un doute ? Demande d’abord à un adulte.",
      "Delete everything": "Tout effacer",
      "Keep everything": "Tout garder",
      "Deleted. Qpio is starting again.": "Effacé. Qpio redémarre.",
      "Not everything could be deleted. Try again, or clear this site's data in your browser's settings.":
        "Tout n’a pas pu être effacé. Réessaie, ou efface les données de ce site dans les réglages de ton navigateur.",
      "Counting, to improve the questions": "Le comptage, pour améliorer les questions",
      "When you finish or leave a round, this device sends Qpio one short summary.":
        "Quand tu termines ou quittes une partie, cet appareil envoie un court résumé à Qpio.",
      "Counting is on unless you turn it off. Qpio works the same either way.":
        "Le comptage est activé sauf si tu le désactives. Qpio fonctionne de la même façon dans les deux cas.",
      "The summary says:": "Le résumé indique :",
      "which questions you saw, in what order, and whether each answer was right":
        "quelles questions tu as vues, dans quel ordre, et si chaque réponse était juste",
      "which game it was, such as the Daily Challenge or Quick-Fire, and whether you finished":
        "quel jeu c’était, comme le Défi du jour ou le Quiz éclair, et si tu l’as terminé",
      "the day and your language": "le jour et ta langue",
      "whether Kids mode is on": "si le mode enfants est activé",
      "the type of device, and whether Qpio is installed": "le type d’appareil, et si Qpio est installé",
      "which version of the app and of the questions you had": "la version de l’app et celle des questions que tu avais",
      "how you said you found Qpio": "comment tu as dit avoir connu Qpio",
      "roughly how many weeks since this device first played":
        "depuis combien de semaines environ cet appareil utilise Qpio",
      "Qpio adds the country your internet connection comes from. It does not use the country you picked.":
        "Qpio y ajoute le pays d’où vient ta connexion internet. Il n’utilise pas le pays que tu as choisi.",
      "The summary holds no name and no number that points back to you.":
        "Le résumé ne contient ni nom, ni numéro qui permette de remonter jusqu’à toi.",
      "Qpio's server sees your internet address when the summary arrives. Qpio does not store it.":
        "Le serveur de Qpio voit ton adresse internet à l’arrivée du résumé. Qpio ne la conserve pas.",
      "Only totals are kept, for 13 months.": "Seuls des totaux sont gardés, pendant 13 mois.",
      "Rounds played in Kids mode are not counted.": "Les parties jouées en mode enfants ne sont pas comptées.",
      "Rounds in Kids mode are counted the same way, marked as Kids rounds.":
        "Les parties en mode enfants sont comptées de la même façon, marquées comme parties enfants.",
      "This choice applies to this browser on this device.": "Ce choix s’applique à ce navigateur, sur cet appareil.",
      "Counting is on.": "Le comptage est activé.",
      "Counting is off. Nothing more is sent from this device, and anything waiting to be sent has been cleared.":
        "Le comptage est désactivé. Plus rien n’est envoyé depuis cet appareil, et ce qui attendait d’être envoyé a été effacé.",
      "Your browser is blocking storage on this site, so nothing is counted here.":
        "Ton navigateur bloque le stockage sur ce site : rien n’est compté ici.",
      "Counting did not load, so nothing is being counted.": "Le comptage ne s’est pas chargé : rien n’est compté.",
      "Your games in Kids mode are not counted. The switch below is for Everyone mode.":
        "Tes parties en mode enfants ne sont pas comptées. Le bouton ci-dessous sert au mode Tout le monde.",
      "When you finish a round, this device tells Qpio how the questions went. Your name is never in it. You can switch this off here, on your own or with a grown-up.":
        "Quand tu finis une partie, cet appareil dit à Qpio comment les questions se sont passées. Ton nom n’y est jamais. Tu peux désactiver cela ici, seul ou avec un adulte.",
      "More detail for grown-ups": "Plus de détails pour les adultes",
      "Other services Qpio uses": "Les autres services utilisés par Qpio",
      "These services see your internet address and type of browser when they send you something. They keep their own records, under their own privacy rules.":
        "Ces services voient ton adresse internet et ton type de navigateur quand ils t’envoient quelque chose. Ils gardent leurs propres traces, selon leurs propres règles de confidentialité.",
      "Cloudflare delivers the app, and stores the counting totals on computers in the European Union.":
        "Cloudflare distribue l’app, et garde les totaux du comptage sur des ordinateurs situés dans l’Union européenne.",
      "Wikimedia sends most of the pictures. It is not told which Qpio page you are on.":
        "Wikimedia fournit la plupart des images. Il ne sait pas sur quelle page de Qpio tu es.",
      "YouTube plays a video only when you open one. It is told which video it is and that it played in Qpio, and it can store information in your browser.":
        "YouTube ne lit une vidéo que si tu en ouvres une. Il sait quelle vidéo c’est et qu’elle a été lue dans Qpio, et il peut enregistrer des informations dans ton navigateur.",
      "Links you tap, such as Open Library, Wikipedia, UNESCO or a museum, open that site like any other visit.":
        "Les liens que tu touches, comme Open Library, Wikipédia, l’UNESCO ou un musée, ouvrent ce site comme n’importe quelle visite.",
      "{name} privacy policy": "Politique de confidentialité de {name}",
      "(opens in a new tab)": "(s’ouvre dans un nouvel onglet)",
      "Some pictures and videos come from other websites. Those websites can see which internet connection asked for them.":
        "Certaines images et vidéos viennent d’autres sites. Ces sites peuvent voir quelle connexion internet les a demandées.",
      "Qpio doesn't interrupt your learning with ads, so there are no advertising settings to change.":
        "Qpio n’interrompt pas ton apprentissage par de la publicité : il n’y a donc aucun réglage publicitaire à changer.",
      "Your rights": "Tes droits",
      "Privacy laws in many countries give you rights over information about you: to see it, correct it, delete it, limit how it is used or say no to it, and to complain.":
        "Dans de nombreux pays, les lois sur la vie privée te donnent des droits sur les informations qui te concernent : les voir, les corriger, les effacer, limiter leur usage ou t’y opposer, et porter plainte.",
      "Qpio can't look you up, because nothing it keeps says who you are. So there is nothing on its side to find, correct or delete.":
        "Qpio ne peut pas te retrouver, parce que rien de ce qu’il garde ne dit qui tu es. Il n’y a donc rien de son côté à retrouver, corriger ou effacer.",
      "A total can sometimes describe one person, for example the only player from a country on a given day.":
        "Un total peut parfois ne décrire qu’une seule personne, par exemple le seul joueur d’un pays un jour donné.",
      "If you think that applies to you, or for any other request, write to {email}. We reply within one month.":
        "Si tu penses que c’est ton cas, ou pour toute autre demande, écris à {email}. Nous répondons sous un mois.",
      "Qpio does not yet have an address you can write to about your data.":
        "Qpio n’a pas encore d’adresse à laquelle tu peux écrire au sujet de tes données.",
      "You can also complain to the data protection regulator where you live. For example:":
        "Tu peux aussi porter plainte auprès de l’autorité de protection des données de ton pays. Par exemple :",
      "CNIL (France)": "la CNIL (France)",
      "ICO (UK)": "l’ICO (Royaume-Uni)",
      "PCPD (Hong Kong)": "le PCPD (Hong Kong)",
      "Qpio doesn't know who you are. Your progress is kept on this device, and you can see it or delete it above.":
        "Qpio ne sait pas qui tu es. Ta progression est gardée sur cet appareil, et tu peux la voir ou l’effacer plus haut.",
      "If something seems wrong, tell a grown-up. They can write to the people whose job is to protect your privacy:":
        "Si quelque chose ne va pas, parles-en à un adulte. Il peut écrire aux personnes dont le métier est de protéger ta vie privée :",
      "If something seems wrong, tell a grown-up. They can write to us at {email}, or to the people whose job is to protect your privacy:":
        "Si quelque chose ne va pas, parles-en à un adulte. Il peut nous écrire à {email}, ou aux personnes dont le métier est de protéger ta vie privée :",
      "Who runs Qpio": "Qui exploite Qpio",
      "Qpio will be run by a company that is not set up yet. Its name will appear here once it is.":
        "Qpio sera exploité par une société qui n’est pas encore créée. Son nom apparaîtra ici dès qu’elle le sera.",
      "Read the full privacy page": "Lire la page de confidentialité complète",

      // --- the agreement screen, before anything else (terms of use, 24 Sep 2026) ---
      "Before you start": "Avant de commencer",
      "Qpio is free. To use it, you need to agree to its {terms} and its privacy notice.":
        "Qpio est gratuit. Pour l’utiliser, tu dois accepter ses {terms} et sa politique de confidentialité.",
      "The {privacy} explains what stays on this device, and what Qpio counts, with no name or identifier attached, to improve the questions and see how Qpio is used. You can switch the counting off here, or at any time in Settings › Privacy & your data.":
        "La {privacy} explique ce qui reste sur cet appareil, et ce que Qpio compte, sans nom ni identifiant, pour améliorer les questions et voir comment Qpio est utilisé. Tu peux désactiver le comptage ici, ou à tout moment dans Réglages › Confidentialité et tes données.",
      "The {privacy} explains what stays on this device, and what Qpio counts, with no name or identifier attached, to improve the questions and see how Qpio is used. You can switch the counting off at any time in Settings › Privacy & your data.":
        "La {privacy} explique ce qui reste sur cet appareil, et ce que Qpio compte, sans nom ni identifiant, pour améliorer les questions et voir comment Qpio est utilisé. Tu peux désactiver le comptage à tout moment dans Réglages › Confidentialité et tes données.",
      "Switch counting off": "Désactiver le comptage",
      "Switch counting back on": "Réactiver le comptage",
      "The {privacy} explains what stays on this device. Rounds played in Kids mode are not counted.":
        "La {privacy} explique ce qui reste sur cet appareil. Les parties jouées en mode enfants ne sont pas comptées.",
      "Terms of use": "Conditions d’utilisation",
      "Privacy notice": "Politique de confidentialité",
      "I agree to the Terms of use and the Privacy notice.":
        "J’accepte les Conditions d’utilisation et la Politique de confidentialité.",
      "Tick the box first to start.": "Coche d’abord la case pour commencer.",
      "Tick the box first to carry on.": "Coche d’abord la case pour continuer.",
      "Under 18? Please read these with a parent or carer.":
        "Tu as moins de 18 ans ? Lis-les avec un parent ou un adulte qui s’occupe de toi.",
      "For grown-ups: please read these rules with the child before they tick the box.":
        "Pour les adultes : merci de lire ces règles avec l’enfant avant qu’il coche la case.",
      "Ask a grown-up who looks after you to read these rules with you.":
        "Demande à un adulte qui s’occupe de toi de lire ces règles avec toi.",
      "The short version for younger readers": "La version courte pour les plus jeunes",
      "Your browser is blocking storage on this site, so Qpio can't remember that you agreed. It will ask again each time you open it.":
        "Ton navigateur bloque le stockage sur ce site : Qpio ne peut pas se souvenir de ton accord. Il te le redemandera à chaque ouverture.",
      "Qpio's rules have changed": "Les règles de Qpio ont changé",
      "What has changed:": "Ce qui a changé :",
      "Please read the new {terms}. To keep using Qpio, tick the box below.":
        "Lis les nouvelles {terms}. Pour continuer à utiliser Qpio, coche la case ci-dessous.",
      "Carry on": "Continuer",
      "Not now": "Pas maintenant",
      "Qpio can't be used until you agree to the new rules. Your progress stays on this device, and you can still save a copy of it or delete it here:":
        "Qpio ne peut pas être utilisé tant que tu n’as pas accepté les nouvelles règles. Ta progression reste sur cet appareil, et tu peux quand même en enregistrer une copie ou tout effacer ici :",
      "Back to the new rules": "Revenir aux nouvelles règles",
      "Ask a grown-up who looks after you to read the new rules with you.":
        "Demande à un adulte qui s’occupe de toi de lire les nouvelles règles avec toi.",
      "Terms of use you agreed to": "Conditions d’utilisation acceptées",
      "{version}, on {date}": "{version}, le {date}",
      "To keep a copy of what is on this device, tap Save a copy above first.":
        "Pour garder une copie de ce qui est sur cet appareil, touche d’abord « Enregistrer une copie » plus haut.",
      "your agreement to the Terms of use, so Qpio will ask again": "ton accord aux Conditions d’utilisation : Qpio te le redemandera",
      "Have a grown-up nearby.": "Demande à un adulte de rester près de toi.",
      "Draft 1": "Projet n° 1",
      "Kids mode shows only questions written for ages 8 to 12.":
        "Le mode enfants ne propose que des questions écrites pour les 8 à 12 ans.",
      "It will place you on your country's board when contests start. Until then it stays on this device and is not sent to Qpio. The country Qpio counts comes from your internet connection, not from this choice.":
        "Il te placera sur le classement de ton pays quand les concours commenceront. D’ici là, il reste sur cet appareil et n’est pas envoyé à Qpio. Le pays que Qpio compte vient de ta connexion internet, pas de ce choix.",

      // --- backup code ---
      "Your progress": "Ta progression",
      "Your progress is currently stored on this device. Copy your backup code before you reinstall or change phone — nothing else can bring it back.":
        "Tout ce que tu as appris est stocké uniquement sur cet appareil. Copie ton code de sauvegarde avant de réinstaller ou de changer de téléphone — rien d’autre ne pourra le récupérer.",
      "Copy backup code": "Copier le code de sauvegarde",
      "Restore from a code": "Restaurer depuis un code",
      "Paste your backup code:": "Colle ton code de sauvegarde :",
      "Restored {n} items. Reopening…": "{n} éléments restaurés. Rechargement…",
      "That code could not be read. Check you copied all of it.":
        "Ce code n’a pas pu être lu. Vérifie que tu l’as copié en entier.",

      // --- city browser ---
      "Cities told from their own history. Learn the place, the food, and a few words before you go.":
        "Des villes racontées depuis leur propre histoire. Découvre le lieu, la cuisine et quelques mots avant d’y aller.",
      "Search a city or country": "Chercher une ville ou un pays",
      "No city matches that yet.": "Aucune ville ne correspond pour l’instant.",
      "One thing to be curious about": "Une chose qui mérite ta curiosité",
      // Shelf names — passed as t(S.label) from discovery.js, so the checker
      // cannot see them. Listed by hand.
      "Meet": "Rencontrer",
      "Visit": "Visiter",
      "Go": "Y aller",
      "Read": "Lire",
      "Watch": "Regarder",
      // A door that opens a search box says so. See golinks.js watchChannel().
      "Search": "Chercher",
      "Dive deeper": "Creuser",
      "Follow your curiosity anywhere.": "Suis ta curiosité où elle te mène.",
      "Documentaries": "Documentaires",
      "Books": "Livres",
      "Museums & Exhibitions": "Musées et expositions",
      "Places": "Lieux",
      "People": "Personnes",
      "Collections": "Collections",


      // --- Go further (D-061) ---
      "🕳️ Go further": "🕳️ Aller plus loin",
      "Start with the ones you missed — that is where the curiosity is.":
        "Commence par celles que tu as ratées — c’est là qu’est la curiosité.",
      "Nothing missed today. Here is where these lead anyway.":
        "Rien de raté aujourd’hui. Voici quand même où tout cela mène.",
      "See it at {where}": "À voir au {where}",
      "Visit {where}": "Visiter {where}",
      "Read about {name}": "Lire sur {name}",
      "Where this came from": "D’où vient cette information",


      // --- Stats: day-one empty state ---
      "Nothing here yet — and that is the point.": "Rien ici pour l’instant — et c’est voulu.",
      "This page is your record. It fills itself in as you play.": "Cette page est ton carnet. Elle se remplit au fil de tes parties.",
      "Your Brain Map": "Ta carte du cerveau",
      "which of the six domains you know best": "lequel des six domaines tu maîtrises le mieux",
      "Facts owned": "Faits acquis",
      "beat a fact 5 times over 2 months and it is yours": "réussis un fait 5 fois en 2 mois et il est à toi",
      "Streak": "Série",
      "shown, never nagged about": "affichée, jamais réclamée",
      "One round is enough to fill it.": "Une seule partie suffit à la remplir.",

      "▶ Resume": "▶ Reprendre",
      "🔍 Text size": "🔍 Taille du texte",
      "Train": "Exercices",
      "Stats": "Progrès",
      "Settings": "Réglages",
      /* The section is "Qpio Gym" in both languages, with the 🧠 icon kept (founder, 24 Sep 2026,
         D-091): the section name carries the brand, and "brain" in words is barred by the claims standard. */
      "Qpio Gym": "Qpio Gym",
      /* ---- Brain Gym, 8 Sep 2026. The section is bilingual from the day it
         ships, not translated afterwards: Qpio is being built as a
         multinational company (Charter v0.11), and a screen that arrives in
         English and gets French later is a screen that arrives twice. */
      "Today’s puzzles": "Les énigmes du jour",
      "Start": "Commencer",
      "Remember these": "Retiens ceci",
      "Take as long as you like. The list will not come back.": "Prends le temps qu’il te faut. La liste ne reviendra pas.",
      "Ready": "Pr\u00eat",
      "Here you practise": "Ici, on s’exerce à",
      "Loading the picture": "L\u2019image arrive",
      "Pace": "Rythme",
      "Get ready": "Pr\u00e9pare-toi",
      "Ways to hold a list": "Pour garder une liste en t\u00eate",
      "Video": "Vid\u00e9o",
      "Close the video": "Fermer la vid\u00e9o",
      "That was the video.": "C\u2019\u00e9tait la vid\u00e9o.",
      "Back to Qpio": "Retour \u00e0 Qpio",
      "Four ways to hold a short list. Try one the next time a list comes up.":
        "Quatre façons de garder une courte liste en tête. Essaie-en une la prochaine fois qu’une liste se présente.",
      "One way people do this:": "Voici comment certains s’y prennent :",
      "More ways": "D\u2019autres fa\u00e7ons",
      "Its history": "Son histoire",
      "Slower": "Plus lent",
      "Slow": "Lent",
      "Very slow": "Tr\u00e8s lent",
      "Keep in my Gym Vault": "Garder dans mon coffre du gym",
      "In your Gym Vault": "Dans ton coffre du gym",
      "Your Gym Vault": "Ton coffre du gym",
      "Your Gym Vault holds three.": "Ton coffre du gym en garde trois.",
      "To keep {name}, take one out.": "Pour garder {name}, retires-en un.",
      "Keep them all": "Tout garder",
      "Take out": "Retirer",
      "Taken out": "Retir\u00e9",
      "Up to three kinds you want to keep an eye on. When one comes up in today’s puzzles or move, it is marked there.":
        "Jusqu’à trois types que tu veux garder à l’œil. Quand l’un d’eux revient dans les énigmes ou le mouvement du jour, il y est signalé.",
      "Mastered so far: {n}": "Acquis jusqu\u2019ici\u00a0: {n}",
      "I have it": "C\u2019est acquis",
      "Finish": "Terminer",
      "Five puzzles done.": "Cinq énigmes terminées.",
      /* ---- Brain Gym pictures, tap puzzles and moves, 21 Sep 2026 ---- */
      "Today’s move": "Le mouvement du jour",
      "Today’s puzzles: done — {n}/{total}": "Les énigmes du jour : terminées — {n}/{total}",
      "Today’s move: done": "Le mouvement du jour : terminé",
      "The next set arrives tomorrow.": "La suite arrive demain.",
      "Done for today. The next set arrives tomorrow.": "Fini pour aujourd’hui. La suite arrive demain.",
      "You just practised": "Tu viens de t’exercer à",
      "Stopped here.": "Arrêté ici.",
      "Today’s move is still here if you want to finish it.": "Le mouvement du jour t’attend si tu veux le finir.",
      "Illustrations generated by AI": "Illustrations générées par IA",
      "Take as long as you like.": "Prends le temps qu’il te faut.",
      "Qpio Gym, today": "Qpio Gym, aujourd’hui",
      "puzzles done, {n}/{total}": "énigmes terminées, {n}/{total}",
      "move done": "mouvement terminé",
      "nothing finished yet": "rien de terminé pour l’instant",
      "Moves — nothing to answer": "Mouvements — rien à répondre",
      "Next step": "Étape suivante",
      "Pause": "Pause",
      "Resume": "Reprendre",
      "Done": "Terminé",
      "Move done.": "Mouvement terminé.",
      "Which hand do you write with?": "De quelle main écris-tu ?",
      "So the moves know which is your other hand. Kept on this device only.": "Pour que les mouvements sachent quelle est ton autre main. Gardé sur cet appareil seulement.",
      "Left": "Gauche",
      "Right": "Droite",
      "I use one hand": "J’utilise une seule main",
      "Change hand": "Changer de main",
      "Watch again": "Revoir",
      "Without the animation this becomes a step-by-step puzzle: here is each move.": "Sans l’animation, c’est une énigme étape par étape : voici chaque mouvement.",
      "Look carefully": "Regarde bien",
      "Want the facts behind the numbers? Mathematics quiz": "Envie des faits derrière les chiffres ? Quiz de mathématiques",
      "step {a} of {b}": "étape {a} sur {b}",
      "Follow the numbers.": "Suis les numéros.",
      "Find the odd tile": "L’intrus dans la grille",
      "One of sixteen is different. Tap it.": "Un sur seize est différent. Touche-le.",
      "Find the twin": "Trouve le jumeau",
      "Four patterns. One is the same as the model.": "Quatre motifs. Un seul est le même que le modèle.",
      "What changed?": "Qu’est-ce qui a changé ?",
      "Look, then look again. One thing moved.": "Regarde, puis regarde encore. Une chose a bougé.",
      "Follow the ball": "Suis la balle",
      "Three balls swap places. Keep your eye on one.": "Trois balles échangent leur place. N’en quitte pas une des yeux.",
      "The other hand": "L’autre main",
      "Follow a moving dot with the hand you never use for it.": "Suis un point qui bouge avec la main que tu n’utilises jamais pour ça.",
      "Thumb to each finger": "Le pouce sur chaque doigt",
      "Touch each finger with your thumb, in an order you did not choose.": "Touche chaque doigt avec le pouce, dans un ordre que tu n’as pas choisi.",
      "Two hands, two shapes": "Deux mains, deux formes",
      "Each hand traces its own shape. At the same time.": "Chaque main trace sa propre forme. En même temps.",
      "A small thing, differently": "Un petit geste, autrement",
      "Four everyday things, done the unusual way.": "Quatre gestes de tous les jours, faits autrement.",
      "Sequences and patterns": "Suites et motifs",
      "Work out the rule, then continue it.": "Trouve la r\u00e8gle, puis continue-la.",
      "Logic and deduction": "Logique et d\u00e9duction",
      "Some always tell the truth, some always lie. Work out which.":
        "Certains disent toujours la v\u00e9rit\u00e9, d\u2019autres mentent toujours. \u00c0 toi de voir qui est qui.",
      "Spatial reasoning": "Raisonnement dans l\u2019espace",
      "Turn it in your head.": "Fais-le tourner dans ta t\u00eate.",
      "Hold a list": "Garder une liste en t\u00eate",
      "Hold a few things at once, then answer.":
        "Garde plusieurs choses en t\u00eate, puis r\u00e9ponds.",
      "Odd one out": "Lequel ne va pas\u00a0?",
      "One of these is not like the others.": "L\u2019un de ces \u00e9l\u00e9ments n\u2019est pas comme les autres.",
      "Estimation": "Estimation",
      "No looking it up. Build the answer out of what you already know.":
        "Rien \u00e0 chercher. Construis la r\u00e9ponse \u00e0 partir de ce que tu sais d\u00e9j\u00e0.",
      "Lateral thinking": "Pens\u00e9e lat\u00e9rale",
      "The answer is obvious \u2014 afterwards.": "La r\u00e9ponse est \u00e9vidente \u2014 apr\u00e8s coup.",
      "Puzzles, not questions. Nothing to know in advance. Some are fun. Some are genuinely hard. You will get better at them with time — everyone does. What that changes anywhere else is for you to find out.":
        "Des casse-têtes, pas des questions. Rien à savoir d’avance. Certains sont amusants. Certains sont vraiment difficiles. Tu t’y amélioreras avec le temps — comme tout le monde. Ce que ça change ailleurs, c’est à toi de le découvrir.",

      // --- home: mode cards ---
      "Quick-Fire": "Quiz éclair",
      "Ten questions, {s}s each. Chase your high score.": "Dix questions, {s} s chacune. Bats ton record.",
      "Ten questions, no timer. Chase your high score.": "Dix questions, sans chrono. Bats ton record.",
      "Ten questions, {s}s each. Run out and the answer is revealed — you still choose when to move on.":
        "Dix questions, {s} s chacune. Si le temps s’écoule, la réponse est dévoilée — tu passes à la suite quand tu veux.",
      "Daily Challenge": "Défi du jour",
      "Resume today's challenge": "Reprendre le défi du jour",
      "Part-finished — question {n} of {total}. Your answers are kept until tomorrow.":
        "En cours — question {n} sur {total}. Tes réponses sont gardées jusqu’à demain.",
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
      "Qpio — knowledge is free, forever.": "Qpio — le savoir est gratuit, pour toujours.",
      "I am curious to become wise. 🧠": "La curiosité me rend sage. 🧠",

      // --- comfort panel ---
      "← Home": "← Accueil",
      "Knowledge is for everyone. Tune Qpio to the way <b>you</b> read, hear and think — nothing here is ever paywalled.":
        "Le savoir est pour tout le monde. Règle Qpio selon <b>ta</b> façon de lire, d’écouter et de penser — rien ici n’est jamais payant.",
      "⏱️ Quick-Fire timer": "⏱️ Chrono du Quiz éclair",
      "Timers measure speed, not knowledge. Turn them off if they get in the way — scoring adapts fairly.":
        "Un chrono mesure la vitesse, pas le savoir. Désactive-le s’il te gêne — le score s’adapte équitablement.",
      "Quick-Fire only — the Daily Challenge is never timed. If the clock runs out the answer is revealed and the question counts as missed; you always move on in your own time. Turn it off if it gets in the way — scoring adapts fairly.":
        "Quiz éclair uniquement — le défi du jour n’est jamais chronométré. Si le temps s’écoule, la réponse est dévoilée et la question compte comme manquée ; c’est toujours toi qui décides quand passer à la suite. Désactive-le s’il te gêne — le score s’adapte équitablement.",
      "Normal (15s)": "Normal (15 s)",
      "Relaxed (30s)": "Détendu (30 s)",
      "Off": "Désactivé",
      "On": "Activé",
      "🔤 Dyslexia-friendly reading": "🔤 Lecture adaptée à la dyslexie",
      "Wider spacing, taller lines, a rounder font.": "Espacement élargi, lignes plus hautes, police plus ronde.",

      "🎯 Focus anchors (bold word starts)": "🎯 Ancres de lecture (débuts de mots en gras)",
      "Bolds the first letters of each word as anchor points for the eye. Some readers find it helps them focus; research hasn't confirmed a benefit. Try it — keep it only if it helps you.": "Met en gras les premières lettres de chaque mot, comme points d'ancrage pour l'œil. Certaines personnes y trouvent une aide à la concentration ; la recherche n'a pas confirmé de bénéfice. Essaie — garde-la seulement si elle t'aide.",      "🔍 Text size": "🔍 Taille du texte",
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
      "AI generated": "Image IA",
      "AI-generated illustration": "Illustration générée par IA",
      "AI-generated video": "Vidéo générée par IA",
      "Play the demo": "Voir la démonstration",
      "This video was generated by AI to show the move. It does not show a real person.": "Cette vidéo a été générée par IA pour montrer le geste. Aucune personne réelle n’y apparaît.",
      "Start now": "C’est parti",
      "This image was generated by AI to show the pose. It does not show a real person.":
        "Cette image a été générée par IA pour montrer la position. Aucune personne réelle n’y apparaît.",
      "tap Next step when you like": "touche Étape suivante quand tu veux",
      "This image was generated by AI. It illustrates the idea — it is not a photograph of the thing.":
        "Cette image a été générée par une IA. Elle illustre l’idée : ce n’est pas une photographie de la chose.",
      "Everyone": "Tout le monde",
      "Kids (8–12)": "Enfants (8–12 ans)",
      "Auto follows your device language. Changing this reloads the app.":
        "Auto suit la langue de ton appareil. Changer recharge l’appli.",
      "Replay the intro": "Revoir l’intro",

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
      /* The Brain Gym set uses the bare word between puzzles, where the quiz
         uses the arrow form. Two strings, because they are two labels. */
      "Next": "Suivant",
      "See results →": "Voir les résultats →",
      "🕳️ Go deeper": "🕳️ Creuser plus loin",
      "🕳️ Bottom reached": "🕳️ Fond atteint",

      // --- cultural resource network (CRN cards) ---
      "Go Further — Cultural Resources": "Aller plus loin — Ressources culturelles",
      "Verified": "Vérifié",
      "Explore ↗": "Explorer ↗",

      // --- daily result ---
      "Gathering your discoveries…": "On rassemble tes découvertes…",
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

      // --- vault session result ---
      "Vault cleared. 🗝️": "Coffre vidé. 🗝️",
      "Strengthening in progress.": "Consolidation en cours.",
      "{a} climbed the ladder · {b} reset to tomorrow": "{a} en progression · {b} à revoir demain",
      "Facts mastered for good so far: {n} 🏅": "Faits maîtrisés pour de bon jusqu’ici : {n} 🏅",
      "Review more": "Réviser encore",

      // --- city packs (UI chrome only — pack content stays English for now) ---
      "← Cities": "← Villes",
      "Learn a place before you land — its real story (not just the tourist version), its food, and a few words of the local language. Free.":
        "Apprends à connaître un lieu avant d’atterrir — sa vraie histoire (pas seulement la version touristique), sa cuisine et quelques mots de la langue locale. Gratuit.",
      "▶ Play the {city} quiz ({n})": "▶ Jouer au quiz {city} ({n})",
      "Key phrases": "Phrases clés",
      "Say it": "Écouter",
      "No {language} voice on this device.": "Aucune voix {language} sur cet appareil.",
      "🧭 Know before you go": "🧭 À savoir avant de partir",
      "ready for your trip 🧳": "le voyage peut commencer 🧳",
      "Play again": "Rejouer",
      "You’ve cleared this topic — for now.": "Tu as fait le tour de ce thème — pour l’instant.",
      "You’ve answered every question here in the last month. New questions arrive every week, and missed ones return through the Vault.":
        "Tu as répondu à toutes les questions de ce thème ce mois-ci. De nouvelles questions arrivent chaque semaine, et celles que tu as manquées reviennent par le Coffre.",
      "Try another topic": "Essayer un autre thème",
      "Back to {city}": "Retour à {city}",

      // --- Fact or Fake ---
      "Fact — this is real": "Vrai — c’est un fait",
      "Fake — don’t fall for it": "Faux — ne te fais pas avoir",
      "Read aloud": "Lire à voix haute",
      "Nice catch! ": "Bien vu ! ",
      "Not quite — ": "Et non — ",
      "🏆 New best!": "🏆 Nouveau record !",
      "Every fake spotted. 🔎": "Tous les faux repérés. 🔎",
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
      "Qpio (say: cue-pee-oh) is free to use. There are no paywalls. Qpio doesn't interrupt your learning with ads. When you want to go further, you may find links to relevant books, museums, exhibitions and other resources.":
        "Qpio (prononce : « ku-pio ») est gratuit. Le savoir n’est jamais derrière un paywall. Qpio n’interrompt pas ton apprentissage avec de la publicité. Quand tu veux aller plus loin, tu peux trouver des liens vers des livres, des musées, des expositions et d’autres ressources.",
      "Five questions.": "Cinq questions.",
      "The same five for everyone, everywhere. Every answer teaches you something worth knowing. Questions you miss can come back later so you have another chance to learn them.":
        "Les mêmes pour tout le monde, partout. Chaque réponse t’apprend quelque chose qui vaut la peine d’être su. Les questions que tu rates peuvent revenir plus tard, pour te laisser une autre chance de les apprendre.",
      "Made for the way you learn.": "Conçu pour ta façon d’apprendre.",
      "Turn timers off, switch on dyslexia-friendly text, read-aloud or high contrast — all free, all in Settings. There is a Kids mode too, with nothing to buy and no account. Your progress is currently stored on this device — copy your backup code before you change phone.":
        "Désactive le chrono, active le texte adapté à la dyslexie, la lecture à voix haute ou le contraste élevé — tout est gratuit, tout est dans les Réglages. Il y a aussi un mode enfants, sans rien à acheter et sans compte. Ta progression est pour l’instant conservée sur cet appareil — copie ton code de sauvegarde avant de changer de téléphone.",
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
    var homeBtn = document.getElementById("homeBtn");
    if (homeBtn) {
      homeBtn.title = window.t("Home");
      homeBtn.setAttribute("aria-label", window.t("Home"));
    }
    var tag = document.querySelector(".top .tag");
    if (tag) tag.textContent = window.t("knowledge · free · forever");
  }
})();
