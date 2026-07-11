// Curio question bank — v1 curated set.
// Each: category, difficulty (1 easy .. 3 hard), question, options[4],
// answer (index into options), and fact (the "depth fact" revealed after).
// Categories: History, Science, Geography, Arts, Tech, Nature
window.CURIO_QUESTIONS = [
  // ---------- HISTORY ----------
  { cat: "History", diff: 1, q: "Which ancient wonder still stands today?", options: ["Hanging Gardens of Babylon", "Great Pyramid of Giza", "Colossus of Rhodes", "Lighthouse of Alexandria"], answer: 1, fact: "The Great Pyramid was the tallest human-made structure on Earth for ~3,800 years." },
  { cat: "History", diff: 2, q: "The Rosetta Stone was key to deciphering which writing?", options: ["Cuneiform", "Egyptian hieroglyphs", "Linear B", "Mayan glyphs"], answer: 1, fact: "It repeats one decree in three scripts, letting scholars crack hieroglyphs in the 1820s." },
  { cat: "History", diff: 2, q: "Which empire built an extensive road network with the phrase 'all roads lead to' its capital?", options: ["Persian", "Roman", "Mongol", "Ottoman"], answer: 1, fact: "Rome's roads totalled over 400,000 km — about 80,500 km of it stone-paved." },
  { cat: "History", diff: 3, q: "The Treaty of Westphalia (1648) is credited with founding the modern idea of what?", options: ["Free trade", "The sovereign nation-state", "Universal suffrage", "Central banking"], answer: 1, fact: "It ended the Thirty Years' War and set the principle that states control their own internal affairs." },
  { cat: "History", diff: 1, q: "Who was the first woman to win a Nobel Prize?", options: ["Rosalind Franklin", "Marie Curie", "Ada Lovelace", "Dorothy Hodgkin"], answer: 1, fact: "Marie Curie later became the only person to win Nobels in two different sciences: physics and chemistry." },
  { cat: "History", diff: 2, q: "The printing press was popularized in Europe by whom?", options: ["Leonardo da Vinci", "Johannes Gutenberg", "Galileo Galilei", "William Caxton"], answer: 1, fact: "Within 50 years of Gutenberg's 1450s press, Europe printed an estimated 20 million books." },
  { cat: "History", diff: 3, q: "Which civilization invented the concept of zero as a number?", options: ["Ancient Greece", "Ancient India", "Ancient Rome", "Ancient Egypt"], answer: 1, fact: "The symbol and rules for zero were formalized by Indian mathematician Brahmagupta around 628 CE." },
  { cat: "History", diff: 2, q: "The Silk Road primarily connected China with what region?", options: ["The Americas", "The Mediterranean and Europe", "Australia", "Sub-Saharan Africa"], answer: 1, fact: "It traded more than silk — paper, gunpowder and the plague all travelled it too." },

  // ---------- SCIENCE ----------
  { cat: "Science", diff: 1, q: "What gas do plants primarily absorb for photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: 2, fact: "A large tree can absorb ~22 kg of CO2 per year and release enough oxygen for two people." },
  { cat: "Science", diff: 2, q: "What is the most abundant element in the universe?", options: ["Oxygen", "Carbon", "Hydrogen", "Helium"], answer: 2, fact: "Hydrogen makes up about 75% of all normal matter by mass." },
  { cat: "Science", diff: 2, q: "How many bones are in the adult human body?", options: ["206", "312", "180", "256"], answer: 0, fact: "Babies are born with ~300 bones; many fuse together as they grow." },
  { cat: "Science", diff: 3, q: "What does the 'c' represent in E = mc²?", options: ["A constant of gravity", "The speed of light", "Charge", "Specific heat"], answer: 1, fact: "Because c is squared and huge, a tiny bit of mass converts into an enormous amount of energy." },
  { cat: "Science", diff: 1, q: "What is H2O more commonly known as?", options: ["Salt", "Water", "Hydrogen peroxide", "Ammonia"], answer: 1, fact: "Water is one of the few substances less dense as a solid than a liquid — which is why ice floats." },
  { cat: "Science", diff: 3, q: "Which particle carries a negative electric charge?", options: ["Proton", "Neutron", "Electron", "Photon"], answer: 2, fact: "Electrons are ~1,836 times lighter than protons yet define nearly all of chemistry." },
  { cat: "Science", diff: 2, q: "What part of the cell contains genetic material?", options: ["Mitochondria", "Nucleus", "Ribosome", "Membrane"], answer: 1, fact: "If you unravelled the DNA in a single cell it would stretch about 2 metres." },
  { cat: "Science", diff: 3, q: "At what temperature are Celsius and Fahrenheit equal?", options: ["0°", "-40°", "100°", "-273°"], answer: 1, fact: "-40 is the one point where both scales read the same number." },

  // ---------- GEOGRAPHY ----------
  { cat: "Geography", diff: 1, q: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3, fact: "The Pacific is bigger than all Earth's land area combined." },
  { cat: "Geography", diff: 2, q: "Which country has the most time zones?", options: ["Russia", "USA", "China", "France"], answer: 3, fact: "France, counting overseas territories, spans 12 time zones — more than any other country." },
  { cat: "Geography", diff: 1, q: "Mount Everest sits on the border of Nepal and which country?", options: ["India", "China", "Bhutan", "Pakistan"], answer: 1, fact: "Everest grows about 4 mm taller each year as tectonic plates keep colliding." },
  { cat: "Geography", diff: 2, q: "The Sahara Desert is located primarily on which continent?", options: ["Asia", "Australia", "Africa", "South America"], answer: 2, fact: "The Sahara is roughly the size of the entire United States." },
  { cat: "Geography", diff: 3, q: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: 2, fact: "Canberra was purpose-built as a compromise between rivals Sydney and Melbourne." },
  { cat: "Geography", diff: 2, q: "The Amazon River flows mainly through which country?", options: ["Colombia", "Peru", "Brazil", "Venezuela"], answer: 2, fact: "The Amazon discharges more water than the next seven largest rivers combined." },
  { cat: "Geography", diff: 3, q: "Which is the only country that is also a continent?", options: ["Greenland", "Australia", "Antarctica", "Iceland"], answer: 1, fact: "Australia is the world's largest island and smallest continent at once." },
  { cat: "Geography", diff: 1, q: "Which river runs through Egypt's capital, Cairo?", options: ["Tigris", "Nile", "Euphrates", "Congo"], answer: 1, fact: "The Nile is about 6,650 km long and fed one of humanity's earliest great civilizations." },

  // ---------- ARTS & LETTERS ----------
  { cat: "Arts", diff: 1, q: "Who painted the Mona Lisa?", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], answer: 1, fact: "The Mona Lisa has no visible eyebrows — a fashion of the era, or lost to cleaning." },
  { cat: "Arts", diff: 2, q: "Which playwright wrote 'Hamlet'?", options: ["Christopher Marlowe", "William Shakespeare", "Ben Jonson", "Oscar Wilde"], answer: 1, fact: "Shakespeare coined or popularized over 1,700 words still used in English today." },
  { cat: "Arts", diff: 2, q: "The Starry Night was painted by which artist?", options: ["Claude Monet", "Vincent van Gogh", "Paul Cézanne", "Edvard Munch"], answer: 1, fact: "Van Gogh painted it from memory in an asylum, and sold only one painting in his lifetime." },
  { cat: "Arts", diff: 3, q: "Which composer continued writing music after going deaf?", options: ["Mozart", "Beethoven", "Bach", "Chopin"], answer: 1, fact: "Beethoven composed his monumental Ninth Symphony when almost completely deaf." },
  { cat: "Arts", diff: 3, q: "'One Hundred Years of Solitude' was written by which author?", options: ["Pablo Neruda", "Gabriel García Márquez", "Jorge Luis Borges", "Isabel Allende"], answer: 1, fact: "It's the flagship of 'magical realism' and has sold over 50 million copies." },
  { cat: "Arts", diff: 1, q: "How many strings does a standard violin have?", options: ["Four", "Six", "Five", "Seven"], answer: 0, fact: "Those four strings can produce an astonishing range through position and bowing." },
  { cat: "Arts", diff: 2, q: "The Sistine Chapel ceiling was painted by whom?", options: ["Raphael", "Michelangelo", "Botticelli", "Titian"], answer: 1, fact: "Michelangelo spent about four years painting it, mostly standing and craning upward — not lying down." },
  { cat: "Arts", diff: 3, q: "Which ballet features 'The Dance of the Sugar Plum Fairy'?", options: ["Swan Lake", "The Nutcracker", "Giselle", "The Firebird"], answer: 1, fact: "Tchaikovsky used the then-new celesta for its shimmering, music-box tone." },

  // ---------- TECH & MATH ----------
  { cat: "Tech", diff: 1, q: "What does 'HTTP' stand for?", options: ["HyperText Transfer Protocol", "High Transfer Text Program", "Hyperlink Text Transit Path", "Home Tool Transfer Protocol"], answer: 0, fact: "HTTP was invented by Tim Berners-Lee around 1989–91, along with the first web browser." },
  { cat: "Tech", diff: 2, q: "In binary, what number does '1010' represent?", options: ["8", "10", "12", "5"], answer: 1, fact: "Each place doubles: 8 + 0 + 2 + 0 = 10." },
  { cat: "Tech", diff: 3, q: "Who is often called the first computer programmer?", options: ["Grace Hopper", "Ada Lovelace", "Alan Turing", "Charles Babbage"], answer: 1, fact: "In the 1840s Ada Lovelace wrote an algorithm for Babbage's never-built Analytical Engine." },
  { cat: "Tech", diff: 2, q: "What is the value of pi (π) to two decimals?", options: ["3.14", "3.41", "2.72", "1.62"], answer: 0, fact: "Pi has been computed to over 100 trillion digits, yet 15 digits suffice for most engineering." },
  { cat: "Tech", diff: 3, q: "A prime number is divisible only by 1 and what?", options: ["Zero", "Itself", "Two", "Ten"], answer: 1, fact: "2 is the only even prime — every other even number is divisible by 2." },
  { cat: "Tech", diff: 1, q: "What does 'CPU' stand for?", options: ["Central Processing Unit", "Computer Power Unit", "Central Program Utility", "Core Processing Unit"], answer: 0, fact: "Modern CPUs can perform billions of operations per second across multiple cores." },
  { cat: "Tech", diff: 3, q: "What is the next number in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, ...?", options: ["11", "12", "13", "15"], answer: 2, fact: "Each Fibonacci number is the sum of the two before it — 5 + 8 = 13." },
  { cat: "Tech", diff: 2, q: "Which company released the first mass-market GUI personal computer, the Macintosh?", options: ["IBM", "Apple", "Microsoft", "Xerox"], answer: 1, fact: "Apple's 1984 Mac popularized ideas Xerox PARC had pioneered but never sold widely." },

  // ---------- NATURE ----------
  { cat: "Nature", diff: 1, q: "What is the largest animal ever known to have lived?", options: ["African elephant", "Blue whale", "Argentinosaurus", "Giant squid"], answer: 1, fact: "A blue whale's heart alone can weigh as much as a small car." },
  { cat: "Nature", diff: 2, q: "Which is the only mammal capable of true sustained flight?", options: ["Flying squirrel", "Bat", "Sugar glider", "Colugo"], answer: 1, fact: "Bats make up about a fifth of all mammal species." },
  { cat: "Nature", diff: 2, q: "How many hearts does an octopus have?", options: ["One", "Two", "Three", "Four"], answer: 2, fact: "Two hearts pump blood to the gills, one to the body — and their blood is blue." },
  { cat: "Nature", diff: 1, q: "What do bees collect to make honey?", options: ["Pollen", "Nectar", "Sap", "Water"], answer: 1, fact: "A single bee makes about 1/12 of a teaspoon of honey in its entire life." },
  { cat: "Nature", diff: 3, q: "Which tree species is the tallest living thing on Earth?", options: ["Giant sequoia", "Coast redwood", "Douglas fir", "Eucalyptus"], answer: 1, fact: "The tallest coast redwood, 'Hyperion', stands over 115 metres — taller than the Statue of Liberty." },
  { cat: "Nature", diff: 2, q: "A group of lions is called a what?", options: ["Pack", "Herd", "Pride", "Colony"], answer: 2, fact: "Lions are the only truly social big cats, living in prides of related females." },
  { cat: "Nature", diff: 3, q: "Which animal has the longest known migration?", options: ["Monarch butterfly", "Arctic tern", "Humpback whale", "Caribou"], answer: 1, fact: "The Arctic tern flies pole to pole, over 70,000 km a year — seeing two summers annually." },
  { cat: "Nature", diff: 1, q: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Pronghorn", "Greyhound"], answer: 1, fact: "A cheetah can go 0–100 km/h in about three seconds — faster acceleration than most sports cars." },
];
