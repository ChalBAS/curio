/* One-off: append the human-body batch to both banks, index-aligned.
 *
 * Written as a script rather than hand-edited because the two files must stay
 * in lockstep — preflight gate 3 fails the build the moment EN and FR differ in
 * length or answer index, and a hand-edit is exactly how that drifts. Reads and
 * writes UTF-8 without a BOM; PowerShell's default encoding has corrupted this
 * pair before.
 *
 *   node tools/add_anatomy.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');

// cat/sub/diff/kids/q/options/answer/fact/src — the EN row carries all metadata.
const EN = [
  { diff: 1, kids: true, q: "Which is the only bone in the human body not joined to any other bone?", options: ["The kneecap", "The collarbone", "The hyoid, in the throat", "The tailbone"], answer: 2, fact: "The hyoid hangs in a sling of muscle above the voice box and anchors the tongue — that freedom is part of how we shape speech.", src: "https://en.wikipedia.org/wiki/Hyoid_bone" },
  { diff: 2, kids: true, q: "Which is the smallest skeletal muscle in the human body?", options: ["A muscle in the eyelid", "The stapedius, in the middle ear", "A muscle in the little finger", "A muscle in the lower lip"], answer: 1, fact: "About a millimetre long, it tightens against loud noise to damp the vibration of the ear's smallest bone.", src: "https://en.wikipedia.org/wiki/Stapedius_muscle" },
  { diff: 2, kids: true, q: "For the force it can produce relative to its size, which is the strongest muscle in the human body?", options: ["The calf muscle", "The thigh muscle", "The muscle of the upper arm", "The masseter, in the jaw"], answer: 3, fact: "Bite force at the back teeth can exceed 70 kg — far more than the front teeth ever deliver.", src: "https://en.wikipedia.org/wiki/Masseter_muscle" },
  { diff: 1, kids: true, q: "Which is the longest bone in the human body?", options: ["The femur, in the thigh", "The humerus, in the upper arm", "The tibia, in the shin", "The longest vertebra of the spine"], answer: 0, fact: "The femur carries several times your body weight, and its length is roughly a quarter of your height.", src: "https://en.wikipedia.org/wiki/Femur" },
  { diff: 2, kids: false, q: "Which protein is the most abundant in the human body?", options: ["Haemoglobin", "Collagen", "Insulin", "Keratin"], answer: 1, fact: "Collagen is the scaffolding of skin, bone, tendon and cartilage — roughly a third of all the protein you are made of.", src: "https://en.wikipedia.org/wiki/Collagen" },
  { diff: 2, kids: true, q: "Long dismissed as useless, the appendix is now thought to act as what?", options: ["A second stomach for tough food", "A store of spare blood", "A safe reservoir for helpful gut bacteria", "A gland that makes digestive acid"], answer: 2, fact: "After an illness clears the gut out, the appendix appears to help repopulate it — which would explain why evolution kept it.", src: "https://en.wikipedia.org/wiki/Appendix_(anatomy)" },
  { diff: 2, kids: true, q: "Smell is unusual among the senses. What does it do that sight and hearing do not?", options: ["It reaches the brain's emotion and memory areas almost directly", "It works only while you are awake", "It uses no nerves at all", "It is processed entirely inside the nose"], answer: 0, fact: "Smell signals skip the brain's usual relay station, which is why a scent can pull up a memory before you can name it.", src: "https://en.wikipedia.org/wiki/Olfactory_system" },
  { diff: 2, kids: true, q: "Your gut holds its own network of hundreds of millions of neurons. What is it often nicknamed?", options: ["The blood engine", "The third lung", "The inner mind", "The second brain"], answer: 3, fact: "The enteric nervous system can run digestion on its own, even when its line to the brain is cut.", src: "https://en.wikipedia.org/wiki/Enteric_nervous_system" },
  { diff: 3, kids: false, q: "Which thick bundle of nerve fibres carries messages between the brain's left and right halves?", options: ["The brain stem", "The corpus callosum", "The cerebellum", "The spinal cord"], answer: 1, fact: "It holds around 200 million fibres; when surgeons cut it to stop severe seizures, the two halves can start acting almost independently.", src: "https://en.wikipedia.org/wiki/Corpus_callosum" },
  { diff: 2, kids: true, q: "The windpipe is held open by rings of cartilage shaped like a C rather than a full circle. Why?", options: ["So the food pipe behind it can bulge as you swallow", "So it can be opened quickly in surgery", "So sound can escape when you speak", "So it can fold flat when you hold your breath"], answer: 0, fact: "The open side of every ring faces backwards, leaving the oesophagus room to widen with each mouthful.", src: "https://en.wikipedia.org/wiki/Trachea" },
  { diff: 1, kids: true, q: "Which flap of cartilage folds down over your windpipe every time you swallow?", options: ["The uvula", "The tonsil", "The epiglottis", "The larynx"], answer: 2, fact: "It shuts the airway for about a second at a time; when the timing slips you cough — that is food 'going down the wrong way'.", src: "https://en.wikipedia.org/wiki/Epiglottis" },
  { diff: 2, kids: true, q: "The old diagram putting sweet at the tip of the tongue and bitter at the back is:", options: ["Correct for adults but not for children", "A misreading of an old study, and wrong", "Correct only for some people", "A recent discovery"], answer: 1, fact: "It came from a misread German paper of 1901; every part of the tongue that tastes at all can detect every basic taste.", src: "https://en.wikipedia.org/wiki/Tongue_map" },
  { diff: 2, kids: true, q: "What makes the popping sound when a knuckle cracks?", options: ["Two bones knocking together", "A tendon snapping over bone", "Cartilage tearing very slightly", "A bubble forming in the joint's fluid"], answer: 3, fact: "Pulling the joint drops the pressure until a gas bubble appears in the lubricating fluid — and it cannot crack again until that dissolves.", src: "https://en.wikipedia.org/wiki/Joint_cracking" },
  { diff: 3, kids: false, q: "Which body-wide network drains fluid from your tissues and carries immune cells, yet has no pump of its own?", options: ["The lymphatic system", "The nervous system", "The endocrine system", "The digestive system"], answer: 0, fact: "It is pushed along by your own movement, muscles squeezing the vessels — one reason sitting still all day makes legs swell.", src: "https://en.wikipedia.org/wiki/Lymphatic_system" },
  { diff: 3, kids: false, q: "In the human eye, light passes through the retina's nerve cells before reaching the cells that actually detect it. This arrangement is:", options: ["Unique to humans", "The reason we see in colour", "Backwards compared with an octopus eye", "Found only in night-active animals"], answer: 2, fact: "The octopus eye evolved separately and is wired the other way round, with the light-detecting cells facing the light.", src: "https://en.wikipedia.org/wiki/Retina" },
  { diff: 1, kids: true, q: "Fingernails grow at roughly what rate compared with toenails?", options: ["About ten times faster", "About twice as fast", "About the same", "About half as fast"], answer: 1, fact: "Nails on your dominant hand, and on the longer fingers, grow fastest — blood supply and everyday knocks both seem to speed them up.", src: "https://en.wikipedia.org/wiki/Nail_(anatomy)" },
  { diff: 2, kids: true, q: "Which narrow tube equalises the pressure behind your eardrum as a plane takes off?", options: ["The Eustachian tube", "The ear canal", "The cochlear duct", "The optic canal"], answer: 0, fact: "It opens when you swallow or yawn, letting air up from the back of the nose — which is why chewing helps on the way down.", src: "https://en.wikipedia.org/wiki/Eustachian_tube" },
  { diff: 1, kids: true, q: "Why is the surface of the human brain so deeply wrinkled?", options: ["It helps the brain cool down", "It makes the brain lighter", "It cushions against knocks", "It fits far more surface area inside the skull"], answer: 3, fact: "Spread flat, the cortex would cover about 2,500 square centimetres — roughly a large table napkin.", src: "https://en.wikipedia.org/wiki/Cerebral_cortex" },
  { diff: 1, kids: true, q: "Which is the largest artery in the human body?", options: ["The carotid artery", "The femoral artery", "The aorta", "The pulmonary artery"], answer: 2, fact: "About as wide as a garden hose, it arches straight out of the heart and runs the length of the trunk before dividing towards the legs.", src: "https://en.wikipedia.org/wiki/Aorta" },
  { diff: 3, kids: false, q: "What speeds up the signals travelling along your nerves?", options: ["A fatty sheath wrapped around the nerve fibre", "A stronger electrical charge", "A wider channel through the bone", "Extra blood flow to the nerve"], answer: 0, fact: "Myelin lets the signal jump from gap to gap instead of crawling, carrying nerve impulses at over 100 metres a second.", src: "https://en.wikipedia.org/wiki/Myelin" }
];

// FR carries only the words. app.js overlays cat/sub/diff/kids/src from EN by
// index; `answer` travels with it purely as a checksum the merge verifies.
const FR = [
  { q: "Quel est le seul os du corps humain qui n'est relié à aucun autre os ?", options: ["La rotule", "La clavicule", "L'os hyoïde, dans la gorge", "Le coccyx"], answer: 2, fact: "L'hyoïde est suspendu dans un hamac de muscles au-dessus du larynx et sert d'ancrage à la langue — cette liberté participe à notre façon d'articuler." },
  { q: "Quel est le plus petit muscle squelettique du corps humain ?", options: ["Un muscle de la paupière", "Le muscle stapédien, dans l'oreille moyenne", "Un muscle du petit doigt", "Un muscle de la lèvre inférieure"], answer: 1, fact: "Long d'environ un millimètre, il se contracte face aux bruits forts pour amortir les vibrations du plus petit os de l'oreille." },
  { q: "Rapporté à sa taille, quel est le muscle le plus puissant du corps humain ?", options: ["Le mollet", "La cuisse", "Le muscle du bras", "Le masséter, dans la mâchoire"], answer: 3, fact: "La force de morsure sur les dents du fond peut dépasser 70 kg — bien plus que ce que délivrent jamais les dents de devant." },
  { q: "Quel est l'os le plus long du corps humain ?", options: ["Le fémur, dans la cuisse", "L'humérus, dans le bras", "Le tibia, dans la jambe", "La plus longue vertèbre de la colonne"], answer: 0, fact: "Le fémur supporte plusieurs fois le poids du corps, et sa longueur représente environ un quart de votre taille." },
  { q: "Quelle protéine est la plus abondante dans le corps humain ?", options: ["L'hémoglobine", "Le collagène", "L'insuline", "La kératine"], answer: 1, fact: "Le collagène forme l'ossature de la peau, des os, des tendons et du cartilage — environ un tiers de toutes vos protéines." },
  { q: "Longtemps jugé inutile, l'appendice jouerait en réalité quel rôle ?", options: ["Un second estomac pour les aliments coriaces", "Une réserve de sang", "Un refuge pour les bonnes bactéries intestinales", "Une glande qui fabrique de l'acide digestif"], answer: 2, fact: "Après une infection qui vide l'intestin, l'appendice semble aider à le repeupler — ce qui expliquerait pourquoi l'évolution l'a conservé." },
  { q: "L'odorat se distingue des autres sens. Que fait-il que la vue et l'ouïe ne font pas ?", options: ["Il atteint presque directement les zones du cerveau liées aux émotions et à la mémoire", "Il ne fonctionne que lorsqu'on est éveillé", "Il n'utilise aucun nerf", "Il est traité entièrement dans le nez"], answer: 0, fact: "Les signaux olfactifs court-circuitent le relais habituel du cerveau : voilà pourquoi une odeur réveille un souvenir avant même qu'on puisse la nommer." },
  { q: "Votre intestin abrite son propre réseau de centaines de millions de neurones. Comment le surnomme-t-on souvent ?", options: ["Le moteur sanguin", "Le troisième poumon", "L'esprit intérieur", "Le deuxième cerveau"], answer: 3, fact: "Le système nerveux entérique peut gérer la digestion tout seul, même quand sa liaison avec le cerveau est coupée." },
  { q: "Quel épais faisceau de fibres nerveuses fait passer les messages entre les moitiés gauche et droite du cerveau ?", options: ["Le tronc cérébral", "Le corps calleux", "Le cervelet", "La moelle épinière"], answer: 1, fact: "Il compte environ 200 millions de fibres ; quand les chirurgiens le sectionnent pour arrêter des crises graves, les deux moitiés peuvent se mettre à agir presque séparément." },
  { q: "La trachée est maintenue ouverte par des anneaux de cartilage en forme de C plutôt qu'en cercles complets. Pourquoi ?", options: ["Pour que l'œsophage, juste derrière, puisse se dilater quand on avale", "Pour pouvoir l'ouvrir vite en chirurgie", "Pour laisser sortir le son quand on parle", "Pour qu'elle s'aplatisse quand on retient sa respiration"], answer: 0, fact: "Le côté ouvert de chaque anneau est tourné vers l'arrière, laissant à l'œsophage la place de s'élargir à chaque bouchée." },
  { q: "Quel clapet de cartilage se rabat sur votre trachée chaque fois que vous avalez ?", options: ["La luette", "L'amygdale", "L'épiglotte", "Le larynx"], answer: 2, fact: "Elle ferme les voies respiratoires environ une seconde à la fois ; quand le minutage dérape, on tousse — c'est ce qu'on appelle avaler de travers." },
  { q: "Le vieux schéma plaçant le sucré sur la pointe de la langue et l'amer au fond est :", options: ["Vrai chez l'adulte mais pas chez l'enfant", "Une mauvaise lecture d'une vieille étude, et c'est faux", "Vrai seulement pour certaines personnes", "Une découverte récente"], answer: 1, fact: "Il vient d'un article allemand de 1901 mal interprété ; toute zone de la langue qui perçoit le goût perçoit toutes les saveurs de base." },
  { q: "Qu'est-ce qui produit le craquement d'une articulation des doigts ?", options: ["Deux os qui s'entrechoquent", "Un tendon qui claque sur l'os", "Un cartilage qui se déchire légèrement", "Une bulle qui se forme dans le liquide de l'articulation"], answer: 3, fact: "L'étirement fait chuter la pression jusqu'à faire apparaître une bulle de gaz dans le liquide lubrifiant — et l'articulation ne peut recraquer qu'une fois la bulle dissoute." },
  { q: "Quel réseau parcourt tout le corps pour drainer le liquide des tissus et transporter les cellules immunitaires, sans pompe qui lui soit propre ?", options: ["Le système lymphatique", "Le système nerveux", "Le système endocrinien", "Le système digestif"], answer: 0, fact: "Il avance grâce à vos propres mouvements, les muscles pressant les vaisseaux — une des raisons pour lesquelles rester assis toute la journée fait gonfler les jambes." },
  { q: "Dans l'œil humain, la lumière traverse les cellules nerveuses de la rétine avant d'atteindre celles qui la détectent. Cette disposition est :", options: ["Propre à l'être humain", "La raison pour laquelle nous voyons les couleurs", "Inversée par rapport à l'œil du poulpe", "Présente seulement chez les animaux nocturnes"], answer: 2, fact: "L'œil du poulpe a évolué séparément et est câblé dans l'autre sens, les cellules détectrices tournées vers la lumière." },
  { q: "À quelle vitesse les ongles des mains poussent-ils par rapport à ceux des pieds ?", options: ["Environ dix fois plus vite", "Environ deux fois plus vite", "À peu près à la même vitesse", "Environ deux fois moins vite"], answer: 1, fact: "Ce sont les ongles de la main dominante, et des doigts les plus longs, qui poussent le plus vite — irrigation et petits chocs quotidiens semblent tous deux les accélérer." },
  { q: "Quel conduit étroit équilibre la pression derrière le tympan au décollage d'un avion ?", options: ["La trompe d'Eustache", "Le conduit auditif", "Le canal cochléaire", "Le canal optique"], answer: 0, fact: "Elle s'ouvre quand on déglutit ou qu'on bâille, laissant monter l'air depuis l'arrière du nez — d'où l'intérêt de mâcher à la descente." },
  { q: "Pourquoi la surface du cerveau humain est-elle si profondément plissée ?", options: ["Cela aide le cerveau à se refroidir", "Cela rend le cerveau plus léger", "Cela amortit les chocs", "Cela fait tenir beaucoup plus de surface dans le crâne"], answer: 3, fact: "Étalé à plat, le cortex couvrirait environ 2 500 centimètres carrés — à peu près une grande serviette de table." },
  { q: "Quelle est la plus grosse artère du corps humain ?", options: ["La carotide", "L'artère fémorale", "L'aorte", "L'artère pulmonaire"], answer: 2, fact: "Large à peu près comme un tuyau d'arrosage, elle sort en arc du cœur et descend tout le tronc avant de se diviser vers les jambes." },
  { q: "Qu'est-ce qui accélère les signaux qui parcourent vos nerfs ?", options: ["Une gaine graisseuse enroulée autour de la fibre nerveuse", "Une charge électrique plus forte", "Un canal plus large dans l'os", "Un afflux de sang vers le nerf"], answer: 0, fact: "La myéline permet au signal de sauter d'un intervalle à l'autre au lieu de ramper, portant l'influx nerveux à plus de 100 mètres par seconde." }
];

if (EN.length !== FR.length) { console.error('EN/FR length mismatch'); process.exit(1); }
EN.forEach((q, i) => {
  if (q.answer !== FR[i].answer) { console.error('answer drift at ' + i + ': ' + q.q); process.exit(1); }
});

/* Render EN in the file's own hand-written style so a later diff stays readable. */
const s = v => JSON.stringify(v);
const enRows = EN.map(q =>
  `  { cat: "Science", sub: "Life Sciences", diff: ${q.diff}, kids: ${q.kids}, q: ${s(q.q)}, options: ${s(q.options)}, answer: ${q.answer}, fact: ${s(q.fact)}, src: ${s(q.src)} },`
).join('\n');

/* FR is machine-shaped in this file already — keep it that way. */
const frRows = FR.map(q =>
  `  {"q": ${s(q.q)}, "options": ${s(q.options)}, "answer": ${q.answer}, "fact": ${s(q.fact)}},`
).join('\n');

function splice(file, block, banner) {
  const p = path.join(SRC, file);
  const txt = fs.readFileSync(p, 'utf8');
  const at = txt.lastIndexOf('];');
  if (at < 0) { console.error('no closing bracket in ' + file); process.exit(1); }
  const out = txt.slice(0, at) + banner + '\n' + block + '\n' + txt.slice(at);
  fs.writeFileSync(p, out, 'utf8');           // node writes UTF-8 with no BOM
  console.log('  ' + file + '  +' + block.split('\n').length + ' rows');
}

splice('questions.js', enRows, '\n  // ---------- HUMAN BODY (added 2026-08-12) ----------');
splice('questions.fr.js', frRows, '\n  // ---------- CORPS HUMAIN (2026-08-12) ----------');
console.log('done');
