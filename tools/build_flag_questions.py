# -*- coding: utf-8 -*-
"""Generate "which country's flag is this?" questions from Wikimedia Commons.

CEO, 2026-08-09: "In the menu Train, Countries and Flags, the quiz needs to show
a flag and the user finds the country. Right now we do not have any questions
that meet this criteria. We should add them, these are easy to add — a good way
to learn all countries in the world."

He is right that it is easy, but only because the flags are already free: every
national flag on Commons is public domain or freely licensed, and the app now
supports a picture attached to a question (`img`). What is NOT easy, and is the
reason this is a script rather than a hand-written list, is that a flag question
written in words gives itself away — you cannot ask "which country has a red
circle on white" without having answered it.

Two things this deliberately does NOT do:

  · It does not use flag emoji. Windows ships no flag glyphs at all, so a large
    share of readers would see the two letters of the country code where the
    flag should be — and those two letters are the answer.

  · It does not pick distractors at random. Three countries from three different
    continents make the answer obvious from the shape of the options alone. The
    wrong answers come from the SAME region, which is what makes this worth
    playing: the flags of Chad and Romania, or Indonesia and Monaco, are the
    whole point.

Runs at build time; writes JSON for tools/merge_questions.py to fold in.

    py tools/build_flag_questions.py            # write tools/generated_flags.json
    py tools/build_flag_questions.py --limit 5  # a quick sample while iterating
"""
import io, json, os, random, sys, time, urllib.parse, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", "generated_flags.json")
EN_API = "https://en.wikipedia.org/w/api.php"
FR_API = "https://fr.wikipedia.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"
UA = "QpioFlagBuilder/1.0 (https://qpio.app; QpioCorp@mail.com)"
THUMB = 640

# Region is for choosing distractors, not for display. Deliberately broad — the
# aim is "plausibly confusable", not a geography lesson about who belongs where.
COUNTRIES = [
    # (English name, Wikipedia article for the COUNTRY, Commons flag file, region)
    ("Japan", "Japan", "Flag of Japan.svg", "Asia"),
    ("South Korea", "South Korea", "Flag of South Korea.svg", "Asia"),
    ("Vietnam", "Vietnam", "Flag of Vietnam.svg", "Asia"),
    ("Thailand", "Thailand", "Flag of Thailand.svg", "Asia"),
    ("Nepal", "Nepal", "Flag of Nepal.svg", "Asia"),
    ("India", "India", "Flag of India.svg", "Asia"),
    ("Bangladesh", "Bangladesh", "Flag of Bangladesh.svg", "Asia"),
    ("Indonesia", "Indonesia", "Flag of Indonesia.svg", "Asia"),
    ("Philippines", "Philippines", "Flag of the Philippines.svg", "Asia"),
    ("Mongolia", "Mongolia", "Flag of Mongolia.svg", "Asia"),
    ("Kazakhstan", "Kazakhstan", "Flag of Kazakhstan.svg", "Asia"),
    ("Bhutan", "Bhutan", "Flag of Bhutan.svg", "Asia"),
    ("Sri Lanka", "Sri Lanka", "Flag of Sri Lanka.svg", "Asia"),
    ("Cambodia", "Cambodia", "Flag of Cambodia.svg", "Asia"),

    ("Brazil", "Brazil", "Flag of Brazil.svg", "Americas"),
    ("Argentina", "Argentina", "Flag of Argentina.svg", "Americas"),
    ("Mexico", "Mexico", "Flag of Mexico.svg", "Americas"),
    ("Canada", "Canada", "Flag of Canada (Pantone).svg", "Americas"),
    ("Peru", "Peru", "Flag of Peru.svg", "Americas"),
    ("Colombia", "Colombia", "Flag of Colombia.svg", "Americas"),
    ("Chile", "Chile", "Flag of Chile.svg", "Americas"),
    ("Uruguay", "Uruguay", "Flag of Uruguay.svg", "Americas"),
    ("Jamaica", "Jamaica", "Flag of Jamaica.svg", "Americas"),
    ("Cuba", "Cuba", "Flag of Cuba.svg", "Americas"),

    ("Kenya", "Kenya", "Flag of Kenya.svg", "Africa"),
    ("Ghana", "Ghana", "Flag of Ghana.svg", "Africa"),
    ("Nigeria", "Nigeria", "Flag of Nigeria.svg", "Africa"),
    ("South Africa", "South Africa", "Flag of South Africa.svg", "Africa"),
    ("Ethiopia", "Ethiopia", "Flag of Ethiopia.svg", "Africa"),
    ("Egypt", "Egypt", "Flag of Egypt.svg", "Africa"),
    ("Morocco", "Morocco", "Flag of Morocco.svg", "Africa"),
    ("Senegal", "Senegal", "Flag of Senegal.svg", "Africa"),
    ("Tanzania", "Tanzania", "Flag of Tanzania.svg", "Africa"),
    ("Mali", "Mali", "Flag of Mali.svg", "Africa"),
    ("Rwanda", "Rwanda", "Flag of Rwanda.svg", "Africa"),
    ("Botswana", "Botswana", "Flag of Botswana.svg", "Africa"),
    ("Namibia", "Namibia", "Flag of Namibia.svg", "Africa"),
    ("Mozambique", "Mozambique", "Flag of Mozambique.svg", "Africa"),

    ("France", "France", "Flag of France.svg", "Europe"),
    ("Germany", "Germany", "Flag of Germany.svg", "Europe"),
    ("Italy", "Italy", "Flag of Italy.svg", "Europe"),
    ("Spain", "Spain", "Flag of Spain.svg", "Europe"),
    ("Portugal", "Portugal", "Flag of Portugal.svg", "Europe"),
    ("Greece", "Greece", "Flag of Greece.svg", "Europe"),
    ("Sweden", "Sweden", "Flag of Sweden.svg", "Europe"),
    ("Norway", "Norway", "Flag of Norway.svg", "Europe"),
    ("Finland", "Finland", "Flag of Finland.svg", "Europe"),
    ("Iceland", "Iceland", "Flag of Iceland.svg", "Europe"),
    ("Poland", "Poland", "Flag of Poland.svg", "Europe"),
    ("Switzerland", "Switzerland", "Flag of Switzerland.svg", "Europe"),
    ("Romania", "Romania", "Flag of Romania.svg", "Europe"),
    ("Ireland", "Republic of Ireland", "Flag of Ireland.svg", "Europe"),
    ("Netherlands", "Netherlands", "Flag of the Netherlands.svg", "Europe"),
    ("Belgium", "Belgium", "Flag of Belgium.svg", "Europe"),
    ("Ukraine", "Ukraine", "Flag of Ukraine.svg", "Europe"),
    ("Albania", "Albania", "Flag of Albania.svg", "Europe"),

    ("Turkey", "Turkey", "Flag of Turkey.svg", "MiddleEast"),
    ("Israel", "Israel", "Flag of Israel.svg", "MiddleEast"),
    ("Saudi Arabia", "Saudi Arabia", "Flag of Saudi Arabia.svg", "MiddleEast"),
    ("Iran", "Iran", "Flag of Iran.svg", "MiddleEast"),
    ("Lebanon", "Lebanon", "Flag of Lebanon.svg", "MiddleEast"),
    ("Jordan", "Jordan", "Flag of Jordan.svg", "MiddleEast"),
    ("Qatar", "Qatar", "Flag of Qatar.svg", "MiddleEast"),
    ("United Arab Emirates", "United Arab Emirates", "Flag of the United Arab Emirates.svg", "MiddleEast"),

    ("Australia", "Australia", "Flag of Australia (converted).svg", "Oceania"),
    ("New Zealand", "New Zealand", "Flag of New Zealand.svg", "Oceania"),
    ("Fiji", "Fiji", "Flag of Fiji.svg", "Oceania"),
    ("Papua New Guinea", "Papua New Guinea", "Flag of Papua New Guinea.svg", "Oceania"),
]


def get(url, params, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(
                url + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                print("   ! %s" % e)
                return None
            time.sleep(1.5 * (i + 1))


def flag_image(filename):
    """Thumb URL, author and licence for one Commons file."""
    d = get(COMMONS, {
        "action": "query", "titles": "File:" + filename, "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": THUMB, "format": "json", "formatversion": "2",
    })
    if not d:
        return None
    pages = d.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing"):
        return None
    ii = (pages[0].get("imageinfo") or [{}])[0]
    meta = ii.get("extmetadata") or {}

    def m(k):
        v = (meta.get(k) or {}).get("value") or ""
        # extmetadata returns HTML; the author field is often a whole <a> tag.
        v = re.sub(r"<[^>]+>", "", v)
        return v.replace("&amp;", "&").strip()

    url = ii.get("thumburl") or ii.get("url")
    if not url:
        return None
    # The API appends its own utm_* campaign parameters to thumb URLs. Shipping
    # those would mean every reader's flag request carried Wikimedia's analytics
    # tags — small, but we do not pass tracking on to anyone.
    url = url.split("?")[0]
    lic = m("LicenseShortName")
    by = m("Artist") or "Wikimedia Commons"
    # Most national flags are PD; saying "public domain" is clearer than a code.
    if lic.lower().startswith("public domain"):
        lic = "Public domain"
    return {"u": url, "by": by[:70], "lic": lic or "See file page",
            "p": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(filename.replace(" ", "_")),
            "fit": "contain"}


def fr_title(article):
    d = get(EN_API, {"action": "query", "titles": article, "prop": "langlinks",
                     "lllang": "fr", "format": "json", "formatversion": "2"})
    if not d:
        return None
    pages = d.get("query", {}).get("pages", [])
    if not pages:
        return None
    ll = pages[0].get("langlinks") or []
    return ll[0].get("title") if ll else None


def flag_article_exists(article):
    """Flag_of_X is the best src: it is about the flag, and it has the flag on it."""
    title = "Flag of " + article if not article.startswith("Flag of") else article
    # redirects=1 matters: "Flag of Netherlands" exists as a redirect, and
    # storing the redirect's slug means the image map, the French title map and
    # the hook map all miss — they key on the canonical title.
    d = get(EN_API, {"action": "query", "titles": title, "redirects": "1",
                     "format": "json", "formatversion": "2"})
    if not d:
        return None
    pages = d.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing"):
        return None
    return pages[0]["title"].replace(" ", "_")


import re  # after the docstring-heavy top, kept local to its first use above


# ALT TEXT — the design, never the country.
#
# A flag question is purely visual, so alt="a flag" makes it unanswerable for
# anyone using a screen reader: they are told a question exists and given no way
# to answer it. Describing the DESIGN fixes that without giving anything away —
# a blind reader who knows flags can now play, exactly like a sighted one who
# knows flags. "Accessibility is fundamental" is a Charter value, not a nice-to-
# have, and this is what it costs: sixty-eight sentences written by hand.
#
# Never name the country, the language, or anything on the flag that spells it.
FLAG_ALT = {
    "Japan": "A white flag with a large red circle in the centre.",
    "South Korea": "A white flag with a red-and-blue circular symbol in the centre and four groups of black bars in the corners.",
    "Vietnam": "A red flag with a single large yellow five-pointed star in the centre.",
    "Thailand": "Five horizontal bands: red, white, a thicker blue centre, white, red.",
    "Nepal": "The only non-rectangular national flag: two stacked crimson pennants with a blue border, bearing a white moon and a white sun.",
    "India": "Three horizontal bands of saffron, white and green, with a navy-blue 24-spoke wheel in the centre.",
    "Bangladesh": "A dark green flag with a red circle set slightly left of centre.",
    "Indonesia": "Two horizontal bands, red above white.",
    "Philippines": "A white triangle at the hoist bearing a golden sun and three stars, beside horizontal blue and red bands.",
    "Mongolia": "Three vertical bands of red, blue, red, with a golden columnar emblem on the hoist band.",
    "Kazakhstan": "A sky-blue flag with a golden sun above a soaring eagle, and a vertical golden ornamental pattern at the hoist.",
    "Bhutan": "Divided diagonally yellow and orange, with a large white dragon clutching jewels across the centre.",
    "Sri Lanka": "A golden lion holding a sword on a maroon field with four leaves, beside two vertical green and orange stripes.",
    "Cambodia": "Blue, red and blue horizontal bands with a white three-towered temple in the centre.",
    "Brazil": "A green flag with a yellow diamond and a blue globe crossed by a white banner of stars.",
    "Argentina": "Light blue, white and light blue horizontal bands with a golden sun face in the centre.",
    "Mexico": "Green, white and red vertical bands with an eagle on a cactus in the centre.",
    "Canada": "A white centre square between two red bands, with a red eleven-pointed leaf in the middle.",
    "Peru": "Red, white and red vertical bands.",
    "Colombia": "Three horizontal bands: a double-height yellow band above blue and red.",
    "Chile": "A white band above red, with a blue square at the hoist bearing a single white star.",
    "Uruguay": "Nine alternating white and blue horizontal stripes with a golden sun face in a white canton.",
    "Jamaica": "A gold diagonal cross dividing green triangles above and below from black triangles at the sides.",
    "Cuba": "Five blue and white stripes with a red triangle at the hoist bearing a white star.",
    "Kenya": "Black, red and green horizontal bands separated by thin white lines, with a Maasai shield and spears in the centre.",
    "Ghana": "Red, gold and green horizontal bands with a black five-pointed star in the centre.",
    "Nigeria": "Three vertical bands: green, white, green.",
    "South Africa": "Six colours in a horizontal Y shape: a green band edged in white and gold separating red above from blue below, with a black triangle at the hoist.",
    "Ethiopia": "Green, yellow and red horizontal bands with a blue disc bearing a yellow star in the centre.",
    "Egypt": "Red, white and black horizontal bands with a golden eagle in the centre.",
    "Morocco": "A red flag with a green interlaced five-pointed star in the centre.",
    "Senegal": "Green, yellow and red vertical bands with a green five-pointed star on the yellow.",
    "Tanzania": "A green upper triangle and a blue lower triangle divided by a black diagonal edged in yellow.",
    "Mali": "Three vertical bands: green, yellow, red.",
    "Rwanda": "Horizontal bands of sky blue, yellow and green, with a golden sun in the upper right.",
    "Botswana": "A light blue field crossed by a horizontal black band edged in white.",
    "Namibia": "A red diagonal band edged in white, with a golden sun in the blue upper triangle and a green lower triangle.",
    "Mozambique": "Green, black and yellow bands with white edging, and a red hoist triangle bearing a star, a book, a hoe and a rifle.",
    "France": "Three vertical bands: blue, white, red.",
    "Germany": "Three horizontal bands: black, red, gold.",
    "Italy": "Three vertical bands: green, white, red.",
    "Spain": "Red, a double-height yellow band, and red, with a coat of arms toward the hoist.",
    "Portugal": "Green at the hoist and red beyond, with an armillary sphere and shield over the join.",
    "Greece": "Nine blue and white horizontal stripes with a white cross on blue in the canton.",
    "Sweden": "A yellow off-centre cross on blue.",
    "Norway": "A blue off-centre cross outlined in white, on red.",
    "Finland": "A blue off-centre cross on white.",
    "Iceland": "A red off-centre cross outlined in white, on blue.",
    "Poland": "Two horizontal bands, white above red.",
    "Switzerland": "A square red flag with a bold white cross in the centre.",
    "Romania": "Three vertical bands: blue, yellow, red.",
    "Ireland": "Three vertical bands: green, white, orange.",
    "Netherlands": "Three horizontal bands: red, white, blue.",
    "Belgium": "Three vertical bands: black, yellow, red.",
    "Ukraine": "Two horizontal bands, blue above yellow.",
    "Albania": "A red flag with a black two-headed eagle in the centre.",
    "Turkey": "A red flag with a white crescent and a white five-pointed star.",
    "Israel": "A white flag with two horizontal blue stripes and a blue six-pointed star in the centre.",
    "Saudi Arabia": "A green flag with white Arabic script above a horizontal white sword.",
    "Iran": "Green, white and red horizontal bands with a red emblem in the centre and repeated white script along the band edges.",
    "Lebanon": "Red, a double-height white band, and red, with a green cedar tree in the centre.",
    "Jordan": "Black, white and green horizontal bands with a red hoist triangle bearing a white seven-pointed star.",
    "Qatar": "A maroon field with a white serrated band at the hoist.",
    "United Arab Emirates": "A vertical red band at the hoist beside green, white and black horizontal bands.",
    "Australia": "A blue flag with another country's flag in the canton, a large seven-pointed star below it, and five stars of the Southern Cross at the fly.",
    "New Zealand": "A blue flag with another country's flag in the canton and four red stars outlined in white at the fly.",
    "Fiji": "A light blue flag with another country's flag in the canton and a shield at the fly.",
    "Papua New Guinea": "Divided diagonally: a black upper triangle with the Southern Cross in white, and a red lower triangle with a golden bird of paradise.",
}


# The same descriptions in French. Alt text is read BY the reader, so it is
# content, not metadata — an English description on a French screen helps nobody.
FLAG_ALT_FR = {
    "Japan": "Un drapeau blanc portant un grand cercle rouge en son centre.",
    "South Korea": "Un drapeau blanc avec un symbole circulaire rouge et bleu au centre et quatre groupes de barres noires aux angles.",
    "Vietnam": "Un drapeau rouge portant une seule grande étoile jaune à cinq branches au centre.",
    "Thailand": "Cinq bandes horizontales : rouge, blanc, une bande bleue centrale plus large, blanc, rouge.",
    "Nepal": "Le seul drapeau national non rectangulaire : deux fanions cramoisis superposés bordés de bleu, portant une lune et un soleil blancs.",
    "India": "Trois bandes horizontales safran, blanche et verte, avec une roue bleu marine à 24 rayons au centre.",
    "Bangladesh": "Un drapeau vert foncé avec un cercle rouge légèrement décalé vers la gauche.",
    "Indonesia": "Deux bandes horizontales, rouge au-dessus de blanc.",
    "Philippines": "Un triangle blanc au guindant portant un soleil doré et trois étoiles, à côté de bandes horizontales bleue et rouge.",
    "Mongolia": "Trois bandes verticales rouge, bleue, rouge, avec un emblème doré en colonne sur la bande du guindant.",
    "Kazakhstan": "Un drapeau bleu ciel avec un soleil doré au-dessus d'un aigle planant, et un motif ornemental doré vertical au guindant.",
    "Bhutan": "Divisé en diagonale, jaune et orange, avec un grand dragon blanc tenant des joyaux en travers du centre.",
    "Sri Lanka": "Un lion doré tenant une épée sur fond bordeaux avec quatre feuilles, à côté de deux bandes verticales verte et orange.",
    "Cambodia": "Bandes horizontales bleue, rouge et bleue avec un temple blanc à trois tours au centre.",
    "Brazil": "Un drapeau vert avec un losange jaune et un globe bleu traversé d'une banderole blanche étoilée.",
    "Argentina": "Bandes horizontales bleu clair, blanche et bleu clair avec un visage de soleil doré au centre.",
    "Mexico": "Bandes verticales verte, blanche et rouge avec un aigle sur un cactus au centre.",
    "Canada": "Un carré blanc central entre deux bandes rouges, avec une feuille rouge à onze pointes au milieu.",
    "Peru": "Bandes verticales rouge, blanche et rouge.",
    "Colombia": "Trois bandes horizontales : une bande jaune de double hauteur au-dessus du bleu et du rouge.",
    "Chile": "Une bande blanche au-dessus du rouge, avec un carré bleu au guindant portant une étoile blanche.",
    "Uruguay": "Neuf bandes horizontales blanches et bleues alternées avec un visage de soleil doré dans un canton blanc.",
    "Jamaica": "Une croix diagonale dorée séparant des triangles verts en haut et en bas de triangles noirs sur les côtés.",
    "Cuba": "Cinq bandes bleues et blanches avec un triangle rouge au guindant portant une étoile blanche.",
    "Kenya": "Bandes horizontales noire, rouge et verte séparées par de fines lignes blanches, avec un bouclier et des lances au centre.",
    "Ghana": "Bandes horizontales rouge, or et verte avec une étoile noire à cinq branches au centre.",
    "Nigeria": "Trois bandes verticales : verte, blanche, verte.",
    "South Africa": "Six couleurs en Y horizontal : une bande verte bordée de blanc et d'or séparant le rouge du bleu, avec un triangle noir au guindant.",
    "Ethiopia": "Bandes horizontales verte, jaune et rouge avec un disque bleu portant une étoile jaune au centre.",
    "Egypt": "Bandes horizontales rouge, blanche et noire avec un aigle doré au centre.",
    "Morocco": "Un drapeau rouge avec une étoile verte à cinq branches entrelacée au centre.",
    "Senegal": "Bandes verticales verte, jaune et rouge avec une étoile verte à cinq branches sur le jaune.",
    "Tanzania": "Un triangle supérieur vert et un triangle inférieur bleu séparés par une diagonale noire bordée de jaune.",
    "Mali": "Trois bandes verticales : verte, jaune, rouge.",
    "Rwanda": "Bandes horizontales bleu ciel, jaune et verte, avec un soleil doré en haut à droite.",
    "Botswana": "Un fond bleu clair traversé d'une bande horizontale noire bordée de blanc.",
    "Namibia": "Une bande diagonale rouge bordée de blanc, avec un soleil doré dans le triangle bleu supérieur et un triangle vert en bas.",
    "Mozambique": "Bandes verte, noire et jaune bordées de blanc, et un triangle rouge au guindant portant une étoile, un livre, une houe et un fusil.",
    "France": "Trois bandes verticales : bleue, blanche, rouge.",
    "Germany": "Trois bandes horizontales : noire, rouge, or.",
    "Italy": "Trois bandes verticales : verte, blanche, rouge.",
    "Spain": "Rouge, une bande jaune de double hauteur, et rouge, avec des armoiries vers le guindant.",
    "Portugal": "Vert au guindant et rouge au-delà, avec une sphère armillaire et un écu sur la jonction.",
    "Greece": "Neuf bandes bleues et blanches avec une croix blanche sur fond bleu dans le canton.",
    "Sweden": "Une croix jaune décentrée sur fond bleu.",
    "Norway": "Une croix bleue décentrée bordée de blanc, sur fond rouge.",
    "Finland": "Une croix bleue décentrée sur fond blanc.",
    "Iceland": "Une croix rouge décentrée bordée de blanc, sur fond bleu.",
    "Poland": "Deux bandes horizontales, blanche au-dessus de rouge.",
    "Switzerland": "Un drapeau carré rouge portant une large croix blanche au centre.",
    "Romania": "Trois bandes verticales : bleue, jaune, rouge.",
    "Ireland": "Trois bandes verticales : verte, blanche, orange.",
    "Netherlands": "Trois bandes horizontales : rouge, blanche, bleue.",
    "Belgium": "Trois bandes verticales : noire, jaune, rouge.",
    "Ukraine": "Deux bandes horizontales, bleue au-dessus de jaune.",
    "Albania": "Un drapeau rouge portant un aigle noir à deux têtes au centre.",
    "Turkey": "Un drapeau rouge avec un croissant blanc et une étoile blanche à cinq branches.",
    "Israel": "Un drapeau blanc à deux bandes horizontales bleues et une étoile bleue à six branches au centre.",
    "Saudi Arabia": "Un drapeau vert portant une inscription arabe blanche au-dessus d'un sabre blanc horizontal.",
    "Iran": "Bandes horizontales verte, blanche et rouge avec un emblème rouge au centre et une inscription blanche répétée le long des bordures.",
    "Lebanon": "Rouge, une bande blanche de double hauteur, et rouge, avec un cèdre vert au centre.",
    "Jordan": "Bandes horizontales noire, blanche et verte avec un triangle rouge au guindant portant une étoile blanche à sept branches.",
    "Qatar": "Un fond bordeaux avec une bande blanche dentelée au guindant.",
    "United Arab Emirates": "Une bande verticale rouge au guindant à côté de bandes horizontales verte, blanche et noire.",
    "Australia": "Un drapeau bleu portant le drapeau d'un autre pays dans le canton, une grande étoile à sept branches en dessous, et cinq étoiles de la Croix du Sud au battant.",
    "New Zealand": "Un drapeau bleu portant le drapeau d'un autre pays dans le canton et quatre étoiles rouges bordées de blanc au battant.",
    "Fiji": "Un drapeau bleu clair portant le drapeau d'un autre pays dans le canton et un écu au battant.",
    "Papua New Guinea": "Divisé en diagonale : un triangle noir supérieur avec la Croix du Sud en blanc, et un triangle rouge inférieur avec un oiseau de paradis doré.",
}


# THE PAYOFF, written by hand.
#
# The first build pulled these from the opening of each Wikipedia article and
# they were useless: "The national flag of Japan is a white banner with a red
# circle at its center" tells the reader what they have just spent ten seconds
# looking at. House rule — the fact has to teach something they did not know and
# would want to repeat. So each of these is about WHY the flag looks like that,
# or what happened to it, and none of them describe it.
FLAG_FACT = {
    "Japan": ("Japan had no legally defined national flag until 1999 — for 130 years it was simply the one everybody used.",
              "Le Japon n'a eu de drapeau national légalement défini qu'en 1999 : pendant 130 ans, c'était simplement celui que tout le monde utilisait."),
    "South Korea": ("The four corner symbols are trigrams from the I Ching, and they stand for heaven, earth, fire and water.",
                    "Les quatre symboles des coins sont des trigrammes du Yi King : le ciel, la terre, le feu et l'eau."),
    "Vietnam": ("The design was first flown in a failed 1940 uprising, five years before the country it now represents existed.",
                "Ce drapeau a d'abord flotté lors d'un soulèvement manqué en 1940, cinq ans avant l'existence du pays qu'il représente."),
    "Thailand": ("The old flag showed a white elephant. It was changed after being flown upside down in front of the king.",
                 "L'ancien drapeau portait un éléphant blanc. Il a été changé après avoir été hissé à l'envers devant le roi."),
    "Nepal": ("It is the only national flag on Earth that is not a rectangle, and its exact shape is defined in the constitution by geometric construction.",
              "C'est le seul drapeau national non rectangulaire au monde, et sa forme exacte est définie dans la constitution par une construction géométrique."),
    "India": ("The wheel replaced a spinning wheel at independence — the same object, redrawn as an ancient emperor's symbol of law.",
              "La roue a remplacé un rouet à l'indépendance : le même objet, redessiné en symbole de la loi d'un empereur antique."),
    "Bangladesh": ("The disc sits left of centre on purpose, so that it looks centred once the flag is flying.",
                   "Le disque est décalé vers la gauche exprès, pour paraître centré une fois le drapeau au vent."),
    "Indonesia": ("It is almost identical to Monaco's, which is older — the two countries simply agreed to live with it.",
                  "Il est presque identique à celui de Monaco, plus ancien : les deux pays ont simplement choisi de s'en accommoder."),
    "Philippines": ("It is flown upside down in wartime — the only national flag with a deliberate second, official meaning.",
                    "En temps de guerre, il est hissé à l'envers : le seul drapeau national doté d'un second sens officiel."),
    "Mongolia": ("The golden symbol on the hoist, the Soyombo, is a character from an alphabet invented by a 17th-century monk.",
                 "Le symbole doré du guindant, le Soyombo, est un caractère d'un alphabet inventé par un moine du XVIIe siècle."),
    "Kazakhstan": ("The pattern down the hoist is a national ornament — the flag was designed by an artist who won an open public contest.",
                   "Le motif du guindant est un ornement national : le drapeau a été dessiné par un artiste vainqueur d'un concours public."),
    "Bhutan": ("The dragon is holding jewels, and it is white to represent purity rather than any of the country's peoples.",
               "Le dragon tient des joyaux, et il est blanc pour représenter la pureté plutôt qu'un peuple du pays."),
    "Sri Lanka": ("The two stripes were added in 1951 to represent minorities the original lion flag had left out.",
                  "Les deux bandes ont été ajoutées en 1951 pour représenter des minorités que le drapeau au lion avait ignorées."),
    "Cambodia": ("It is the only national flag that shows a building — and that building is Angkor Wat.",
                 "C'est le seul drapeau national représentant un bâtiment, et ce bâtiment est Angkor Vat."),
    "Brazil": ("The stars show the sky over Rio at a precise moment: the morning the republic was proclaimed in 1889.",
               "Les étoiles montrent le ciel de Rio à un instant précis : le matin de la proclamation de la république, en 1889."),
    "Argentina": ("The sun face has a name — the Sun of May — and it also appears on Uruguay's flag.",
                  "Le soleil a un nom, le Soleil de Mai, et il figure aussi sur le drapeau de l'Uruguay."),
    "Mexico": ("The scene is a founding legend: a city was to be built where an eagle was seen on a cactus, eating a snake.",
               "La scène illustre une légende fondatrice : bâtir la ville là où un aigle serait vu sur un cactus, dévorant un serpent."),
    "Canada": ("It is only from 1965. Before that the country flew a flag carrying another nation's, after decades of argument.",
               "Il ne date que de 1965. Avant cela, le pays arborait un drapeau portant celui d'une autre nation, après des décennies de débats."),
    "Peru": ("Legend says the colours come from flamingos a liberating general saw as he landed on the coast.",
             "La légende veut que les couleurs viennent de flamants roses aperçus par un général libérateur en débarquant."),
    "Colombia": ("Colombia, Ecuador and Venezuela share these colours because they were once a single country.",
                 "La Colombie, l'Équateur et le Venezuela partagent ces couleurs : ils ne formaient autrefois qu'un seul pays."),
    "Chile": ("Its design predates Texas's very similar flag by nearly twenty years.",
              "Son dessin précède de près de vingt ans celui, très proche, du Texas."),
    "Uruguay": ("The nine stripes are not decoration — they are the nine original departments of the country.",
                "Les neuf bandes ne sont pas décoratives : ce sont les neuf départements d'origine du pays."),
    "Jamaica": ("It is the only national flag in the world that contains neither red, white nor blue.",
                "C'est le seul drapeau national au monde ne contenant ni rouge, ni blanc, ni bleu."),
    "Cuba": ("It was designed in New York in 1849, by exiles, decades before independence.",
             "Il a été dessiné à New York en 1849 par des exilés, des décennies avant l'indépendance."),
    "Kenya": ("The shield and spears in the centre are Maasai, and they were added to say the freedom won would be defended.",
              "Le bouclier et les lances du centre sont massaï : ils signifient que la liberté conquise sera défendue."),
    "Ghana": ("Its black star was borrowed by a football team, a shipping line and, later, half a continent's flags.",
              "Son étoile noire a été reprise par une équipe de football, une compagnie maritime et, plus tard, par d'autres drapeaux du continent."),
    "Nigeria": ("The design was chosen from nearly 3,000 entries in a competition — won by a 23-year-old student.",
                "Le dessin a été choisi parmi près de 3 000 propositions lors d'un concours, remporté par un étudiant de 23 ans."),
    "South Africa": ("Adopted in 1994 as an interim design meant to last five years, it was so well liked it was simply kept.",
                     "Adopté en 1994 comme dessin provisoire prévu pour cinq ans, il a tant plu qu'il a simplement été conservé."),
    "Ethiopia": ("Its green, yellow and red were adopted across Africa as the pan-African colours — because this country was never colonised.",
                 "Son vert, jaune et rouge sont devenus les couleurs panafricaines, parce que ce pays n'a jamais été colonisé."),
    "Egypt": ("The bird in the centre is the Eagle of Saladin, a symbol adopted by several Arab republics.",
              "L'oiseau du centre est l'aigle de Saladin, symbole repris par plusieurs républiques arabes."),
    "Morocco": ("The star was added in 1915 so the flag could be told apart at sea from other plain red ones.",
                "L'étoile a été ajoutée en 1915 pour distinguer le drapeau en mer d'autres pavillons entièrement rouges."),
    "Senegal": ("It kept the colours of a short-lived federation with a neighbour and swapped the emblem for a star.",
                "Il a gardé les couleurs d'une éphémère fédération avec un voisin, en remplaçant l'emblème par une étoile."),
    "Tanzania": ("It is a merger of two flags, because the country is a union of a mainland republic and an island one.",
                 "C'est la fusion de deux drapeaux, car le pays est l'union d'une république continentale et d'une république insulaire."),
    "Mali": ("A human figure was removed from the centre in 1961, a year after independence.",
             "Une figure humaine a été retirée du centre en 1961, un an après l'indépendance."),
    "Rwanda": ("The flag was completely redesigned in 2001 to remove colours associated with the 1994 genocide.",
               "Le drapeau a été entièrement redessiné en 2001 pour retirer les couleurs associées au génocide de 1994."),
    "Botswana": ("The blue stands for water and the national motto is simply the word for rain.",
                 "Le bleu représente l'eau, et la devise nationale est simplement le mot qui signifie « pluie »."),
    "Namibia": ("The sun has twelve rays, one for each of the country's main communities.",
                "Le soleil compte douze rayons, un pour chacune des principales communautés du pays."),
    "Mozambique": ("It is the only national flag showing a modern rifle, and there are regular parliamentary attempts to remove it.",
                   "C'est le seul drapeau national montrant un fusil moderne, et des députés proposent régulièrement de le retirer."),
    "France": ("The three bands are not equal in the original design — blue was made narrower so they would look equal at sea.",
               "Les trois bandes n'étaient pas égales à l'origine : le bleu était plus étroit pour paraître égal en mer."),
    "Germany": ("The colours come from the uniforms of volunteer soldiers in the 1810s, not from any royal house.",
                "Les couleurs viennent des uniformes de soldats volontaires des années 1810, et non d'une maison royale."),
    "Italy": ("Napoleon's arrival is why it exists: the design copies the French tricolour with green in place of blue.",
              "Il doit son existence à Napoléon : le dessin reprend le tricolore français, le vert remplaçant le bleu."),
    "Spain": ("The colours were chosen in 1785 for one reason — to be visible from far away at sea.",
              "Les couleurs ont été choisies en 1785 pour une seule raison : être visibles de loin en mer."),
    "Portugal": ("The sphere in the centre is a navigation instrument, put there to credit the sailors rather than the kings.",
                 "La sphère du centre est un instrument de navigation, placé là pour honorer les marins plutôt que les rois."),
    "Greece": ("The nine stripes are widely said to be the nine syllables of a revolutionary war cry.",
               "Les neuf bandes correspondraient aux neuf syllabes d'un cri de guerre révolutionnaire."),
    "Sweden": ("The off-centre cross is a Nordic pattern: every flag using it points the cross toward the flagpole.",
               "La croix décentrée est un motif nordique : tous les drapeaux qui l'emploient la décalent vers le mât."),
    "Norway": ("It carries two crosses, one inside the other, recording rule by two different neighbours.",
               "Il porte deux croix, l'une dans l'autre, souvenir de la domination de deux voisins différents."),
    "Finland": ("The blue is for the country's tens of thousands of lakes, the white for snow.",
                "Le bleu évoque les dizaines de milliers de lacs du pays, le blanc la neige."),
    "Iceland": ("Its colours are a landscape: red for volcanic fire, white for ice, blue for the ocean around it.",
                "Ses couleurs sont un paysage : le rouge du feu volcanique, le blanc de la glace, le bleu de l'océan."),
    "Poland": ("Hung the other way up it becomes Monaco's and Indonesia's — the order of the two bands is the whole difference.",
               "Inversé, il devient celui de Monaco et de l'Indonésie : l'ordre des deux bandes fait toute la différence."),
    "Switzerland": ("It is one of only two square national flags in the world; the other belongs to the Vatican.",
                    "C'est l'un des deux seuls drapeaux nationaux carrés au monde ; l'autre est celui du Vatican."),
    "Romania": ("It is nearly identical to Chad's, and the two countries have argued about it at the United Nations.",
                "Il est presque identique à celui du Tchad, et les deux pays s'en sont disputés jusqu'à l'ONU."),
    "Ireland": ("The white band is the point of it: it was designed to stand for peace between the two traditions on either side.",
                "La bande blanche en est tout le sens : elle a été conçue pour représenter la paix entre les deux traditions qui l'encadrent."),
    "Netherlands": ("The top band used to be orange, and it was changed to red — most likely because orange dye faded at sea.",
                    "La bande supérieure était orange ; elle est devenue rouge, très probablement parce que la teinture orange passait en mer."),
    "Belgium": ("Its proportions are unusually tall and narrow, and it is the only national flag whose stripes run this way with these colours.",
                "Ses proportions sont inhabituellement hautes et étroites, et c'est le seul drapeau national à disposer ainsi ces couleurs."),
    "Ukraine": ("The two bands are meant to be read as a picture: sky above, ripe wheat below.",
                "Les deux bandes se lisent comme une image : le ciel au-dessus, le blé mûr en dessous."),
    "Albania": ("The two-headed eagle comes from a 15th-century leader's seal, and the country's own name for itself means 'land of the eagles'.",
                "L'aigle bicéphale vient du sceau d'un chef du XVe siècle, et le nom que le pays se donne signifie « pays des aigles »."),
    "Turkey": ("The crescent and star were on Ottoman flags long before, and the design was fixed by law in 1936.",
               "Le croissant et l'étoile figuraient déjà sur les drapeaux ottomans ; le dessin a été fixé par la loi en 1936."),
    "Israel": ("The design is taken from a prayer shawl, with the star placed between its two stripes.",
               "Le dessin reprend un châle de prière, l'étoile placée entre ses deux bandes."),
    "Saudi Arabia": ("Because the script is sacred, the flag is never flown at half-mast and is printed on both sides so it reads correctly either way.",
                     "L'inscription étant sacrée, ce drapeau n'est jamais mis en berne et il est imprimé des deux côtés pour se lire correctement."),
    "Iran": ("The thin decorative borders are not decoration: the same phrase is repeated 22 times, for a date in the revolution.",
             "Les fines bordures ne sont pas décoratives : la même phrase y est répétée 22 fois, pour une date de la révolution."),
    "Lebanon": ("The tree in the centre is a species named after the country, and it is mentioned repeatedly in the Bible.",
                "L'arbre du centre est une espèce qui porte le nom du pays, et il est cité à de nombreuses reprises dans la Bible."),
    "Jordan": ("The star's seven points stand for the seven verses of the opening chapter of the Quran.",
               "Les sept branches de l'étoile représentent les sept versets de la première sourate du Coran."),
    "Qatar": ("Its colour started as plain red dye that turned purple-brown in the sun — and the country kept the accident.",
              "Sa couleur vient d'une teinture rouge devenue brun-violet au soleil, et le pays a gardé cet accident."),
    "United Arab Emirates": ("Its four colours appear in a 13th-century Arabic poem about the ideal qualities of a people.",
                             "Ses quatre couleurs figurent dans un poème arabe du XIIIe siècle sur les qualités idéales d'un peuple."),
    "Australia": ("The design was chosen in 1901 from a competition with over 32,000 entries; five people were judged to have won it jointly.",
                  "Le dessin a été choisi en 1901 lors d'un concours de plus de 32 000 propositions ; cinq personnes ont été déclarées gagnantes ensemble."),
    "New Zealand": ("A 2016 referendum asked whether to replace it. The country voted to keep it.",
                    "Un référendum de 2016 a proposé de le remplacer. Le pays a voté pour le garder."),
    "Fiji": ("A plan to remove the other country's flag from the corner was announced in 2015 and then quietly dropped.",
             "Un projet de retirer le drapeau étranger du coin a été annoncé en 2015, puis discrètement abandonné."),
    "Papua New Guinea": ("It was designed by a teenager, whose entry won a national competition in 1971.",
                         "Il a été dessiné par une adolescente, dont la proposition a remporté un concours national en 1971."),
}


def summary(api, title, sentences=2):
    """The opening of an article, as plain text. Used for the payoff fact."""
    d = get(api, {"action": "query", "titles": title, "prop": "extracts",
                  "exintro": "1", "explaintext": "1", "exsentences": str(sentences),
                  "format": "json", "formatversion": "2"})
    if not d:
        return ""
    pages = d.get("query", {}).get("pages", [])
    if not pages or pages[0].get("missing"):
        return ""
    txt = (pages[0].get("extract") or "").strip().replace("\n", " ")
    return re.sub(r"\s+", " ", txt)


def main():
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    rows = COUNTRIES[:limit] if limit else COUNTRIES
    print("Building flag questions for %d countries" % len(rows))

    resolved = []
    for i, (name, article, flagfile, region) in enumerate(rows, 1):
        print("[%3d/%d] %s" % (i, len(rows), name))
        img = flag_image(flagfile)
        if not img:
            print("   ! no image for %s — SKIPPED" % flagfile)
            continue
        art = flag_article_exists(article)
        if not art:
            print("   ! no 'Flag of %s' article — SKIPPED" % article)
            continue
        fr = fr_title(article) or name
        if name not in FLAG_ALT or name not in FLAG_ALT_FR or name not in FLAG_FACT:
            print("   ! no hand-written alt text or fact for %s — SKIPPED" % name)
            continue
        fact, fact_fr = FLAG_FACT[name]
        resolved.append({"name": name, "fr": fr, "region": region, "img": img,
                         "src_slug": art, "fact": fact, "fact_fr": fact_fr,
                         "alt": FLAG_ALT[name], "alt_fr": FLAG_ALT_FR[name]})
        time.sleep(0.12)

    print("\nresolved %d of %d" % (len(resolved), len(rows)))

    by_region = {}
    for r in resolved:
        by_region.setdefault(r["region"], []).append(r)

    rnd = random.Random(20260809)   # deterministic: same build, same distractors
    out = []
    for r in resolved:
        peers = [x for x in by_region[r["region"]] if x["name"] != r["name"]]
        if len(peers) < 3:
            peers = [x for x in resolved if x["name"] != r["name"]]
        wrong = rnd.sample(peers, 3)
        opts = [r] + wrong
        rnd.shuffle(opts)
        answer = opts.index(r)
        out.append({
            "cat": "Geography",
            "sub": "Countries & Flags",
            "diff": 1 if r["region"] in ("Europe", "Americas") else 2,
            "kids": True,
            "q": "Which country's flag is this?",
            "options": [o["name"] for o in opts],
            "answer": answer,
            "fact": r["fact"],
            "src": "https://en.wikipedia.org/wiki/" + r["src_slug"],
            "img": dict(r["img"], alt=r["alt"], alt_fr=r["alt_fr"]),
            "q_fr": "De quel pays est ce drapeau ?",
            "options_fr": [o["fr"] for o in opts],
            "fact_fr": r["fact_fr"],
        })

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("wrote %d questions -> %s" % (len(out), os.path.relpath(OUT, ROOT)))
    thin = [q["options"][q["answer"]] for q in out if len(q["fact"]) < 40]
    nofr = [q["options"][q["answer"]] for q in out if len(q["fact_fr"]) < 40]
    if thin:
        print("\n! %d with a thin English fact — write these by hand: %s" % (len(thin), ", ".join(thin)))
    if nofr:
        print("! %d with a thin French fact: %s" % (len(nofr), ", ".join(nofr)))


if __name__ == "__main__":
    main()
