// Curio city packs — "Before you travel". Fact-checked pre-travel packs.
// Each: city, country, region, emoji, lang, blurb, questions[], phrases[], tips[].
// The city UI hides when this is empty.
window.CURIO_CITYPACKS = [
  {
    "city": "Rome",
    "country": "Italy",
    "region": "Europe",
    "emoji": "🏛️",
    "lang": "Italian",
    "blurb": "Rome layers nearly three millennia into one restless city: Republican forums, a mighty amphitheatre raised by enslaved and captive hands, medieval basilicas, Renaissance ceilings and Baroque fountains. Here history isn't behind glass — it's the piazza where you eat gelato and argue over the perfect carbonara.",
    "questions": [
      {
        "q": "In the Roman Republic, what title was given to the two officials elected each year to jointly lead the state?",
        "options": [
          "Consuls",
          "Emperors",
          "Pharaohs",
          "Senators"
        ],
        "answer": 0,
        "fact": "Founded traditionally in 509 BC, the Republic elected two consuls yearly; each could veto the other, guarding against one-man rule until Augustus in 27 BC.",
        "src": "https://en.wikipedia.org/wiki/Roman_Republic",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "The Colosseum was largely funded by treasure looted during which Roman war?",
        "options": [
          "The First Jewish–Roman War and sack of Jerusalem",
          "The Punic Wars against Carthage",
          "The Gallic Wars in Gaul",
          "The Greco-Persian Wars"
        ],
        "answer": 0,
        "fact": "Vespasian paid for it with spoils from the 70 CE sack of Jerusalem; enslaved people and war captives, many of them Judean, formed much of the workforce.",
        "src": "https://en.wikipedia.org/wiki/Colosseum",
        "theme": "History",
        "diff": 3
      },
      {
        "q": "Roman tradition holds that the city was founded in 753 BC on which of its seven hills?",
        "options": [
          "Palatine Hill",
          "Capitoline Hill",
          "Aventine Hill",
          "Quirinal Hill"
        ],
        "answer": 0,
        "fact": "Legend places Romulus's founding of Rome on the Palatine on 21 April 753 BC; the hill settlements later drained the marshy valleys between them to unite.",
        "src": "https://en.wikipedia.org/wiki/Seven_hills_of_Rome",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "Who painted the ceiling of the Sistine Chapel between 1508 and 1512?",
        "options": [
          "Michelangelo",
          "Leonardo da Vinci",
          "Raphael",
          "Caravaggio"
        ],
        "answer": 0,
        "fact": "Commissioned by Pope Julius II, Michelangelo frescoed over 300 figures, including The Creation of Adam, and was hailed afterwards as 'il divino'.",
        "src": "https://en.wikipedia.org/wiki/Sistine_Chapel_ceiling",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "What is the Italian 'aperitivo'?",
        "options": [
          "A pre-dinner drink, often with snacks, to whet the appetite",
          "A strong espresso taken after a meal",
          "An afternoon nap",
          "A sweet dessert served with cake"
        ],
        "answer": 0,
        "fact": "Popular since 19th-century cafés, the aperitivo pairs drinks like Campari or an Aperol Spritz with light bites in the early evening before dinner.",
        "src": "https://en.wikipedia.org/wiki/Aperitivo",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "By the famous custom at the Trevi Fountain, tossing a coin into the water means you will...",
        "options": [
          "Return to Rome one day",
          "Win the lottery",
          "Marry within the year",
          "Live to be a hundred"
        ],
        "answer": 0,
        "fact": "Visitors toss a coin over the shoulder to ensure a return to Rome; roughly €3,000 lands daily and is collected for charity.",
        "src": "https://en.wikipedia.org/wiki/Trevi_Fountain",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "Which cured pork is traditional in an authentic Roman pasta alla carbonara?",
        "options": [
          "Guanciale (cured pork jowl)",
          "Smoked streaky bacon",
          "Chorizo",
          "Prosciutto cotto (cooked ham)"
        ],
        "answer": 0,
        "fact": "Classic carbonara uses guanciale, pecorino romano, egg and black pepper — no cream; its silkiness comes from egg and cheese alone, not dairy.",
        "src": "https://en.wikipedia.org/wiki/Carbonara",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "The Roman pasta dish 'cacio e pepe' translates to what?",
        "options": [
          "Cheese and pepper",
          "Bacon and egg",
          "Garlic and oil",
          "Tomato and basil"
        ],
        "answer": 0,
        "fact": "A Lazio classic of just pecorino romano, black pepper and pasta; the starchy cooking water binds the cheese into a smooth, creamy sauce.",
        "src": "https://en.wikipedia.org/wiki/Cacio_e_pepe",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "Which aged sheep's-milk cheese is the defining ingredient of Roman staples like cacio e pepe and carbonara?",
        "options": [
          "Pecorino Romano",
          "Mozzarella di Bufala",
          "Gorgonzola",
          "Mascarpone"
        ],
        "answer": 0,
        "fact": "Salty, hard Pecorino Romano — a sheep's-milk cheese long tied to Lazio — is grated over cacio e pepe, carbonara and amatriciana alike.",
        "src": "https://en.wikipedia.org/wiki/Pecorino_Romano",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "The Pantheon in Rome still holds what world record for its dome?",
        "options": [
          "Largest unreinforced concrete dome",
          "Tallest dome in Europe",
          "Oldest dome ever built",
          "Widest steel-framed dome"
        ],
        "answer": 0,
        "fact": "Completed under Hadrian around 126 CE, the Pantheon's coffered concrete dome, pierced by an open oculus, remains the largest unreinforced concrete dome on Earth.",
        "src": "https://en.wikipedia.org/wiki/Pantheon,_Rome",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Which sovereign state, an enclave inside Rome, is the smallest in the world by both area and population?",
        "options": [
          "Vatican City",
          "Monaco",
          "San Marino",
          "Liechtenstein"
        ],
        "answer": 0,
        "fact": "Just 44 hectares with about 880 residents, Vatican City became independent under the 1929 Lateran Treaty and is ruled by the pope.",
        "src": "https://en.wikipedia.org/wiki/Vatican_City",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "By what formal name, after the dynasty that built it, is the Colosseum also known?",
        "options": [
          "The Flavian Amphitheatre",
          "The Circus Maximus",
          "The Baths of Caracalla",
          "The Theatre of Marcellus"
        ],
        "answer": 0,
        "fact": "Raised by the Flavian emperors Vespasian, Titus and Domitian (c. 70–96 CE), it seated an estimated 50,000–80,000 spectators for public games.",
        "src": "https://en.wikipedia.org/wiki/Colosseum",
        "theme": "Landmarks",
        "diff": 2
      }
    ],
    "phrases": [
      {
        "phrase": "Buongiorno",
        "meaning": "Good morning / hello (polite)",
        "pron": "bwon-JOR-noh"
      },
      {
        "phrase": "Grazie",
        "meaning": "Thank you",
        "pron": "GRAH-tsyeh"
      },
      {
        "phrase": "Per favore",
        "meaning": "Please",
        "pron": "pehr fah-VOH-reh"
      },
      {
        "phrase": "Mi scusi",
        "meaning": "Excuse me / sorry (polite)",
        "pron": "mee SKOO-zee"
      },
      {
        "phrase": "Quanto costa?",
        "meaning": "How much is it?",
        "pron": "KWAN-toh KOH-stah"
      },
      {
        "phrase": "Dov'è...?",
        "meaning": "Where is...?",
        "pron": "doh-VEH"
      }
    ],
    "tips": [
      "Tipping is modest and never obligatory: bills often include a per-person 'coperto' cover charge or 'servizio incluso' service charge, so rounding up or leaving a euro or two for good service is plenty.",
      "To enter St. Peter's Basilica, the Vatican Museums and most churches you must cover shoulders and knees, so pack a light scarf; sleeveless tops and short shorts are turned away.",
      "Near the Colosseum, Trevi and other big sights, politely wave off strangers who slip a 'free' bracelet or rose into your hand, and buy tickets from official desks or apps rather than 'helpers' at machines.",
      "Coffee has its rhythms: Romans take a quick espresso standing at the bar (cheaper than table service), and a milky cappuccino is generally treated as a morning-only drink.",
      "A friendly 'buongiorno' when you enter a shop or bar, and 'buonasera' in the evening, is basic courtesy; locals appreciate the greeting far more than perfect grammar."
    ]
  },
  {
    "city": "Kyoto",
    "country": "Japan",
    "region": "Asia",
    "emoji": "⛩️",
    "lang": "Japanese",
    "blurb": "For more than a thousand years Kyoto was the seat of Japan's emperors, and that long reign still shows in its gold-leafed pavilions, raked Zen gardens, and lantern-lit lanes where geiko slip between wooden teahouses. Largely spared the bombs that flattened other cities, it remains Japan's living heart of temples, tea, and craft.",
    "questions": [
      {
        "q": "In which year did Kyoto, then called Heian-kyō, become Japan's imperial capital?",
        "options": [
          "710 CE",
          "794 CE",
          "1185 CE",
          "1603 CE"
        ],
        "answer": 1,
        "fact": "Emperor Kanmu moved the capital to Heian-kyō in 794, launching the Heian period; Kyoto remained the imperial seat until 1869.",
        "src": "https://en.wikipedia.org/wiki/Kyoto",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "What did the city's original name, Heian-kyō, mean?",
        "options": [
          "Capital of peace and tranquility",
          "City of the eastern sea",
          "Gate of the gods",
          "Field of a thousand rivers"
        ],
        "answer": 0,
        "fact": "Heian-kyō meant 'capital of peace and tranquility'; its streets were laid on a grid modeled on the Tang Chinese capital Chang'an.",
        "src": "https://en.wikipedia.org/wiki/Kyoto",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "In 1945 Kyoto was removed from the atomic-bomb target list, largely at the insistence of which U.S. official?",
        "options": [
          "Secretary of War Henry Stimson",
          "President Harry Truman",
          "General Douglas MacArthur",
          "General Leslie Groves"
        ],
        "answer": 0,
        "fact": "Secretary of War Henry L. Stimson pressed for Kyoto's removal from the target list, sparing the ancient capital; Nagasaki was chosen instead.",
        "src": "https://en.wikipedia.org/wiki/Kyoto",
        "theme": "History",
        "diff": 3
      },
      {
        "q": "In Kyoto, what is an apprentice geisha called?",
        "options": [
          "Maiko",
          "Geiko",
          "Oiran",
          "Miko"
        ],
        "answer": 0,
        "fact": "In Kyoto, fully-fledged geisha are called geiko and their apprentices maiko ('woman of dance'); the word geisha is more common in Tokyo.",
        "src": "https://en.wikipedia.org/wiki/Geisha",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "The Japanese tea ceremony, refined in Kyoto by Sen no Rikyū, is known as chanoyu or what?",
        "options": [
          "Sadō (the way of tea)",
          "Ikebana",
          "Bonsai",
          "Shodō"
        ],
        "answer": 0,
        "fact": "Chanoyu, or sadō ('the way of tea'), centers on preparing matcha; 16th-century master Sen no Rikyū shaped it into the form practiced today.",
        "src": "https://en.wikipedia.org/wiki/Japanese_tea_ceremony",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Which historic Kyoto district is Japan's most famous hanamachi, or geisha quarter?",
        "options": [
          "Gion",
          "Shibuya",
          "Dōtonbori",
          "Asakusa"
        ],
        "answer": 0,
        "fact": "Gion, near Yasaka Shrine, is a preserved district of wooden machiya and ochaya teahouses, home to the springtime Miyako Odori dances.",
        "src": "https://en.wikipedia.org/wiki/Gion",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "Kyoto is regarded as the home of which refined, seasonal multi-course cuisine?",
        "options": [
          "Kaiseki",
          "Yakitori",
          "Okonomiyaki",
          "Teppanyaki"
        ],
        "answer": 0,
        "fact": "Kaiseki is Japan's seasonal multi-course haute cuisine; in Kyoto it is also called kyō-ryōri, reflecting its roots in the old imperial capital.",
        "src": "https://en.wikipedia.org/wiki/Kaiseki",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Which vegetarian cuisine developed in Kyoto's Buddhist temples?",
        "options": [
          "Shōjin ryōri",
          "Sukiyaki",
          "Tonkatsu",
          "Unagi"
        ],
        "answer": 0,
        "fact": "Shōjin ryōri is Buddhist temple cuisine using no meat or fish; tied to Zen practice, it is still served at many Kyoto temples.",
        "src": "https://en.wikipedia.org/wiki/Buddhist_cuisine",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "The town of Uji, just south of Kyoto, has been celebrated since medieval times for producing what?",
        "options": [
          "Green tea",
          "Sake",
          "Soy sauce",
          "Whisky"
        ],
        "answer": 0,
        "fact": "Shogun Ashikaga Yoshimitsu promoted tea growing at Uji; ever since it has produced superior green tea, and it is famed as a home of matcha.",
        "src": "https://en.wikipedia.org/wiki/Uji",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Kinkaku-ji, the Golden Pavilion, has its upper floors covered in what?",
        "options": [
          "Gold leaf",
          "Silver plate",
          "Bronze tiles",
          "Brass paint"
        ],
        "answer": 0,
        "fact": "Kinkaku-ji is a Zen temple whose top two floors are clad in gold leaf; the present pavilion dates to 1955, rebuilt after a 1950 arson.",
        "src": "https://en.wikipedia.org/wiki/Kinkaku-ji",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Fushimi Inari-taisha is famous for thousands of what winding up Mount Inari?",
        "options": [
          "Vermilion torii gates",
          "Stone Buddha statues",
          "Cherry trees",
          "Paper lanterns"
        ],
        "answer": 0,
        "fact": "Fushimi Inari-taisha, dedicated to Inari, kami of rice, is lined with thousands of donated vermilion torii forming tunnels up Mount Inari.",
        "src": "https://en.wikipedia.org/wiki/Fushimi_Inari-taisha",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "Kiyomizu-dera is best known for which architectural feature?",
        "options": [
          "A tall wooden stage over the hillside",
          "A golden dome",
          "A moat and drawbridge",
          "A glass observation tower"
        ],
        "answer": 0,
        "fact": "Kiyomizu-dera's main hall has a large wooden stage on pillars, built without nails; a UNESCO World Heritage site, it was founded in 778.",
        "src": "https://en.wikipedia.org/wiki/Kiyomizu-dera",
        "theme": "Landmarks",
        "diff": 2
      }
    ],
    "phrases": [
      {
        "phrase": "こんにちは",
        "meaning": "Hello / good afternoon",
        "pron": "kon-nee-chee-wah"
      },
      {
        "phrase": "ありがとうございます",
        "meaning": "Thank you (polite)",
        "pron": "ah-ree-gah-toh go-zai-mass"
      },
      {
        "phrase": "お願いします",
        "meaning": "Please (when asking for something)",
        "pron": "oh-neh-gah-ee-shee-mass"
      },
      {
        "phrase": "すみません",
        "meaning": "Excuse me / sorry",
        "pron": "soo-mee-mah-sen"
      },
      {
        "phrase": "いくらですか",
        "meaning": "How much is it?",
        "pron": "ee-koo-rah dess-kah"
      },
      {
        "phrase": "…はどこですか",
        "meaning": "Where is...?",
        "pron": "... wah doh-koh dess-kah"
      }
    ],
    "tips": [
      "Tipping isn't customary and may be politely refused; attentive service is standard, so a sincere 'arigatō gozaimasu' is the right way to thank someone.",
      "At temples and shrines, dress modestly, remove shoes where signs indicate, keep your voice low, and ask before photographing worshippers or interiors.",
      "In Gion, don't chase, touch, or block geiko and maiko for photos; some private lanes ban photography and can issue fines, so admire them respectfully.",
      "Carry some cash: many small temples, shrines, shops, and older eateries are cash-only, even as IC cards and contactless payments spread.",
      "Avoid bar touts in the Pontochō and Kiyamachi nightlife lanes who lead you to venues that later hit tourists with inflated bills; pick your own place and confirm prices first."
    ]
  },
  {
    "city": "Cairo",
    "country": "Egypt",
    "region": "Africa",
    "emoji": "🕌",
    "lang": "Egyptian Arabic",
    "blurb": "Where the last standing wonder of the ancient world shares a skyline with a thousand minarets, Cairo — al-Qahira, \"the Vanquisher\" — has been Egypt's beating heart for over a thousand years. From the Fatimid lanes around Al-Azhar to the koshari carts of downtown, it is a living African and Arab metropolis where pharaohs, caliphs, and everyday Cairenes all leave their mark.",
    "questions": [
      {
        "q": "Which dynasty founded Cairo (al-Qahira) as its new capital in 969 CE?",
        "options": [
          "The Ottoman Empire",
          "The Fatimid Caliphate",
          "The British Empire",
          "Alexander the Great"
        ],
        "answer": 1,
        "fact": "Fatimid general Jawhar founded al-Qahira in 969 CE; Caliph al-Mu'izz moved his court from Tunisia in 973, making Cairo the Fatimid capital.",
        "src": "https://en.wikipedia.org/wiki/Cairo",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "The Arabic name of Cairo, al-Qahira, translates roughly to what?",
        "options": [
          "The Gift of the Nile",
          "City of a Thousand Minarets",
          "The Vanquisher / The Conqueror",
          "The White Walls"
        ],
        "answer": 2,
        "fact": "Al-Qahira means 'the Vanquisher.' Its fuller form, al-Qahira al-Mu'izziyya, honours the Fatimid caliph al-Mu'izz who made it his capital.",
        "src": "https://en.wikipedia.org/wiki/Cairo",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "Before Cairo, which city served as Egypt's first Islamic-era capital, founded in 641 CE?",
        "options": [
          "Fustat",
          "Alexandria",
          "Thebes (Luxor)",
          "Aswan"
        ],
        "answer": 0,
        "fact": "Fustat was founded in 641 CE by the general Amr ibn al-As as Egypt's first Muslim capital; Cairo later grew to its north and absorbed the older city.",
        "src": "https://en.wikipedia.org/wiki/Cairo",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "Al-Azhar, founded alongside its mosque around 970 CE, is renowned worldwide as what?",
        "options": [
          "The largest pyramid in Africa",
          "Egypt's first cinema",
          "A Roman amphitheatre",
          "One of the world's oldest continuously operating universities"
        ],
        "answer": 3,
        "fact": "Al-Azhar's mosque was founded by the Fatimids in 970 CE; its university is the second-oldest continuously running one after al-Qarawiyyin in Fes.",
        "src": "https://en.wikipedia.org/wiki/Al-Azhar_Mosque",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Which Cairo-born writer became, in 1988, the first Arabic-language author to win the Nobel Prize in Literature?",
        "options": [
          "Taha Hussein",
          "Naguib Mahfouz",
          "Tawfiq al-Hakim",
          "Ahmed Shawqi"
        ],
        "answer": 1,
        "fact": "Naguib Mahfouz, born in Old Cairo in 1911, won the 1988 Nobel Prize in Literature; his Cairo Trilogy maps the city's streets and families.",
        "src": "https://en.wikipedia.org/wiki/Naguib_Mahfouz",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Umm Kulthum, whose voice defined 20th-century Cairo, was celebrated in which art form?",
        "options": [
          "Film directing",
          "Sculpture",
          "Singing",
          "Football"
        ],
        "answer": 2,
        "fact": "Nicknamed 'Kawkab al-Sharq' (Star of the East), singer Umm Kulthum drew millions; her monthly Cairo radio concerts enthralled the Arab world for decades.",
        "src": "https://en.wikipedia.org/wiki/Umm_Kulthum",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "What is koshari, Egypt's beloved national dish?",
        "options": [
          "A grilled lamb kebab platter",
          "A bowl of rice, lentils, pasta and chickpeas topped with tomato sauce and fried onions",
          "A honey-soaked pastry",
          "A cold cucumber soup"
        ],
        "answer": 1,
        "fact": "Koshari layers rice, brown lentils, macaroni and chickpeas under spiced tomato sauce and crispy fried onions; it joined UNESCO's heritage list in 2025.",
        "src": "https://en.wikipedia.org/wiki/Koshari",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "Egyptian ta'meya, the local take on falafel, is traditionally made from what?",
        "options": [
          "Fava beans",
          "Chickpeas",
          "Green peas",
          "Potatoes"
        ],
        "answer": 0,
        "fact": "Unlike Levantine falafel made from chickpeas, Egyptian ta'meya is ground from fava beans and herbs, giving it a green interior and its own flavour.",
        "src": "https://en.wikipedia.org/wiki/Ta%27ameya",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Molokhia, a classic Egyptian green stew, is made from the leaves of which plant?",
        "options": [
          "Spinach",
          "Grape vine",
          "Okra",
          "Jute mallow"
        ],
        "answer": 3,
        "fact": "Molokhia simmers finely chopped jute-mallow leaves with garlic and coriander into a thick green stew, usually served with chicken or rabbit over rice.",
        "src": "https://en.wikipedia.org/wiki/Mulukhiyah",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "The Great Pyramid of Giza was built as the tomb of which pharaoh?",
        "options": [
          "Tutankhamun",
          "Ramesses II",
          "Khufu (Cheops)",
          "Cleopatra VII"
        ],
        "answer": 2,
        "fact": "Built around 2600 BCE for Fourth-Dynasty pharaoh Khufu, the Great Pyramid is the oldest of the Seven Wonders and the only one still largely standing.",
        "src": "https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "Which Cairo mosque, completed in 879 CE, is Egypt's oldest surviving in its original form?",
        "options": [
          "The Mosque of Ibn Tulun",
          "The Mosque of Muhammad Ali",
          "Sultan Hassan Mosque",
          "Al-Rifa'i Mosque"
        ],
        "answer": 0,
        "fact": "Built 876-879 CE by governor Ahmad ibn Tulun, its vast courtyard and spiral minaret make it the oldest Cairo mosque surviving largely in its original form.",
        "src": "https://en.wikipedia.org/wiki/Mosque_of_Ibn_Tulun",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Khan el-Khalili, one of Cairo's famous historic sites, is best known as what?",
        "options": [
          "A pharaonic burial ground",
          "A bustling bazaar and souq dating from the Mamluk era",
          "A modern shopping mall",
          "A Nile-side beach resort"
        ],
        "answer": 1,
        "fact": "Khan el-Khalili grew from a trading hall built in the 1380s under Mamluk sultan Barquq; today its lanes brim with crafts, spices, jewellery and coffeehouses.",
        "src": "https://en.wikipedia.org/wiki/Khan_el-Khalili",
        "theme": "Landmarks",
        "diff": 1
      }
    ],
    "phrases": [
      {
        "phrase": "السلام عليكم",
        "meaning": "Hello (literally 'peace be upon you')",
        "pron": "es-sa-LAAM a-LAY-koom"
      },
      {
        "phrase": "شكراً",
        "meaning": "Thank you",
        "pron": "SHOK-ran"
      },
      {
        "phrase": "من فضلك",
        "meaning": "Please (said to a man; use 'min fadlik' to a woman)",
        "pron": "min FAD-lak"
      },
      {
        "phrase": "آسف / لو سمحت",
        "meaning": "Sorry / excuse me (to apologise or get attention)",
        "pron": "AA-sef / law sa-MAHT"
      },
      {
        "phrase": "بكام ده؟",
        "meaning": "How much is this?",
        "pron": "bee-KAAM da?"
      },
      {
        "phrase": "فين...؟",
        "meaning": "Where is...? (e.g. 'il-mat-haf fein?' = where is the museum?)",
        "pron": "fein...?"
      }
    ],
    "tips": [
      "Tipping ('baksheesh') is woven into daily life: keep small notes for restroom attendants, drivers and helpers, and round up restaurant bills even when service is added.",
      "At mosques, dress modestly with shoulders and knees covered, women should carry a headscarf, and remove your shoes before entering; visit outside the five prayer times.",
      "Haggling is expected and good-humoured in souqs like Khan el-Khalili: counter at roughly half the first price, stay friendly, and it is perfectly fine to walk away.",
      "Around the Giza pyramids, agree any camel or horse-ride price in advance, and politely refuse strangers who grab your camera or drape a scarf on you then demand cash.",
      "Ask permission before photographing people, and carry cash: many small shops, taxis and all tips are cash-only, and card acceptance is patchy outside big venues."
    ]
  },
  {
    "city": "Mexico City",
    "country": "Mexico",
    "region": "Americas",
    "emoji": "🌋",
    "lang": "Spanish",
    "blurb": "Mexico City rises from the drained lakebed of Tenochtitlan, the island capital the Mexica raised in 1325. Beneath one of the world's great metropolises, Nahuatl words, Aztec temple ruins, and the floating gardens of Xochimilco are still very much alive.",
    "questions": [
      {
        "q": "On what body of water did the Mexica build their island capital, Tenochtitlan?",
        "options": [
          "Lake Pátzcuaro",
          "Lake Texcoco",
          "Lake Titicaca",
          "The Gulf of Mexico"
        ],
        "answer": 1,
        "fact": "The Mexica built Tenochtitlan on an island in the shallow Lake Texcoco around 1325; today's Mexico City sits atop the drained lakebed.",
        "src": "https://en.wikipedia.org/wiki/Tenochtitlan",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "In the Mexica founding legend, the site of the future city was marked by an eagle on a cactus doing what?",
        "options": [
          "Holding a shield",
          "Devouring a serpent",
          "Carrying the sun",
          "Drinking from a spring"
        ],
        "answer": 1,
        "fact": "This eagle-and-serpent omen, tied to the god Huitzilopochtli, still sits at the center of Mexico's national flag.",
        "src": "https://en.wikipedia.org/wiki/Tenochtitlan",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "The Aztec Empire was ruled by a Triple Alliance of Tenochtitlan and which two other city-states?",
        "options": [
          "Cholula and Tlaxcala",
          "Teotihuacan and Tula",
          "Texcoco and Tlacopan",
          "Oaxaca and Puebla"
        ],
        "answer": 2,
        "fact": "Formed around 1428, this alliance united Tenochtitlan, Texcoco and Tlacopan; Tenochtitlan gradually became the dominant power.",
        "src": "https://en.wikipedia.org/wiki/Aztec_Empire",
        "theme": "History",
        "diff": 3
      },
      {
        "q": "The words 'chocolate', 'tomato' and 'avocado' come from which Indigenous language of central Mexico?",
        "options": [
          "Mayan",
          "Quechua",
          "Nahuatl",
          "Zapotec"
        ],
        "answer": 2,
        "fact": "They come from the Nahuatl words xocolatl, tomatl and ahuacatl; Nahuatl is still spoken by well over a million people in Mexico today.",
        "src": "https://en.wikipedia.org/wiki/Nahuatl",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "Día de Muertos (Day of the Dead), a UNESCO-listed tradition, is mainly observed on which dates?",
        "options": [
          "December 12",
          "November 1–2",
          "October 12",
          "September 16"
        ],
        "answer": 1,
        "fact": "Families build ofrendas with cempasúchil marigolds and the departed's favourite foods; UNESCO inscribed the tradition in 2008.",
        "src": "https://en.wikipedia.org/wiki/Day_of_the_Dead",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "The chinampas ('floating gardens') still farmed at Xochimilco are best described as what?",
        "options": [
          "Terraced hillsides",
          "Rooftop gardens",
          "Artificial islands built up from lake mud",
          "Underground cisterns"
        ],
        "answer": 2,
        "fact": "This pre-Hispanic method heaped lakebed mud onto staked plots to form fertile islands; Xochimilco's canals are a UNESCO World Heritage Site.",
        "src": "https://en.wikipedia.org/wiki/Xochimilco",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Tacos al pastor are made with marinated meat cooked on a vertical spit. Which meat is traditional?",
        "options": [
          "Beef",
          "Pork",
          "Goat",
          "Fish"
        ],
        "answer": 1,
        "fact": "The vertical-spit method came from shawarma brought by Lebanese immigrants; by the 1920s pork had replaced the original lamb.",
        "src": "https://en.wikipedia.org/wiki/Tacos_al_pastor",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "Mole, one of Mexico's signature sauces, is built on a base of what?",
        "options": [
          "Melted chocolate alone",
          "Chili peppers, spices and nuts",
          "Tomato and cream",
          "Peanut butter"
        ],
        "answer": 1,
        "fact": "Puebla and Oaxaca both claim mole; Oaxaca is called the 'land of seven moles', and chocolate is only one of many possible ingredients.",
        "src": "https://en.wikipedia.org/wiki/Mole_(sauce)",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "How did the Mexica traditionally consume chocolate, made from cacao?",
        "options": [
          "As sweet solid bars",
          "As a bitter, unsweetened frothy drink",
          "Baked into bread",
          "As a cold ice cream"
        ],
        "answer": 1,
        "fact": "Cacao was ground with water and chili and poured to raise a foam; drunk mostly by elites, it was sweetened only after European contact.",
        "src": "https://en.wikipedia.org/wiki/History_of_chocolate",
        "theme": "Food",
        "diff": 3
      },
      {
        "q": "Ruins of which great Mexica temple stand beside the Zócalo in central Mexico City?",
        "options": [
          "Chichén Itzá",
          "Templo Mayor",
          "The Alhambra",
          "Machu Picchu"
        ],
        "answer": 1,
        "fact": "Dedicated to Huitzilopochtli (war) and Tlaloc (rain), it was rediscovered by electrical workers in 1978 and excavated by Eduardo Matos Moctezuma.",
        "src": "https://en.wikipedia.org/wiki/Templo_Mayor",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "Mexico City's vast main square, officially the Plaza de la Constitución, is popularly known as what?",
        "options": [
          "The Malecón",
          "The Zócalo",
          "The Rambla",
          "The Prado"
        ],
        "answer": 1,
        "fact": "The roughly 240-metre-square plaza sits over the ceremonial heart of Tenochtitlan, once framed by the palace of Moctezuma II.",
        "src": "https://en.wikipedia.org/wiki/Z%C3%B3calo",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Teotihuacan, home of the Pyramid of the Sun near Mexico City, was built by whom relative to the Aztecs?",
        "options": [
          "The Aztecs themselves",
          "An earlier people, ~1,000 years before the Aztecs",
          "Spanish colonists",
          "The Maya of Yucatán"
        ],
        "answer": 1,
        "fact": "The city was already in ruins when the Mexica arrived and gave it its Nahuatl name; the identity of its original builders is still debated.",
        "src": "https://en.wikipedia.org/wiki/Teotihuacan",
        "theme": "Landmarks",
        "diff": 3
      }
    ],
    "phrases": [
      {
        "phrase": "Hola",
        "meaning": "Hello",
        "pron": "OH-lah"
      },
      {
        "phrase": "Gracias",
        "meaning": "Thank you",
        "pron": "GRAH-syahs"
      },
      {
        "phrase": "Por favor",
        "meaning": "Please",
        "pron": "por fah-VOR"
      },
      {
        "phrase": "Disculpe",
        "meaning": "Excuse me / Sorry",
        "pron": "dees-KOOL-peh"
      },
      {
        "phrase": "¿Cuánto cuesta?",
        "meaning": "How much is it?",
        "pron": "KWAN-toh KWES-tah"
      },
      {
        "phrase": "¿Dónde está...?",
        "meaning": "Where is...?",
        "pron": "DOHN-deh es-TAH"
      }
    ],
    "tips": [
      "Tipping (propina) of about 10–15% at restaurants is customary and often not included in the bill; small change for baggers and parking attendants is appreciated too.",
      "Don't drink the tap water — stick to bottled or filtered 'agua purificada', which is what locals and most eateries use as well.",
      "At churches like the Metropolitan Cathedral or the Basilica of Guadalupe, dress modestly (cover shoulders and knees), speak quietly, and don't wander through areas during Mass.",
      "Skip flagging random street taxis; book a licensed 'sitio' stand or use an app like Uber or Didi to avoid overcharging and safety problems.",
      "The city sits at about 2,240 m (7,350 ft), so take your first day slowly, drink plenty of water, and go easy on alcohol until you acclimatise."
    ]
  },
  {
    "city": "Istanbul",
    "country": "Türkiye",
    "region": "MiddleEast",
    "emoji": "🌉",
    "lang": "Turkish",
    "blurb": "Straddling two continents across the Bosphorus, Istanbul layers Byzantine domes, Ottoman minarets and modern Turkish street life into one restless, sea-wrapped metropolis. Here Byzantion became Constantinople became Istanbul — and every stone still remembers all three.",
    "questions": [
      {
        "q": "Around 660 BCE, Greek settlers founded the first city on this site, named Byzantion. From which Greek city did they come?",
        "options": [
          "Athens",
          "Megara",
          "Corinth",
          "Sparta"
        ],
        "answer": 1,
        "fact": "Around 660 BCE settlers from Megara founded Byzantion on the European shore; tradition credits their leader Byzas, whose name the city bears.",
        "src": "https://en.wikipedia.org/wiki/Istanbul",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "Which Roman emperor refounded the city as an imperial capital in 330 CE, so that it became known as Constantinople?",
        "options": [
          "Diocletian",
          "Augustus",
          "Constantine the Great",
          "Justinian I"
        ],
        "answer": 2,
        "fact": "On 11 May 330 CE Constantine the Great proclaimed the rebuilt city his new capital; it became known as Constantinople, 'Constantine's city'.",
        "src": "https://en.wikipedia.org/wiki/Istanbul",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "In 1453 the city fell to the Ottomans, ending Byzantine rule. Which sultan led the conquest?",
        "options": [
          "Osman I",
          "Mehmed II",
          "Suleiman the Magnificent",
          "Bayezid I"
        ],
        "answer": 1,
        "fact": "After a 55-day siege, Sultan Mehmed II 'the Conqueror' took the city on 29 May 1453, ending more than 1,100 years of Roman and Byzantine rule.",
        "src": "https://en.wikipedia.org/wiki/Istanbul",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "The 'whirling dervishes' and their turning Sema ceremony belong to the Mevlevi order, founded on the teachings of which poet?",
        "options": [
          "Omar Khayyam",
          "Hafez",
          "Yunus Emre",
          "Rumi (Mevlana)"
        ],
        "answer": 3,
        "fact": "The Mevlevi order follows the teachings of the 13th-century poet Rumi (Mevlana); its whirling Sema ceremony is on UNESCO's intangible heritage list.",
        "src": "https://en.wikipedia.org/wiki/Mevlevi_order",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "The blue-and-white glass 'nazar boncuğu' bead, seen on doorways and jewellery, is believed to guard against what?",
        "options": [
          "The evil eye",
          "Bad harvests",
          "Earthquakes",
          "Storms at sea"
        ],
        "answer": 0,
        "fact": "The nazar, an eye-shaped blue glass amulet, is worn to deflect the 'evil eye' (nazar) — a harmful gaze thought to be born of envy.",
        "src": "https://en.wikipedia.org/wiki/Nazar_(amulet)",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "A traditional Turkish 'hamam' is what kind of place?",
        "options": [
          "A Sufi lodge",
          "A communal steam bathhouse",
          "A covered spice market",
          "A sultan's tomb"
        ],
        "answer": 1,
        "fact": "A hamam is a communal steam bath with cold, warm and hot rooms; inherited from Roman thermae, it long served washing, ritual ablution and socialising.",
        "src": "https://en.wikipedia.org/wiki/Turkish_bath",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Sold from carts all across the city, 'simit' is a what?",
        "options": [
          "A yogurt drink",
          "A sweet syrup pastry",
          "A sesame-crusted bread ring",
          "A grilled meat skewer"
        ],
        "answer": 2,
        "fact": "Simit is a circular bread crusted with sesame seeds, an iconic street snack often eaten with tea or cheese for breakfast.",
        "src": "https://en.wikipedia.org/wiki/Simit",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "'Balık ekmek', a classic snack by Istanbul's waterfront, is a sandwich of what?",
        "options": [
          "Grilled fish",
          "Spiced lamb",
          "Roasted chestnuts",
          "Fried eggplant"
        ],
        "answer": 0,
        "fact": "Balık ekmek ('fish bread') is a grilled mackerel fillet served in bread, a specialty of the seafood stalls lining Istanbul's docks.",
        "src": "https://en.wikipedia.org/wiki/Fish_sandwich",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "'Lokum' is the Turkish name for which sweet?",
        "options": [
          "Baklava",
          "Turkish delight",
          "Halva",
          "Rice pudding"
        ],
        "answer": 1,
        "fact": "Lokum (Turkish delight) is a soft confection of starch and sugar, often scented with rosewater or mastic and studded with nuts.",
        "src": "https://en.wikipedia.org/wiki/Turkish_delight",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "Completed in 537 CE under Emperor Justinian I, Hagia Sophia (Ayasofya) was originally built as a what?",
        "options": [
          "A royal palace",
          "A public library",
          "A Christian cathedral",
          "A bathhouse"
        ],
        "answer": 2,
        "fact": "Built as the Byzantine cathedral in 537, Hagia Sophia later became a mosque (1453), then a museum (1935), then a mosque again (2020).",
        "src": "https://en.wikipedia.org/wiki/Hagia_Sophia",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "The Sultan Ahmed Mosque earns its nickname the 'Blue Mosque' from its what?",
        "options": [
          "Blue İznik tiles",
          "Blue domes",
          "Blue marble floors",
          "Blue window glass"
        ],
        "answer": 0,
        "fact": "Built 1609-1617, the mosque is lined with thousands of blue İznik tiles that give it its 'Blue Mosque' nickname; it has six minarets.",
        "src": "https://en.wikipedia.org/wiki/Sultan_Ahmed_Mosque",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "The Bosphorus strait that runs through Istanbul links the Sea of Marmara to which sea?",
        "options": [
          "The Aegean Sea",
          "The Black Sea",
          "The Mediterranean Sea",
          "The Caspian Sea"
        ],
        "answer": 1,
        "fact": "The Bosphorus connects the Sea of Marmara to the Black Sea and forms part of the continental boundary between Europe and Asia.",
        "src": "https://en.wikipedia.org/wiki/Bosporus",
        "theme": "Landmarks",
        "diff": 1
      }
    ],
    "phrases": [
      {
        "phrase": "Merhaba",
        "meaning": "Hello",
        "pron": "MEHR-ha-ba"
      },
      {
        "phrase": "Teşekkür ederim",
        "meaning": "Thank you",
        "pron": "teh-shek-KYUR eh-deh-reem"
      },
      {
        "phrase": "Lütfen",
        "meaning": "Please",
        "pron": "LEWT-fen"
      },
      {
        "phrase": "Affedersiniz",
        "meaning": "Excuse me / Sorry",
        "pron": "ahf-eh-DEHR-see-neez"
      },
      {
        "phrase": "Ne kadar?",
        "meaning": "How much is it?",
        "pron": "neh ka-DAR"
      },
      {
        "phrase": "... nerede?",
        "meaning": "Where is ...?",
        "pron": "NEH-reh-deh"
      }
    ],
    "tips": [
      "At mosques, dress modestly and remove your shoes; women should bring a scarf for their hair. Many mosques lend head coverings free — and it's polite to avoid visiting during the five daily prayer times.",
      "Tipping (bahşiş) is customary but modest: around 5-10% in restaurants and rounding up for taxis; check first whether a service charge is already on the bill.",
      "A glass of çay (tea) or Turkish coffee is an offer of hospitality — accept it graciously, and know you're rarely expected to pay when a shopkeeper offers one.",
      "Bargaining is normal and expected in the Grand Bazaar and street markets, but not in fixed-price shops, cafés or supermarkets — stay friendly and feel free to walk away.",
      "A scam to sidestep: a friendly stranger who invites you to a bar or club, where you're later handed a hugely inflated bill; likewise decline the 'dropped' shoe-shine brush trick."
    ]
  }
];
