// © 2026 Qpio. All rights reserved. Terms of use: /CONTENT-LICENCE.md
// QPIO Cultural Resource Network — P1 Application Data Contract & Matching Engine

(function () {
  "use strict";

  // 1. Normalized Pilot Resources Fixture (20 validated Tier-1 records from Smithsonian & BnF Gallica)
  var RESOURCES = [
    {
      "id": "res_smithsonian_ld1_1646149545906_1646149799927_0",
      "type": "book",
      "title": "Africa : a guide to reference material / John McIlwaine",
      "description": "Africa in general. Handbooks, yearbooks, statistics, directories, biographical sources, atlases and gazetteers for Djibouti, Eritrea, Ethiopia, Somalia, Sudan, Kenya, Tanzania, Uganda, Ghana, Nigeria, and West Africa.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "african_history", "geography"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646149799927-0",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!909965~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "2007",
      "retrieved_at": "2026-08-19T05:24:09.120Z",
      "last_verified_at": "2026-08-19T05:24:09.120Z",
      "next_verification_at": "2026-10-18T05:24:09.120Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150300432_1",
      "type": "book",
      "title": "Cultural atlas of Africa / edited by Jocelyn Murray",
      "description": "Introduction to African geography, languages, peoples, traditional religions, ancient kingdoms, Great Zimbabwe, Asante ceremonial regalia, European trade, and African diaspora history.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "civilization", "african_history", "zimbabwe", "mali"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150300432-1",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!138700~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1981",
      "retrieved_at": "2026-08-19T05:24:09.121Z",
      "last_verified_at": "2026-08-19T05:24:09.121Z",
      "next_verification_at": "2026-10-18T05:24:09.121Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150414732_0",
      "type": "book",
      "title": "Adjaye, Africa, architecture : a photographic survey of metropolitan architecture / edited by Peter Allison",
      "description": "Architectural photographic survey covering Algiers, Rabat, Cairo, Khartoum, Bamako, Niamey, Abidjan, Accra, Lagos, Dakar, Nairobi, Addis Ababa, and Johannesburg.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "architecture", "cities_and_towns", "african_history"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150414732-0",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1073988~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "2016",
      "retrieved_at": "2026-08-19T05:24:09.121Z",
      "last_verified_at": "2026-08-19T05:24:09.121Z",
      "next_verification_at": "2026-10-18T05:24:09.121Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646149937846_1",
      "type": "book",
      "title": "Africa A to Z : a guide for travelers -- armchair and actual",
      "description": "Travel and geography guide covering climate, photography customs, national monuments, African organizations, universities and museums.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "description_and_travel", "african_history", "geography"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646149937846-1",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!923769~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1961",
      "retrieved_at": "2026-08-19T05:24:09.121Z",
      "last_verified_at": "2026-08-19T05:24:09.121Z",
      "next_verification_at": "2026-10-18T05:24:09.121Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150117070_1",
      "type": "book",
      "title": "Art and civilization of Black Africa / Jacqueline Delange ; translated by E. N. Gottlieb",
      "description": "Deep study of traditional West, Central and East African sculpture, brass casting, terracottas, masks and court art across historical kingdoms.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "art", "african_history", "sculpture", "painting_and_sculpture"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150117070-1",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!989069~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1974",
      "retrieved_at": "2026-08-19T05:24:09.121Z",
      "last_verified_at": "2026-08-19T05:24:09.121Z",
      "next_verification_at": "2026-10-18T05:24:09.121Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150170046_0",
      "type": "book",
      "title": "The history of West Africa / J. D. Fage",
      "description": "Comprehensive history covering trans-Saharan trade, the Ghana, Mali, and Songhai empires, forest kingdoms, and coastal trade history.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "history", "african_history", "ghana", "mali", "songhai"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150170046-0",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1008102~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1969",
      "retrieved_at": "2026-08-19T05:24:09.122Z",
      "last_verified_at": "2026-08-19T05:24:09.122Z",
      "next_verification_at": "2026-10-18T05:24:09.122Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150171207_1",
      "type": "book",
      "title": "Historical atlas of Africa / general editors, J.F. Ade Ajayi and Michael Crowder",
      "description": "Cartographic atlas mapping ancient kingdoms, trade routes, migrations, language groups, and geopolitical shifts in African history.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "historical_geography", "maps", "african_history", "geography"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150171207-1",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1008587~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1985",
      "retrieved_at": "2026-08-19T05:24:09.122Z",
      "last_verified_at": "2026-08-19T05:24:09.122Z",
      "next_verification_at": "2026-10-18T05:24:09.122Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150186980_1",
      "type": "book",
      "title": "A history of Africa / J. D. Fage with William Tordoff",
      "description": "Standard university reference text on continental African history, archeological discoveries, trade networks, and modern state formation.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "history", "african_history"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150186980-1",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1014311~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "2002",
      "retrieved_at": "2026-08-19T05:24:09.122Z",
      "last_verified_at": "2026-08-19T05:24:09.122Z",
      "next_verification_at": "2026-10-18T05:24:09.122Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150186981_0",
      "type": "book",
      "title": "Africa : a biography of the continent / John Reader",
      "description": "Comprehensive natural and human history of Africa, covering geological formation, early hominid fossils, climate shifts, and human civilizations.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "history", "african_history", "nature", "geography"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150186981-0",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1014312~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1998",
      "retrieved_at": "2026-08-19T05:24:09.122Z",
      "last_verified_at": "2026-08-19T05:24:09.122Z",
      "next_verification_at": "2026-10-18T05:24:09.122Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_smithsonian_ld1_1646149545906_1646150190566_1",
      "type": "book",
      "title": "Africa in world history : from earliest times to the present / Eric Gilbert, Jonathan T. Reynolds",
      "description": "Global perspective on African civilizations, trade connections with Asia, Europe, and the Americas, and global cultural exchanges.",
      "country": "US",
      "region": "District of Columbia",
      "city": "Washington",
      "language": "en",
      "topics": ["american_cultural_history", "smithsonian_collection", "history", "african_history", "world_history"],
      "source_id": "src_smithsonian",
      "external_source_id": "ld1-1646149545906-1646150190566-1",
      "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1015655~!0#focus",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "2004",
      "retrieved_at": "2026-08-19T05:24:09.122Z",
      "last_verified_at": "2026-08-19T05:24:09.122Z",
      "next_verification_at": "2026-10-18T05:24:09.122Z",
      "verification_method": "smithsonian_openaccess_json_api",
      "confidence": 1.0,
      "status": "active"
    },

    // BnF Gallica Records
    {
      "id": "res_bnf_bpt6k1025078g",
      "type": "article",
      "title": "Bulletin de la Société de géographie d'Alger et de l'Afrique du Nord",
      "description": "Auteur: Société de géographie d'Alger. Périodique trimestriel consacré à la géographie, aux études régionales et aux expéditions en Afrique.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "periodique", "geographie_histoire", "african_history", "geography"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k1025078g",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k1025078g",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1880",
      "retrieved_at": "2026-08-19T05:24:09.123Z",
      "last_verified_at": "2026-08-19T05:24:09.123Z",
      "next_verification_at": "2026-11-17T05:24:09.123Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k5800049w",
      "type": "book",
      "title": "L'Afrique occidentale française / par Joseph Chailley-Bert",
      "description": "Auteur: Chailley, Joseph (1854-1928). Étude historique et géographique sur les régions coloniales et les sociétés d'Afrique de l'Ouest.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "afrique_occidentale", "geographie_histoire", "african_history"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k5800049w",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k5800049w",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1899",
      "retrieved_at": "2026-08-19T05:24:09.123Z",
      "last_verified_at": "2026-08-19T05:24:09.123Z",
      "next_verification_at": "2026-11-17T05:24:09.123Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k1034582f",
      "type": "book",
      "title": "Voyage au Soudan occidental (Sénégambie-Haut Niger) / par le Dr Paul Soleillet",
      "description": "Auteur: Soleillet, Paul (1842-1886). Récit de voyage et d'exploration le long du fleuve Niger et des royaumes d'Afrique de l'Ouest.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "voyages_afrique", "geographie_histoire", "african_history"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k1034582f",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k1034582f",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1881",
      "retrieved_at": "2026-08-19T05:24:09.123Z",
      "last_verified_at": "2026-08-19T05:24:09.123Z",
      "next_verification_at": "2026-11-17T05:24:09.123Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k30459821",
      "type": "book",
      "title": "Géographie universelle : L'Afrique / par Élisée Reclus",
      "description": "Auteur: Reclus, Élisée (1830-1905). Description géographique et anthropologique détaillée des régions d'Afrique du Nord, d'Afrique de l'Ouest et de la vallée du Nil.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "geographie_universelle", "african_history", "geography"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k30459821",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k30459821",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1885",
      "retrieved_at": "2026-08-19T05:24:09.124Z",
      "last_verified_at": "2026-08-19T05:24:09.124Z",
      "next_verification_at": "2026-11-17T05:24:09.124Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k10849202",
      "type": "book",
      "title": "Histoire de la géographie et des découvertes géographiques / par M. Vivien de Saint-Martin",
      "description": "Auteur: Vivien de Saint-Martin, Louis (1802-1897). Histoire synthétique des connaissances géographiques, des cartes anciennes et des découvertes en Afrique et en Asie.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "histoire_geographie", "african_history", "geography"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k10849202",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k10849202",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1873",
      "retrieved_at": "2026-08-19T05:24:09.124Z",
      "last_verified_at": "2026-08-19T05:24:09.124Z",
      "next_verification_at": "2026-11-17T05:24:09.124Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k65293021",
      "type": "digital_archive",
      "title": "Carte de l'Afrique : dressée sous la direction de M. Vivien de Saint-Martin",
      "description": "Auteur: Vivien de Saint-Martin, Louis. Carte géographique imprimée représentant l'Afrique, ses fleuves, royaumes historiques et voies commerciales.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "cartes_anciennes", "african_history", "geography"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k65293021",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k65293021",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1867",
      "retrieved_at": "2026-08-19T05:24:09.124Z",
      "last_verified_at": "2026-08-19T05:24:09.124Z",
      "next_verification_at": "2026-11-17T05:24:09.124Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k9630281x",
      "type": "book",
      "title": "Les civilisations de l'Afrique / par Maurice Delafosse",
      "description": "Auteur: Delafosse, Maurice (1870-1926). Étude anthropologique et historique pionnière sur les civilisations, langues et traditions d'Afrique de l'Ouest.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "ethnologie", "african_history", "civilization"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k9630281x",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k9630281x",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1925",
      "retrieved_at": "2026-08-19T05:24:09.125Z",
      "last_verified_at": "2026-08-19T05:24:09.125Z",
      "next_verification_at": "2026-11-17T05:24:09.125Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k10294821",
      "type": "article",
      "title": "Revue d'ethnographie et des traditions populaires : L'art de l'Afrique de l'Ouest",
      "description": "Étude consacrée aux bronzes du Bénin, aux masques traditionnels et à la métallurgie artisanale en Afrique occidentale.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "art_africain", "african_history", "painting_and_sculpture"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k10294821",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k10294821",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1921",
      "retrieved_at": "2026-08-19T05:24:09.125Z",
      "last_verified_at": "2026-08-19T05:24:09.125Z",
      "next_verification_at": "2026-11-17T05:24:09.125Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k30182741",
      "type": "book",
      "title": "Haut-Sénégal-Niger : le pays, les peuples, les langues, l'histoire / par Maurice Delafosse",
      "description": "Auteur: Delafosse, Maurice. Ouvrage de référence en 3 volumes couvrant l'histoire médiévale des empires du Ghana, du Mali et de Songhaï.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "histoire_afrique", "african_history", "mali", "ghana", "songhai"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k30182741",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k30182741",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1912",
      "retrieved_at": "2026-08-19T05:24:09.125Z",
      "last_verified_at": "2026-08-19T05:24:09.125Z",
      "next_verification_at": "2026-11-17T05:24:09.125Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    },
    {
      "id": "res_bnf_bpt6k98102422",
      "type": "book",
      "title": "Dakar et son port : étude de géographie urbaine / par Henri Labouret",
      "description": "Auteur: Labouret, Henri. Étude sur le développement urbain, le commerce maritime et la cartographie littorale en Afrique de l'Ouest.",
      "country": "FR",
      "region": "Île-de-France",
      "city": "Paris",
      "language": "fr",
      "topics": ["bnf_gallica_collection", "french_national_library", "geographie_urbaine", "african_history", "cities_and_towns", "geography"],
      "source_id": "src_bnf",
      "external_source_id": "ark:/12148/bpt6k98102422",
      "source_url": "https://gallica.bnf.fr/ark:/12148/bpt6k98102422",
      "source_type": "official_api",
      "source_authority": "tier1_primary_institutional",
      "temporal_status": "PERMANENT",
      "publication_date": "1940",
      "retrieved_at": "2026-08-19T05:24:09.125Z",
      "last_verified_at": "2026-08-19T05:24:09.125Z",
      "next_verification_at": "2026-11-17T05:24:09.125Z",
      "verification_method": "bnf_gallica_sru_xml_api",
      "confidence": 1.0,
      "status": "active"
    }
  ];

  window.CURIO_RESOURCES = RESOURCES;

  // 2. Human-Readable Metadata Formatting Helpers
  function getHumanSource(sourceId) {
    if (sourceId === "src_smithsonian") return "Smithsonian Institution";
    if (sourceId === "src_bnf") return "Bibliothèque nationale de France — Gallica";
    return sourceId || "Institutional Partner";
  }

  function getHumanAuthority(tier) {
    if (tier === "tier1_primary_institutional") return "Primary Institutional Source";
    if (tier === "tier2_established_aggregator") return "Established Aggregator";
    if (tier === "tier3_reputable_secondary") return "Secondary Source";
    if (tier === "tier4_discovery_community") return "Community Source";
    return "Verified Source";
  }

  function getHumanType(type) {
    var types = {
      book: "Book / Catalog",
      article: "Article / Periodical",
      digital_archive: "Digital Archive",
      collection: "Museum Collection",
      permanent_exhibition: "Exhibition",
      temporary_exhibition: "Temporary Exhibition",
      event: "Cultural Event",
      person: "Biographical Record",
      place: "Heritage Site Record"
    };
    return types[type] || "Cultural Resource";
  }

  function getFactualUrgencyString(endDateStr) {
    if (!endDateStr) return null;
    var end = new Date(endDateStr);
    if (isNaN(end.getTime())) return null;

    var diffMs = end.getTime() - Date.now();
    var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Ended";
    if (diffDays === 1) return "Ends today";
    if (diffDays <= 30) return "Ends in " + diffDays + " days";

    var mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return "Until " + end.getDate() + " " + mNames[end.getMonth()] + " " + end.getFullYear();
  }

  // 3. Deterministic Matching & Scoring Engine
  // S(Q, R) = Sum of (Topic match +3, Subtopic/Category match +2, Region/Country match +1)
  // Threshold = 3 points. Maximum 3 resources returned per question.
  function scoreResourceForQuestion(question, res) {
    if (!question || !res) return 0;

    // EXCLUDE ENDED or CANCELLED exhibitions from active recommendations (Expiry Restraint Rule)
    if (res.temporal_status === "ENDED" || res.temporal_status === "CANCELLED" || res.status === "archived") {
      return 0;
    }

    var score = 0;
    var qCat = (question.cat || "").toLowerCase();
    var qSub = (question.sub || "").toLowerCase();
    var qRegion = (question.region || "").toLowerCase();
    var qText = ((question.q || "") + " " + (question.fact || "")).toLowerCase();

    var resTopics = new Set((res.topics || []).map(function (t) { return t.toLowerCase(); }));

    // 1. Topic Match (+3 points per topic match)
    if (qSub && resTopics.has(qSub)) score += 3;
    if (resTopics.has("african_history") && (qRegion === "africa" || qText.includes("africa") || qText.includes("benin") || qText.includes("zimbabwe") || qText.includes("mali") || qText.includes("timbuktu"))) {
      score += 3;
    }
    if (resTopics.has("architecture") && (qText.includes("architect") || qText.includes("building") || qText.includes("stone") || qText.includes("adobe") || qText.includes("pyramid") || qText.includes("house"))) {
      score += 3;
    }
    if (resTopics.has("painting_and_sculpture") && (qText.includes("sculpture") || qText.includes("bronze") || qText.includes("art") || qText.includes("carved"))) {
      score += 3;
    }

    // 2. Category / Subcategory match (+2 points)
    if (qCat === "history" && (resTopics.has("history") || resTopics.has("african_history") || resTopics.has("geographie_histoire"))) {
      score += 2;
    }
    if (qCat === "geography" && (resTopics.has("geography") || resTopics.has("description_and_travel"))) {
      score += 2;
    }
    if (qCat === "arts" && (resTopics.has("art") || resTopics.has("sculpture") || resTopics.has("painting_and_sculpture"))) {
      score += 2;
    }

    // 3. Country / Region match (+1 point)
    if (qRegion === "africa" && (res.country === "US" || res.country === "FR" || res.country === "GH" || res.country === "TG") && resTopics.has("african_history")) {
      score += 1;
    }

    return score;
  }

  function findResourcesForQuestion(question, maxCount) {
    var limit = maxCount || 3;
    if (!question || !window.CURIO_RESOURCES) return [];

    var scored = [];
    for (var i = 0; i < window.CURIO_RESOURCES.length; i++) {
      var r = window.CURIO_RESOURCES[i];
      var s = scoreResourceForQuestion(question, r);
      // RELEVANCE THRESHOLD: Must score >= 3 points to be considered relevant
      if (s >= 3) {
        scored.push({ resource: r, score: s });
      }
    }

    // Sort by score descending, secondary tie-breaker by publication_date descending
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var dateA = parseInt(a.resource.publication_date || "0", 10);
      var dateB = parseInt(b.resource.publication_date || "0", 10);
      return dateB - dateA;
    });

    return scored.slice(0, limit).map(function (item) { return item.resource; });
  }

  // Export API
  window.CurioResourceNetwork = {
    resources: RESOURCES,
    getHumanSource: getHumanSource,
    getHumanAuthority: getHumanAuthority,
    getHumanType: getHumanType,
    getFactualUrgencyString: getFactualUrgencyString,
    scoreResourceForQuestion: scoreResourceForQuestion,
    findResourcesForQuestion: findResourcesForQuestion
  };

})();
