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
  },
  {
    "city": "Bangkok",
    "country": "Thailand",
    "region": "Asia",
    "emoji": "🛕",
    "lang": "Thai",
    "blurb": "Krung Thep — the \"City of Angels\" that Thais have never stopped calling home — unfurls along the Chao Phraya, where longtail boats, gilded temple spires and sizzling street woks carry Rattanakosin heritage into the present. Founded by Rama I in 1782 after the fall of Ayutthaya, Bangkok remains a living royal capital where reverence for temple and crown still shapes the rhythm of the day.",
    "questions": [
      {
        "q": "In what year did King Rama I found Bangkok as the new capital of Siam?",
        "options": [
          "1620",
          "1855",
          "1782",
          "1932"
        ],
        "answer": 2,
        "fact": "On 21 April 1782 Rama I founded the Chakri dynasty and moved the capital across the Chao Phraya to Bang Makok, later named Rattanakosin.",
        "src": "https://en.wikipedia.org/wiki/Rattanakosin_Kingdom",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "Which former Siamese capital, destroyed in 1767, did Bangkok ultimately succeed?",
        "options": [
          "Sukhothai",
          "Ayutthaya",
          "Chiang Mai",
          "Nakhon Pathom"
        ],
        "answer": 1,
        "fact": "After a 14-month siege, Ayutthaya fell to Burmese forces in April 1767, ending the 417-year-old kingdom that had long ruled Siam.",
        "src": "https://en.wikipedia.org/wiki/Ayutthaya_Kingdom",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "After Ayutthaya's fall, King Taksin set up a short-lived capital across the river from today's Bangkok at which city?",
        "options": [
          "Lopburi",
          "Phitsanulok",
          "Nonthaburi",
          "Thonburi"
        ],
        "answer": 3,
        "fact": "King Taksin founded his capital at Thonburi in December 1767, on the Chao Phraya's west bank, opposite where Rama I would later build Bangkok.",
        "src": "https://en.wikipedia.org/wiki/Thonburi_Kingdom",
        "theme": "History",
        "diff": 3
      },
      {
        "q": "What is the traditional Thai greeting made with the palms pressed together and a slight bow?",
        "options": [
          "Wai",
          "Sampeah",
          "Namaste",
          "Sembah"
        ],
        "answer": 0,
        "fact": "The wai — a slight bow with palms pressed together — is Thailand's everyday greeting; the higher the hands, the more respect it conveys.",
        "src": "https://en.wikipedia.org/wiki/Wai_(gesture)",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Which Thai festival marks the traditional New Year with nationwide water-splashing each April?",
        "options": [
          "Loy Krathong",
          "Songkran",
          "Yi Peng",
          "Vesak"
        ],
        "answer": 1,
        "fact": "Songkran, the Thai New Year around 13-15 April, is famed for water fights symbolising cleansing; UNESCO inscribed it on the Representative List of Intangible Cultural Heritage in December 2023.",
        "src": "https://en.wikipedia.org/wiki/Songkran",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "Most Thai Buddhists follow which branch of Buddhism?",
        "options": [
          "Mahayana",
          "Vajrayana",
          "Theravada",
          "Nichiren"
        ],
        "answer": 2,
        "fact": "Theravada Buddhism is practised by the great majority of Thais and shapes temple life, the monkhood, and daily merit-making across the country.",
        "src": "https://en.wikipedia.org/wiki/Buddhism_in_Thailand",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Which stir-fried rice-noodle dish is regarded as one of Thailand's national dishes?",
        "options": [
          "Nasi goreng",
          "Pho",
          "Char kway teow",
          "Pad thai"
        ],
        "answer": 3,
        "fact": "Pad thai, stir-fried rice noodles with tamarind, fish sauce, egg and peanuts, is a Thai street-food staple and one of the national dishes.",
        "src": "https://en.wikipedia.org/wiki/Pad_thai",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "Tom yum is a Thai soup best known for which flavour profile?",
        "options": [
          "Hot and sour",
          "Sweet and creamy",
          "Mild and salty",
          "Bitter and smoky"
        ],
        "answer": 0,
        "fact": "Tom yum is a family of hot and sour Thai soups fragrant with lemongrass, galangal, kaffir lime leaves and chilli, often made with prawns.",
        "src": "https://en.wikipedia.org/wiki/Tom_yum",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Som tam, a fiery Thai salad, is pounded mainly from which shredded unripe fruit?",
        "options": [
          "Green mango",
          "Green papaya",
          "Jackfruit",
          "Guava"
        ],
        "answer": 1,
        "fact": "Som tam is a spicy salad of shredded unripe green papaya pounded with lime, chilli, fish sauce and palm sugar, rooted in Isan and Lao cooking.",
        "src": "https://en.wikipedia.org/wiki/Som_tam",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Which riverside complex, begun in 1782, was the official royal residence of the Kings of Siam?",
        "options": [
          "Wat Arun",
          "Jim Thompson House",
          "The Grand Palace",
          "Dusit Zoo"
        ],
        "answer": 2,
        "fact": "Construction of the Grand Palace began in 1782 under Rama I; it served as the official residence of the Kings of Siam and, later, Thailand.",
        "src": "https://en.wikipedia.org/wiki/Grand_Palace",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "Wat Phra Kaew, inside the Grand Palace, enshrines which revered image?",
        "options": [
          "The Reclining Buddha",
          "The Golden Buddha",
          "The Standing Buddha",
          "The Emerald Buddha"
        ],
        "answer": 3,
        "fact": "Wat Phra Kaew, within the Grand Palace, houses the Emerald Buddha, a jade image venerated as the palladium (protective sacred object) of Thailand.",
        "src": "https://en.wikipedia.org/wiki/Temple_of_the_Emerald_Buddha",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Which Bangkok temple is famed for a 46-metre gold-leaf Reclining Buddha and traditional Thai massage?",
        "options": [
          "Wat Pho",
          "Wat Arun",
          "Wat Saket",
          "Wat Traimit"
        ],
        "answer": 0,
        "fact": "Wat Pho houses a 46 m Reclining Buddha and is regarded as the birthplace of traditional Thai massage, still taught at the temple's school.",
        "src": "https://en.wikipedia.org/wiki/Wat_Pho",
        "theme": "Landmarks",
        "diff": 2
      }
    ],
    "phrases": [
      {
        "phrase": "สวัสดีครับ / สวัสดีค่ะ",
        "meaning": "Hello (male speaker / female speaker)",
        "pron": "sa-wat-dee khrap / kha"
      },
      {
        "phrase": "ขอบคุณครับ / ขอบคุณค่ะ",
        "meaning": "Thank you",
        "pron": "kop-kun khrap / kha"
      },
      {
        "phrase": "ขอโทษครับ / ขอโทษค่ะ",
        "meaning": "Excuse me / Sorry",
        "pron": "kaw-thoht khrap / kha"
      },
      {
        "phrase": "ขอ...หน่อย",
        "meaning": "Please / may I have... (softens a request)",
        "pron": "kaw ... noi"
      },
      {
        "phrase": "เท่าไหร่",
        "meaning": "How much (does it cost)?",
        "pron": "tao-rai"
      },
      {
        "phrase": "...อยู่ที่ไหน",
        "meaning": "Where is...?",
        "pron": "... yoo tee-nai"
      }
    ],
    "tips": [
      "Dress modestly at temples and the Grand Palace: keep shoulders and knees covered and slip your shoes off before entering any temple hall — a light scarf makes an easy cover-up.",
      "Tipping isn't expected but is appreciated — round up taxi fares and leave small change at street stalls; smarter restaurants often already add a 10% service charge.",
      "Common scam: a friendly stranger near the Grand Palace says it's 'closed today' and offers a cheap tuk-tuk gem-shop tour. It's open daily — walk on and use metered taxis or a ride app.",
      "Keep the head high and feet low: don't touch anyone's head or point your soles at people or Buddha images, and tuck your feet behind you when sitting on temple floors.",
      "Show respect to monks and the monarchy — women shouldn't touch a monk or hand items straight to one, and Thais stand for the royal anthem before films, so it's polite to join in."
    ]
  },
  {
    "city": "Cusco",
    "country": "Peru",
    "region": "Americas",
    "emoji": "🦙",
    "lang": "Spanish",
    "blurb": "High in the Andes, Qosqo was the heart of Tawantinsuyu, the Inca world of four united regions, and it still beats today. Quechua fills its markets, Inca walls carry the colonial churches built on top of them, and every June solstice Inti Raymi relights the great fortress of Sacsayhuaman.",
    "questions": [
      {
        "q": "Qosqo (Cusco) was the capital of which state?",
        "options": [
          "The Aztec Empire",
          "The Chimu kingdom",
          "The Inca Empire (Tawantinsuyu)",
          "The Maya city-states"
        ],
        "answer": 2,
        "fact": "Qosqo was the heart of Tawantinsuyu, 'the four regions together,' the Inca-planned political and sacred center of their Andean world.",
        "src": "https://en.wikipedia.org/wiki/Cusco",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "Qorikancha, Qosqo's most sacred temple, was dedicated to which deity?",
        "options": [
          "Supay, the underworld",
          "Inti, the sun",
          "Mama Cocha, the sea",
          "Illapa, the thunder"
        ],
        "answer": 1,
        "fact": "Qorikancha ('golden enclosure') honored Inti, the sun. Spanish colonists stripped its gold and raised the Santo Domingo church on its Inca walls.",
        "src": "https://en.wikipedia.org/wiki/Coricancha",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "What did Spanish colonists build directly atop Qosqo's Inca stone walls after 1533?",
        "options": [
          "Wooden watchtowers",
          "A stone pyramid",
          "Nothing; they left the city untouched",
          "Catholic churches and mansions"
        ],
        "answer": 3,
        "fact": "Colonial churches and homes rise on Inca foundations, whose earthquake-resistant masonry repeatedly outlasted the Spanish structures built above it.",
        "src": "https://en.wikipedia.org/wiki/Cusco",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "Which Indigenous language, still spoken around Qosqo today, was the language of the Inca?",
        "options": [
          "Quechua (Runasimi)",
          "Nahuatl",
          "Guarani",
          "Mapudungun"
        ],
        "answer": 0,
        "fact": "Quechua, called Runasimi ('the people's speech'), is still spoken by millions across the Andes; in 1975 Peru made it an official language.",
        "src": "https://en.wikipedia.org/wiki/Quechuan_languages",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "Inti Raymi, staged each June at Sacsayhuaman, celebrates what?",
        "options": [
          "A maize harvest festival of Lima",
          "A Catholic patron saint",
          "The sun and the winter solstice",
          "The founding of Peru's republic"
        ],
        "answer": 2,
        "fact": "Inti Raymi, the 'Festival of the Sun,' marks the June solstice. Revived in 1944, it fills Sacsayhuaman with thousands each June 24.",
        "src": "https://en.wikipedia.org/wiki/Inti_Raymi",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Chewing which leaf is a traditional Andean custom for easing altitude and fatigue?",
        "options": [
          "Tobacco leaf",
          "Coca leaf",
          "Eucalyptus leaf",
          "Bay leaf"
        ],
        "answer": 1,
        "fact": "Andean peoples have chewed coca and drunk mate de coca for thousands of years to ease altitude and fatigue; it is legal and customary in Peru.",
        "src": "https://en.wikipedia.org/wiki/Coca",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "Cuy, a traditional Andean festive dish, is which animal?",
        "options": [
          "Guinea pig",
          "Rabbit",
          "Duck",
          "Llama"
        ],
        "answer": 0,
        "fact": "Cuy (guinea pig) has been raised for food in the Andes for millennia and is roasted for celebrations across the Cusco region.",
        "src": "https://en.wikipedia.org/wiki/Guinea_pig",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "The Andes are the birthplace of which staple crop, central to Cusco's cuisine?",
        "options": [
          "Wheat",
          "Rice",
          "Olives",
          "The potato"
        ],
        "answer": 3,
        "fact": "Potatoes were domesticated around Lake Titicaca; the Andes grow roughly 3,000 varieties, many freeze-dried into storable chuno.",
        "src": "https://en.wikipedia.org/wiki/Potato",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Chicha morada, a popular Cusco drink, is made from what?",
        "options": [
          "Fermented grapes",
          "Coconut water",
          "Purple corn",
          "Black tea"
        ],
        "answer": 2,
        "fact": "Chicha morada is a sweet, non-alcoholic drink boiled from purple maize (maiz morado) with pineapple, cinnamon, and cloves.",
        "src": "https://en.wikipedia.org/wiki/Chicha_morada",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Sacsayhuaman, above Qosqo, is famous for what building feature?",
        "options": [
          "Glazed-brick domes",
          "Huge stones fitted without mortar",
          "Marble columns",
          "Timber A-frames"
        ],
        "answer": 1,
        "fact": "Sacsayhuaman's zigzag walls use limestone blocks over 100 tonnes, fitted so tightly without mortar that a sheet of paper won't slip between them.",
        "src": "https://en.wikipedia.org/wiki/Sacsayhuam%C3%A1n",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Cusco's celebrated Hatun Rumiyoc wall features a single famous stone with how many angles?",
        "options": [
          "Twelve",
          "Four",
          "Seven",
          "Twenty"
        ],
        "answer": 0,
        "fact": "The 'Twelve-Angled Stone' on Hatun Rumiyoc street shows Inca precision, each of its twelve angles locking neatly into the surrounding blocks.",
        "src": "https://en.wikipedia.org/wiki/Twelve-angled_stone",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Which 15th-century Inca estate on a ridge northwest of Cusco is a UNESCO World Heritage Site?",
        "options": [
          "Chichen Itza",
          "Tikal",
          "Teotihuacan",
          "Machu Picchu"
        ],
        "answer": 3,
        "fact": "Machu Picchu, built around 1450 under Pachacuti above the Urubamba valley, lies about 80 km from Cusco and is a UNESCO World Heritage Site.",
        "src": "https://en.wikipedia.org/wiki/Machu_Picchu",
        "theme": "Landmarks",
        "diff": 1
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
        "phrase": "Perdon",
        "meaning": "Excuse me / Sorry",
        "pron": "pehr-DOHN"
      },
      {
        "phrase": "Cuanto cuesta?",
        "meaning": "How much is it?",
        "pron": "KWAN-toh KWEHS-tah"
      },
      {
        "phrase": "Donde esta...?",
        "meaning": "Where is...?",
        "pron": "DOHN-deh ehs-TAH"
      }
    ],
    "tips": [
      "Cusco sits at about 3,400 m: arrive slowly, rest your first day, drink plenty of water, and sip mate de coca (coca-leaf tea) to ease soroche (altitude sickness).",
      "Tipping isn't mandatory but is appreciated: round up or leave roughly 10% in restaurants, and tip trekking guides and porters who work hard at high altitude.",
      "Dress modestly and remove your hat inside churches such as the Cathedral and Santo Domingo; photography inside is often restricted or forbidden, so ask first.",
      "Use official or app-booked taxis and agree the fare before getting in; cabs rarely run meters, so settling the price up front avoids being overcharged.",
      "Always ask and offer a small tip before photographing people in traditional dress or posing with their llamas and alpacas around the Plaza de Armas."
    ]
  },
  {
    "city": "Marrakech",
    "country": "Morocco",
    "region": "Africa",
    "emoji": "🕌",
    "lang": "Moroccan Arabic (Darija)",
    "blurb": "Founded nearly a thousand years ago by the Amazigh (Berber) Almoravids where Saharan caravan routes met the snow-capped Atlas, Marrakech still guards a red-walled medina alive with craft souks, storytellers on Jemaa el-Fnaa, and glasses of mint tea poured from on high.",
    "questions": [
      {
        "q": "Which dynasty founded Marrakech around 1070 CE?",
        "options": [
          "The Almoravids",
          "The Ottomans",
          "The Fatimids",
          "The Umayyads of Damascus"
        ],
        "answer": 0,
        "fact": "The Amazigh (Berber) Almoravids founded Marrakech around 1070 as their capital, and it grew into a hub linking the Maghreb with sub-Saharan Africa.",
        "src": "https://en.wikipedia.org/wiki/Marrakesh",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "The Almoravids and Almohads who built Marrakech rose from which North African people?",
        "options": [
          "The Amazigh (Berbers)",
          "The Phoenicians",
          "The Vandals",
          "The Normans"
        ],
        "answer": 0,
        "fact": "The Almoravids emerged from Sanhaja Amazigh (Berber) tribes of the Sahara; the Amazigh are the region's Indigenous people, long predating Arab arrival.",
        "src": "https://en.wikipedia.org/wiki/Almoravid_dynasty",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "Marrakech thrived as a northern terminus for caravans crossing which desert?",
        "options": [
          "The Sahara",
          "The Gobi",
          "The Kalahari",
          "The Arabian Desert"
        ],
        "answer": 0,
        "fact": "Camel caravans crossed the Sahara carrying gold, salt and goods between West Africa and the Maghreb, and Marrakech was a key trading gateway.",
        "src": "https://en.wikipedia.org/wiki/Trans-Saharan_trade",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "The Koutoubia, Marrakech's most famous landmark, is what kind of building?",
        "options": [
          "A mosque with a towering minaret",
          "A royal palace",
          "A covered market",
          "A desert fortress"
        ],
        "answer": 0,
        "fact": "Marrakech's largest mosque, the Koutoubia has a 77m minaret that likely inspired Seville's Giralda and Rabat's Hassan Tower.",
        "src": "https://en.wikipedia.org/wiki/Koutoubia_Mosque",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "How does UNESCO recognize the square Jemaa el-Fnaa?",
        "options": [
          "As Intangible Cultural Heritage",
          "As a natural World Heritage site",
          "As a war memorial",
          "As a modern art museum"
        ],
        "answer": 0,
        "fact": "Proclaimed a UNESCO Masterpiece of Oral and Intangible Heritage in 2001, the square's living tradition of storytellers and musicians is celebrated.",
        "src": "https://en.wikipedia.org/wiki/Jemaa_el-Fnaa",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "Marrakech's nickname, the 'Red City', comes from what?",
        "options": [
          "Its red earthen walls and buildings",
          "Its red desert sunsets",
          "A famous red-carpet market",
          "Red-painted city gates"
        ],
        "answer": 0,
        "fact": "The medina's ramparts and many buildings use local red earth and sandstone; the walls were raised in the 1120s under Ali ibn Yusuf.",
        "src": "https://en.wikipedia.org/wiki/Marrakesh",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "The Amazigh (Berber) language of Morocco has its own alphabet, called what?",
        "options": [
          "Tifinagh",
          "Cyrillic",
          "Hangul",
          "Cuneiform"
        ],
        "answer": 0,
        "fact": "Tifinagh, a script with ancient Saharan roots, writes Tamazight; a modern form is now taught and appears on signage across Morocco.",
        "src": "https://en.wikipedia.org/wiki/Tifinagh",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Why is Moroccan mint tea traditionally poured from high above the glass?",
        "options": [
          "To aerate it and form a foam",
          "To cool it instantly",
          "To measure the amount",
          "To strain out the sugar"
        ],
        "answer": 0,
        "fact": "Made from green tea, fresh mint and sugar, the tea is poured from a height to aerate it and create a frothy top; serving it signals hospitality.",
        "src": "https://en.wikipedia.org/wiki/Maghrebi_mint_tea",
        "theme": "Culture",
        "diff": 1
      },
      {
        "q": "How are the souks of Marrakech's medina traditionally arranged?",
        "options": [
          "By craft, each area for one trade",
          "Alphabetically by shop name",
          "By the age of the seller",
          "In one single giant hall"
        ],
        "answer": 0,
        "fact": "The medina's souks were historically divided into areas for particular crafts (leather, carpets, metalwork, pottery), reflecting old artisan trades.",
        "src": "https://en.wikipedia.org/wiki/Marrakesh",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "The Moroccan dish tagine takes its name from what?",
        "options": [
          "The conical clay pot it cooks in",
          "A town near Marrakech",
          "The chef who invented it",
          "A type of spice"
        ],
        "answer": 0,
        "fact": "Tagine names both the slow-cooked stew and the lidded conical earthenware pot it cooks in, which traps steam to keep the food moist.",
        "src": "https://en.wikipedia.org/wiki/Tajine",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "In Morocco, the steamed semolina dish couscous is traditionally eaten on which day?",
        "options": [
          "Friday",
          "Monday",
          "Sunday",
          "Wednesday"
        ],
        "answer": 0,
        "fact": "A Maghrebi staple of steamed durum-semolina granules, couscous is traditionally served in Morocco on Fridays after midday prayers.",
        "src": "https://en.wikipedia.org/wiki/Couscous",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Which slow-cooked meat dish is a signature specialty of Marrakech?",
        "options": [
          "Tanjia",
          "Sushi",
          "Paella",
          "Goulash"
        ],
        "answer": 0,
        "fact": "Tanjia is Marrakech's own dish: meat, preserved lemon and spices sealed in an urn-shaped pot and slow-cooked for hours in embers.",
        "src": "https://en.wikipedia.org/wiki/Tanjia",
        "theme": "Food",
        "diff": 3
      }
    ],
    "phrases": [
      {
        "phrase": "سلام",
        "meaning": "Hello (lit. 'peace')",
        "pron": "sa-LAAM"
      },
      {
        "phrase": "شكراً",
        "meaning": "Thank you",
        "pron": "SHOK-ran"
      },
      {
        "phrase": "عافاك",
        "meaning": "Please",
        "pron": "ah-FAAK"
      },
      {
        "phrase": "سمح ليا",
        "meaning": "Excuse me / Sorry",
        "pron": "smah LEE-ya"
      },
      {
        "phrase": "بشحال؟",
        "meaning": "How much is it?",
        "pron": "bish-HAAL"
      },
      {
        "phrase": "فين...؟",
        "meaning": "Where is...?",
        "pron": "feen"
      }
    ],
    "tips": [
      "Dress modestly in the medina; covering shoulders and knees is respectful, especially near mosques and shrines, which in Morocco are generally closed to non-Muslims.",
      "Haggling in the souks is a normal, good-natured custom, not a confrontation; settle on a price before you buy, and it is fine to smile and walk away.",
      "Always ask before photographing people or the performers on Jemaa el-Fnaa; many rely on it for a living and will expect a few dirham in return.",
      "Tipping is customary; keep small dirham coins handy for waiters, cafe staff, guides, and anyone who genuinely helps you.",
      "Ignore strangers who insist a street or sight is 'closed' and offer to lead you elsewhere, as it usually ends at a shop; a polite 'la, shukran' (no, thanks) is enough."
    ]
  },
  {
    "city": "Athens",
    "country": "Greece",
    "region": "Europe",
    "emoji": "🏛️",
    "lang": "Greek",
    "blurb": "Athens wears its whole history at once: the marble Parthenon high on the Acropolis, an 11th-century Byzantine chapel stranded in a shopping street, an Ottoman mosque on Monastiraki Square, all wrapped in the cafe clatter of a city that has been trading, arguing and singing for nearly three thousand years.",
    "questions": [
      {
        "q": "In classical Athens, who was actually eligible to vote in the citizens' Assembly?",
        "options": [
          "Every adult who lived in the city",
          "Free adult male citizens only",
          "Women who owned property",
          "Enslaved men who had paid a fee"
        ],
        "answer": 1,
        "fact": "Athenian democracy was radical for its era yet barred women, the enslaved and resident foreigners (metics); only free adult male citizens could vote.",
        "src": "https://en.wikipedia.org/wiki/Athenian_democracy",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "Athens became the capital of the modern Greek state in which decade?",
        "options": [
          "The 1770s",
          "The 1830s",
          "The 1890s",
          "The 1920s"
        ],
        "answer": 1,
        "fact": "In 1834 the young kingdom moved its capital to Athens, then a town of a few thousand; King Otto's planners built a modern city beneath the Acropolis.",
        "src": "https://en.wikipedia.org/wiki/Athens",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "The Parthenon sculptures taken by Lord Elgin in the early 1800s are today displayed in which museum?",
        "options": [
          "The Acropolis Museum, Athens",
          "The British Museum, London",
          "The Louvre, Paris",
          "The Pergamon Museum, Berlin"
        ],
        "answer": 1,
        "fact": "Removed from the Ottoman-ruled Acropolis around 1801-12, the marbles sit in London's British Museum; Greece has long asked for their return, a dispute still open.",
        "src": "https://en.wikipedia.org/wiki/Elgin_Marbles",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "Who are the Evzones, seen guarding the Tomb of the Unknown Soldier in Syntagma Square?",
        "options": [
          "Ottoman-era palace janissaries",
          "Ceremonial Presidential Guard soldiers",
          "Ancient hoplite re-enactors",
          "Municipal traffic police"
        ],
        "answer": 1,
        "fact": "The kilted (fustanella) Evzones are Greece's ceremonial Presidential Guard; their slow, stylised changing of the guard honours the war dead.",
        "src": "https://en.wikipedia.org/wiki/Evzones",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Alongside birthdays, which personal celebration is traditionally important in Greek life?",
        "options": [
          "A name day",
          "A half-birthday",
          "A harvest day",
          "A founding day"
        ],
        "answer": 0,
        "fact": "Most Greeks share a name with an Orthodox saint and celebrate that saint's feast as their name day, often with an open house for well-wishers.",
        "src": "https://en.wikipedia.org/wiki/Name_day",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Which style of Greek urban folk music, rooted in Piraeus and Athens, is on UNESCO's heritage list?",
        "options": [
          "Fado",
          "Rebetiko",
          "Flamenco",
          "Tango"
        ],
        "answer": 1,
        "fact": "Rebetiko grew among the urban poor of Piraeus and Athens, driven by the bouzouki; UNESCO added it to its intangible cultural heritage list in 2017.",
        "src": "https://en.wikipedia.org/wiki/Rebetiko",
        "theme": "Culture",
        "diff": 3
      },
      {
        "q": "What is souvlaki, a beloved Athenian street food?",
        "options": [
          "Small pieces of grilled meat on a skewer",
          "A cold yoghurt soup",
          "A semolina dessert",
          "A chilled seafood stew"
        ],
        "answer": 0,
        "fact": "Souvlaki, skewered grilled meat often tucked into pita with tomato, onion and tzatziki, is Athens's classic cheap, quick street meal.",
        "src": "https://en.wikipedia.org/wiki/Souvlaki",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "The Greek version of moussaka is a baked dish built mainly around which vegetable?",
        "options": [
          "Aubergine (eggplant)",
          "Cabbage",
          "Okra",
          "Beetroot"
        ],
        "answer": 0,
        "fact": "Greek moussaka layers sauteed aubergine with spiced minced meat under a rich bechamel topping, then bakes until golden.",
        "src": "https://en.wikipedia.org/wiki/Moussaka",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "The frappe, a summertime Greek cafe staple, is made by shaking what?",
        "options": [
          "Instant coffee, water and sugar",
          "Fresh espresso and cream",
          "Green tea and mint",
          "Cocoa and milk"
        ],
        "answer": 0,
        "fact": "Invented in Thessaloniki in 1957, the frappe whips instant coffee, water and sugar into a thick foam over ice, a hallmark of Greek cafe life.",
        "src": "https://en.wikipedia.org/wiki/Frapp%C3%A9_coffee",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "The Parthenon, crowning the Acropolis, was first built as a temple to which deity?",
        "options": [
          "Athena",
          "Poseidon",
          "Aphrodite",
          "Apollo"
        ],
        "answer": 0,
        "fact": "The 5th-century-BC Parthenon honoured Athena, the city's patron; over the centuries it also served as a church and, under Ottoman rule, a mosque.",
        "src": "https://en.wikipedia.org/wiki/Parthenon",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "A tiny 11th-century Byzantine church, Kapnikarea, sits marooned in the middle of which busy Athens street?",
        "options": [
          "Ermou shopping street",
          "The Acropolis summit",
          "Piraeus harbour",
          "The Syntagma metro platform"
        ],
        "answer": 0,
        "fact": "Kapnikarea, an 11th-century Byzantine church, survives in the middle of Ermou shopping street, a reminder of Athens's medieval Christian layer.",
        "src": "https://en.wikipedia.org/wiki/Kapnikarea",
        "theme": "Landmarks",
        "diff": 3
      },
      {
        "q": "The 1759 Tzistarakis Mosque on Monastiraki Square is a surviving trace of which era of Athens?",
        "options": [
          "Roman",
          "Byzantine",
          "Ottoman",
          "Venetian"
        ],
        "answer": 2,
        "fact": "Built in 1759, the Tzistarakis Mosque recalls the long Ottoman period of Athens; it now houses part of the Museum of Greek Folk Art.",
        "src": "https://en.wikipedia.org/wiki/Tzistarakis_Mosque",
        "theme": "Landmarks",
        "diff": 3
      }
    ],
    "phrases": [
      {
        "phrase": "Γεια σας",
        "meaning": "Hello (polite / to more than one person)",
        "pron": "YAH-sas"
      },
      {
        "phrase": "Ευχαριστώ",
        "meaning": "Thank you",
        "pron": "ef-kha-ri-STOH"
      },
      {
        "phrase": "Παρακαλώ",
        "meaning": "Please / You're welcome",
        "pron": "pa-ra-ka-LOH"
      },
      {
        "phrase": "Συγγνώμη",
        "meaning": "Excuse me / Sorry",
        "pron": "sigh-NOH-mee"
      },
      {
        "phrase": "Πόσο κάνει;",
        "meaning": "How much is it?",
        "pron": "POH-so KAH-nee"
      },
      {
        "phrase": "Πού είναι...;",
        "meaning": "Where is...?",
        "pron": "POO EE-neh"
      }
    ],
    "tips": [
      "At Orthodox churches and monasteries, cover shoulders and knees; women are sometimes offered a wrap or long skirt at the door.",
      "Tipping is not mandatory, but locals commonly round up the bill or leave roughly 5-10% in tavernas for good service.",
      "Insist taxis switch on the meter (or agree the fare first), and be wary of an over-friendly stranger near Syntagma or Plaka steering you to a specific bar, where inflated-bill scams happen.",
      "Never thrust an open palm with fingers spread toward someone: the 'moutza' gesture is a serious insult in Greece.",
      "Name days can matter as much as birthdays, and early afternoon (roughly 3-5pm) is a traditional rest time, so keep the noise down in residential streets."
    ]
  },
  {
    "city": "Samarkand",
    "country": "Uzbekistan",
    "region": "Asia",
    "emoji": "🕌",
    "lang": "Uzbek",
    "blurb": "Samarkand rises from the Zarafshan valley in turquoise domes and star-tiled madrasas — the Sogdian merchants' Silk Road city that Timur made his capital and that Ulugh Beg turned toward the heavens. Every glittering facade here is a page of Central Asian learning, faith and craft, told on its own terms.",
    "questions": [
      {
        "q": "Before the coming of Islam, the merchants of Samarkand who grew wealthy along the Silk Road were known as the...?",
        "options": [
          "Phoenicians",
          "Vikings",
          "Sogdians",
          "Etruscans"
        ],
        "answer": 2,
        "fact": "Sogdian traders from Marakanda (Samarkand) ran a network of Silk Road merchant colonies, spreading their language, script and goods across Asia.",
        "src": "https://en.wikipedia.org/wiki/Sogdia",
        "theme": "History",
        "diff": 2
      },
      {
        "q": "Which 14th-century ruler made Samarkand the dazzling capital of his empire?",
        "options": [
          "Genghis Khan",
          "Timur (Tamerlane)",
          "Cyrus the Great",
          "Kublai Khan"
        ],
        "answer": 1,
        "fact": "Timur (Tamerlane) poured the wealth of his campaigns into Samarkand from the 1370s, rebuilding it as the monumental capital of his Central Asian empire.",
        "src": "https://en.wikipedia.org/wiki/Timur",
        "theme": "History",
        "diff": 1
      },
      {
        "q": "In the medieval Islamic world, Samarkand became especially renowned for manufacturing high-quality...?",
        "options": [
          "paper",
          "porcelain",
          "gunpowder",
          "glass"
        ],
        "answer": 0,
        "fact": "By legend, papermaking reached Samarkand after 751 CE; its mills produced paper prized across the Islamic world, home to the first paper mill in the region.",
        "src": "https://en.wikipedia.org/wiki/Samarkand",
        "theme": "History",
        "diff": 3
      },
      {
        "q": "A 'suzani', a craft treasured in Samarkand and across Uzbekistan, is a type of...?",
        "options": [
          "glazed ceramic bowl",
          "carved wooden door",
          "copper teapot",
          "embroidered textile"
        ],
        "answer": 3,
        "fact": "Suzani are hand-embroidered cloths, often stitched by women for dowries, with sun, pomegranate and flower motifs symbolising fertility and good fortune.",
        "src": "https://en.wikipedia.org/wiki/Suzani_(textile)",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "Navruz, one of the biggest celebrations in the Uzbek year, marks the...?",
        "options": [
          "midsummer harvest",
          "spring equinox and new year",
          "winter solstice",
          "end of Ramadan"
        ],
        "answer": 1,
        "fact": "Navruz (Nowruz) welcomes spring at the equinox around 21 March, marked with festive foods like sumalak; UNESCO lists it as intangible cultural heritage.",
        "src": "https://en.wikipedia.org/wiki/Nowruz",
        "theme": "Culture",
        "diff": 2
      },
      {
        "q": "In Uzbekistan a 'choyxona' (chaikhana) is a traditional...?",
        "options": [
          "mosque",
          "bathhouse",
          "teahouse",
          "covered bazaar"
        ],
        "answer": 2,
        "fact": "The choyxona, or teahouse, is a hub of social life where people linger over green tea (kok choy) on raised platforms known as tapchan.",
        "src": "https://en.wikipedia.org/wiki/Teahouse",
        "theme": "Culture",
        "diff": 3
      },
      {
        "q": "The rice dish widely regarded as Uzbekistan's national dish, central to Samarkand feasts, is...?",
        "options": [
          "plov (osh)",
          "sushi",
          "risotto",
          "jollof rice"
        ],
        "answer": 0,
        "fact": "Plov (osh) simmers rice with lamb, carrots and onions in a kazan; UNESCO listed Uzbek and Tajik pilaf traditions as intangible cultural heritage in 2016.",
        "src": "https://en.wikipedia.org/wiki/Pilaf",
        "theme": "Food",
        "diff": 1
      },
      {
        "q": "'Samsa', a popular snack sold hot from ovens in Samarkand, is a baked pastry usually filled with...?",
        "options": [
          "sweet custard",
          "fish and rice",
          "chocolate",
          "meat and onions"
        ],
        "answer": 3,
        "fact": "Samsa are savoury pastries, most often filled with minced lamb and onion, and baked crisp against the hot inner walls of a clay tandir oven.",
        "src": "https://en.wikipedia.org/wiki/Samsa_(food)",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Samarkand's famous round 'non' bread gets its shape and crust from being baked in a...?",
        "options": [
          "cast-iron wok",
          "clay tandir oven",
          "deep fryer",
          "waffle iron"
        ],
        "answer": 1,
        "fact": "Obi non, Samarkand's dense round loaf, is stamped with a chekich in the centre and slapped onto the wall of a clay tandir; bread is treated with deep respect.",
        "src": "https://en.wikipedia.org/wiki/Uzbek_cuisine",
        "theme": "Food",
        "diff": 2
      },
      {
        "q": "Samarkand's most celebrated public square, framed by three grand madrasas, is the...?",
        "options": [
          "Red Square",
          "Piazza San Marco",
          "Registan",
          "Meidan Emam"
        ],
        "answer": 2,
        "fact": "The Registan's three madrasas—Ulugh Beg, Sher-Dor and Tilya-Kori—faced onto a public square that was once Samarkand's centre of learning and civic life.",
        "src": "https://en.wikipedia.org/wiki/Registan",
        "theme": "Landmarks",
        "diff": 1
      },
      {
        "q": "Shah-i-Zinda, one of Samarkand's most beautiful sites, is an avenue of...?",
        "options": [
          "mausoleums (a necropolis)",
          "market stalls",
          "hot springs",
          "royal stables"
        ],
        "answer": 0,
        "fact": "Shah-i-Zinda ('the Living King') is a necropolis of blue-tiled mausoleums from the 11th-15th centuries, clustered around a long-revered shrine.",
        "src": "https://en.wikipedia.org/wiki/Shah-i-Zinda",
        "theme": "Landmarks",
        "diff": 2
      },
      {
        "q": "The Ulugh Beg Observatory in Samarkand was built in the 15th century to study the...?",
        "options": [
          "ocean tides",
          "stars and planets",
          "movement of glaciers",
          "migration of birds"
        ],
        "answer": 1,
        "fact": "Ulugh Beg's observatory housed a huge stone sextant; its astronomers catalogued over 1,000 stars in the Zij-i-Sultani, remarkably accurate for its day.",
        "src": "https://en.wikipedia.org/wiki/Ulugh_Beg_Observatory",
        "theme": "Landmarks",
        "diff": 3
      }
    ],
    "phrases": [
      {
        "phrase": "Assalomu alaykum",
        "meaning": "Hello (lit. 'peace be upon you'); the standard, respectful greeting",
        "pron": "as-sa-LO-mu a-lay-KUM"
      },
      {
        "phrase": "Rahmat",
        "meaning": "Thank you",
        "pron": "rah-MAT"
      },
      {
        "phrase": "Iltimos",
        "meaning": "Please",
        "pron": "il-ti-MOS"
      },
      {
        "phrase": "Kechirasiz",
        "meaning": "Excuse me / sorry",
        "pron": "ke-chi-ra-SIZ"
      },
      {
        "phrase": "Qancha turadi?",
        "meaning": "How much is it (does it cost)?",
        "pron": "QAN-cha tu-RA-di"
      },
      {
        "phrase": "... qayerda?",
        "meaning": "Where is ...? (e.g. 'Hojatxona qayerda?' = Where is the toilet?)",
        "pron": "... qa-YER-da"
      }
    ],
    "tips": [
      "Dress modestly at the Registan, mosques and Shah-i-Zinda: cover shoulders and knees, women may want a light scarf for active prayer areas, and remove shoes where asked.",
      "Bread (non) is treated as sacred: never lay a loaf upside down or throw it away, and tear it by hand at the table rather than cutting it with a knife.",
      "Tipping is modest and optional: rounding up or leaving about 5-10% is welcome where no service charge is added, and small notes help as cards aren't accepted everywhere.",
      "Return the greeting 'Assalomu alaykum' and accept tea when hosts offer it: hospitality is a point of pride, and a hand placed over your heart is a warm way to say thanks.",
      "Agree the fare before getting into an unmetered taxi (or use the Yandex Go app), and change money at banks or official exchange desks rather than with street changers."
    ]
  }
];
