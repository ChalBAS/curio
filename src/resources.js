// © 2026 Qpio. All rights reserved. Terms of use: /CONTENT-LICENCE.md
// QPIO Cultural Resource Network — P1 Application Data Contract & Matching Engine

(function () {
  "use strict";

  // 1. Normalized Resources Fixture (Merged exhibitions & ingested records)
  var RESOURCES = [
  {
    "id": "res_exh_grandpalais_cezanne_2026",
    "type": "temporary_exhibition",
    "title": "Cézanne and the Modern Masters",
    "description": "Retrospective exhibition showcasing Cézanne's impressionist landscapes and influence on 20th century painting.",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "painting_and_sculpture",
      "impressionism",
      "french_art_history"
    ],
    "source_id": "src_grandpalais",
    "external_source_id": "gp_exh_cezanne_2026",
    "source_url": "https://www.grandpalaisrmn.fr/expositions/cezanne-2026",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "start_date": "2026-10-15",
    "end_date": "2027-02-15",
    "temporal_status": "UPCOMING"
  },
  {
    "id": "res_exh_smithsonian_bronzes_2026",
    "type": "temporary_exhibition",
    "title": "West African Bronze Heritage & Royal Court Art",
    "description": "Special exhibition presenting brass, bronze, and terracotta court art from the historic West African kingdoms.",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "african_history",
      "painting_and_sculpture",
      "benin_bronzes",
      "sculpture"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "si_exh_bronze_2026",
    "source_url": "https://nmaahc.si.edu/exhibitions/west-african-bronze-heritage",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "start_date": "2026-06-01",
    "end_date": "2026-11-30",
    "temporal_status": "ACTIVE"
  },
  {
    "id": "res_exh_bnf_maps_2026",
    "type": "temporary_exhibition",
    "title": "Cartographie de l'Afrique : Cartes rares du XVIe au XIXe siècle",
    "description": "Exposition temporaire présentant les plus anciennes cartes manuscrites et gravées de l'Afrique conservées à la BnF.",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "african_history",
      "geography",
      "cartes_anciennes",
      "french_national_library"
    ],
    "source_id": "src_bnf",
    "external_source_id": "bnf_exh_maps_2026",
    "source_url": "https://gallica.bnf.fr/expositions/cartes-afrique-2026",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "start_date": "2026-07-01",
    "end_date": "2026-08-31",
    "temporal_status": "ACTIVE"
  },
  {
    "id": "res_exh_grandpalais_nubia_2025",
    "type": "temporary_exhibition",
    "title": "Sudan & The Kings of Kush: Pyramids of Nubia",
    "description": "Historical exhibition dedicated to the 200 ancient Nubian pyramids and royal tombs of the Kingdom of Kush.",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "african_history",
      "ancient_history",
      "nubian_pyramids",
      "sudan"
    ],
    "source_id": "src_grandpalais",
    "external_source_id": "gp_exh_nubia_2025",
    "source_url": "https://www.grandpalaisrmn.fr/expositions/royaume-de-kouch-2025",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "start_date": "2025-09-01",
    "end_date": "2026-01-15",
    "temporal_status": "ENDED"
  },
  {
    "id": "res_exh_smithsonian_timbuktu_2026",
    "type": "temporary_exhibition",
    "title": "Manuscripts of Timbuktu: Treasures of African Scholarship",
    "description": "Exhibition of ancient Arabic and West African manuscripts on astronomy, mathematics, medicine, and law.",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "african_history",
      "timbuktu",
      "manuscripts",
      "education"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "si_exh_timbuktu_2026",
    "source_url": "https://africa.si.edu/exhibitions/timbuktu-manuscripts",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "start_date": "2026-11-01",
    "end_date": "2027-03-31",
    "status_override": "POSTPONED",
    "temporal_status": "POSTPONED"
  },
  {
    "id": "res_exh_grandpalais_salon_2026",
    "type": "temporary_exhibition",
    "title": "Salon International de la Sculpture Contemporaine",
    "description": "Foire et exposition temporaire de sculpture contemporaine au Grand Palais.",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "sculpture",
      "painting_and_sculpture",
      "modern_art"
    ],
    "source_id": "src_grandpalais",
    "external_source_id": "gp_exh_salon_2026",
    "source_url": "https://www.grandpalaisrmn.fr/expositions/salon-sculpture-2026",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "start_date": "2026-08-01",
    "end_date": "2026-08-15",
    "status_override": "CANCELLED",
    "temporal_status": "CANCELLED"
  },
  {
    "id": "res_exh_bnf_textiles_2026",
    "type": "temporary_exhibition",
    "title": "Textiles et Tissages Traditionnels d'Afrique de l'Ouest",
    "description": "Présentation des collections de textiles rares et motifs de tissage de la sous-région ouest-africaine.",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "african_history",
      "craft_and_architecture",
      "textiles"
    ],
    "source_id": "src_bnf",
    "external_source_id": "bnf_exh_textiles_2026",
    "source_url": "https://gallica.bnf.fr/expositions/textiles-afrique-2026",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "UNKNOWN"
  },
  {
    "id": "res_exh_louvre_permanent_africa",
    "type": "collection",
    "title": "Collections des Arts d'Afrique, d'Asie, d'Océanie et d'Amériques",
    "description": "Galerie permanente présentant la statuaire, les bronzes et les arts rituels d'Afrique subsaharienne au Pavillon de Sessions.",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "african_history",
      "painting_and_sculpture",
      "louvre_collection"
    ],
    "source_id": "src_grandpalais",
    "external_source_id": "louvre_perm_africa",
    "source_url": "https://www.louvre.fr/decouvrir/les-salles/pavillon-des-sessions",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "status_override": "PERMANENT",
    "temporal_status": "PERMANENT"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646149799927_0",
    "type": "book",
    "title": "Africa : a guide to reference material / John McIlwaine",
    "description": "Previous ed.: 1993. Africa in general. Handbooks ; Yearbooks ; Statistics ; Directories of organizations ; Biographical sources ; Atlases & gazetteers ; Earth & biological sciences -- North-east Africa. Djibouti ; Eritrea ; Ethiopia ; Somalia ; Sudan -- East Africa. Kenya ; Tanzania ; Uganda -- Central Africa. Anglophone Central Africa ; Malawi ; Zambia ; Zimbabwe ; Francophone Central Africa ; Former French Equatorial Africa ; Central African Republic Chad ; Congo (Brazzaville) ; Gabon ; For...",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "african_history"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646149799927-0",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!909965~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2007",
    "retrieved_at": "2026-08-19T10:15:52.811Z",
    "last_verified_at": "2026-08-19T10:15:52.811Z",
    "next_verification_at": "2026-10-18T10:15:52.811Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.811Z",
    "updated_at": "2026-08-19T10:15:52.811Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646150300432_1",
    "type": "book",
    "title": "Cultural atlas of Africa / edited by Jocelyn Murray",
    "description": "Includes index. Introduction -- Part One: The physical background -- The geography of Africa -- Part Two: The cultural background -- Languages and peoples -- Religions -- Yoruba traditional religion -- The Ehtiopian Church -- Early man in Africa -- Kingdoms and empires -- Great Zimbabwe -- Asante ceremonial regalia -- Europe in Africa -- The source of the Nile debate -- The mapping of Africa -- Communication by rail -- The African diaspora -- The growth of cities -- Vernacular architecture --...",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "civilization",
      "african_history"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646150300432-1",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!138700~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1981",
    "retrieved_at": "2026-08-19T10:15:52.811Z",
    "last_verified_at": "2026-08-19T10:15:52.811Z",
    "next_verification_at": "2026-10-18T10:15:52.811Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.811Z",
    "updated_at": "2026-08-19T10:15:52.811Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646150414732_0",
    "type": "book",
    "title": "Adjaye, Africa, architecture : a photographic survey of metropolitan architecture / edited by Peter Allison",
    "description": "Originally published in 7 volumes in larger format as: African metropolitan architecture. 2011. The Maghreb. Algiers/Algeria ; Rabat/Morocco ; Tripoli/Libya ; Tunis/Tunisia -- Desert. Cairo/Egypt ; Djibouti/Djibouti ; Khartoum/Sudan ; Nouakchott/Mauritania -- The Sahel. Bamako/Mali ; N'djamena/Chad ; Niamey/Niger ; Ouagadougou/Burkina Faso -- Forest. Abidjan/Côte d'Ivoire ; Accra/Ghana ; Bangui/Central African Republic ; Banjul/the Gambia ; Bissau/Guinea-Bissau ; Brazzaville/Republic of Cong...",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "architecture",
      "cities_and_towns",
      "african_history"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646150414732-0",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1073988~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2016",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646149937846_1",
    "type": "book",
    "title": "Africa A to Z a guide for travelers--armchair and actual Maps by Louise E. Jefferson ; photos. by the author. Foreword by John W. Houser",
    "description": "AFRICA: THE BACKGROUND -- Africa and africans -- Geography: capsulized -- A soupcom of history -- what is pan-Africanism? -- America and Africa -- AFRICA: TOURISM TERRITORY -- Tourism -- a growing industry -- boning up on Africa (American organisations, universities, and museums with special interest in Africa) -- visas and other documents -- inoculation and health -- climate -- what to pack -- photography customs -- your Africa hosts -- shopping -- and bargaining -- currency -- tipping -- ma...",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "africa",
      "guidebooks_form",
      "tourism",
      "travel",
      "description_and_travel",
      "descriptions_et_voyages"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646149937846-1",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!19652~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1961",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646149588961_0",
    "type": "book",
    "title": "Poems from Black Africa : Ethiopia, South Rhodesia, Sierra Leone, Madagascar, Ivory Coast, Nigeria, Kenya, Gabon, Senegal, Nyasaland, Mozambique, South Africa, Congo, Ghana, Liberia / Edited by Langston Hughes",
    "description": "158 p. : ill. ; 21 cm",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "african_poetry_translations_into_english",
      "english_poetry_translations_from_african_literature",
      "african_history"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646149588961-0",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!213400~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1966",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646150218328_1",
    "type": "book",
    "title": "Eastern Africa / Edwin S. Munger",
    "description": "Illustrations, color plates (figures 1-12, following page 64), map. AFAINDEX5 Uganda, the Kabaka then & now -- Kenya, Luo -- Kenya, animals -- Tanzania, Maasai -- Tanzania, a set as yet unrealized -- Malawi, wood -- Malawi, ebony & bone -- Malawi, serpentine -- Malawi, ebony & wood -- Madagascar, Merina vs. Sakalava -- Madagascar, Merina -- Mozambique, Makonde -- Mozambique, yellowwood & ebony -- The Comoros, Rodriguez & Cocos : ones that got away",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "chess_sets",
      "african_history"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646150218328-1",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1090025~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1996",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646149777809_0",
    "type": "book",
    "title": "Central Africa / Edwin S. Munger",
    "description": "Illustrations, color plates (figures 25-36, following page 64), map. AFAINDEX5 Zaire -- Congo, wood, burlap & chicken feathers -- Congo, ebony & ivory -- Angola -- Zambia, Chokwe -- Zimbabwe, Shona, gray & white soapstone -- Zimbabwe, green & yellow-brown soapstone -- Zimbabwe, ebony & ivory -- Zimbabwe, green & gray soapstone -- Botswana, !Kung -- Namibia, San -- Namibia, Himba & Herero -- Sao Tome : another one that got away",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "chess_sets",
      "african_history"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646149777809-0",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1090027~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1996",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_smithsonian_ld1_1681721589243_1681721589342_0",
    "type": "book",
    "title": "African kings Daniel Lainé ; [introduction, Pierre Alexander]",
    "description": "AFA copy 39088019023902 gift from Janet Stanley. Origins of the African kingdoms / Pierre Alexandre -- Nigeria: Igwe Kenneth Nnaji Onyemaeke Orizu III -- Nigeria: El Hadj Mamadou Kabir Usman -- Nigeria: Oba Olanes Owosofo -- Nigeria: Oba Joseph Adekola Ogunoye -- Nigeria: Nnani Ishiodu I Ogbuagu -- Nigeria: Aliyu Mustapha -- Nigeria: Al Hadj Nimar El Kanemi -- Nigeria: El Hadj Shehu Idris -- Nigeria: Edidem Otu Ekpe Nyong -- Nigeria: Abubakar Sidiq -- Nigeria: The Prince of Katsina -- Nigeria...",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "clans",
      "kings_and_rulers",
      "black_people",
      "portrait_photography",
      "photography_artistic",
      "rites_and_ceremonies"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1681721589243-1681721589342-0",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!1145821~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2000",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646150601899_0",
    "type": "book",
    "title": "Africa and the islands by R. J. Harrison Church [and others",
    "description": "Part I: Africa as a whole. Africa in history -- The physical environment -- The people of Africa -- Modes of life. -- Part II: Regional studies. North-West Africa : The Maghreb ; The Sahara ; Libya ; The Nile ; Egypt ; The Sudan ; Ethiopia and the Horn of Africa -- West Africa : The environment and resources ; The dry lands ; The rainy lands of the south-west coast ; The Guinea coast lands -- West Central Africa : General and the islands ; Cameroon, Chad, Central African Republic, Congo (Braz...",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "travel",
      "description_and_travel",
      "history",
      "politics_and_government",
      "descriptions_et_voyages",
      "histoire"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646150601899-0",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!19824~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1967",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_smithsonian_ld1_1646149545906_1646150868965_0",
    "type": "book",
    "title": "Operational navigation chart, ONC. K-2, Benin, Ghana, Ivory Coast, Mali, Niger, Nigeria, Togo, Upper Volta [cartographic material] / prepared and published by the Defense Mapping Agency Aerospace Center",
    "description": "Relief shown by shading, contours, tints, and spot heights. \"Elevations in feet.\" \"Air information current through 14 January 1976.\" \"Compiled July 1965. Revised March 1976.\" \"Lithographed by DMAAC 6-76.\" Includes terrain characteristic tints and interchart relationship diagrams. 1 map : col. ; 91 x 133 cm. on sheet 106 x 146 cm",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "american_cultural_history",
      "smithsonian_collection",
      "aeronautical_charts",
      "art_and_culture"
    ],
    "source_id": "src_smithsonian",
    "external_source_id": "ld1-1646149545906-1646150868965-0",
    "source_url": "https://siris-libraries.si.edu/ipac20/ipac.jsp?&profile=liball&source=~!silibraries&uri=full=3100001~!720047~!0#focus",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1976",
    "retrieved_at": "2026-08-19T10:15:52.812Z",
    "last_verified_at": "2026-08-19T10:15:52.812Z",
    "next_verification_at": "2026-10-18T10:15:52.812Z",
    "verification_method": "smithsonian_openaccess_json_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:52.812Z",
    "updated_at": "2026-08-19T10:15:52.812Z"
  },
  {
    "id": "res_bnf_cb326834156",
    "type": "digital_collection",
    "title": "Africa (Alger)",
    "description": "Auteur: Société de géographie d'Alger (1879). Auteur du texte. Périodicité : Trimestriel Etat de collection : a. 1, fasc. 1-2 (1880) Avec mode texte",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/cb326834156",
    "source_url": "https://gallica.bnf.fr/ark:/12148/cb326834156/date",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1880",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b52505141j",
    "type": "digital_collection",
    "title": "Africa",
    "description": "BnF Gallica digital archive resource: Africa",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b52505141j",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b52505141j",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "16..",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b53064433j",
    "type": "digital_collection",
    "title": "Africa",
    "description": "Auteur: Stanford, Edward (1856-1917 ; fils). Auteur du texte. Échelle(s) : 1:16 473 600",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b53064433j",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b53064433j",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1914",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b8469795d",
    "type": "digital_collection",
    "title": "Africa",
    "description": "BnF Gallica digital archive resource: Africa",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b8469795d",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b8469795d",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1500",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b53088763x",
    "type": "digital_collection",
    "title": "Africa",
    "description": "Auteur: Arrowsmith, Aaron (1750-1833). Auteur du texte. BnF Gallica digital archive resource: Africa",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b53088763x",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b53088763x",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1802",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b84460802",
    "type": "digital_collection",
    "title": "Africa",
    "description": "Auteur: Reimer, Dietrich (1818-1899). Auteur du texte. Échelle(s) : 1:20 000 000",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b84460802",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b84460802",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1890",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b84408339",
    "type": "digital_collection",
    "title": "Africa / by J. Arrowsmith",
    "description": "Auteur: Arrowsmith, John (1790-1873). Auteur du texte. BnF Gallica digital archive resource: Africa / by J. Arrowsmith",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b84408339",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b84408339",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1850",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b8468854h",
    "type": "digital_collection",
    "title": "Africa / Joanne Baptista Nicolosio S. T. D. sic describente",
    "description": "Auteur: Nicolosi, Giovan Battista (1610-1670). Auteur du texte. BnF Gallica digital archive resource: Africa / Joanne Baptista Nicolosio S. T. D. sic describente",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "justice",
      "france",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b8468854h",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b8468854h",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "16..",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b530889108",
    "type": "digital_collection",
    "title": "Africa / Gezeichnet von H. Kiepert",
    "description": "Auteur: Kiepert, Heinrich (1818-1899). Auteur du texte; Geographisches Institut (Weimar, Allemagne). Auteur du texte. BnF Gallica digital archive resource: Africa / Gezeichnet von H. Kiepert",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b530889108",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b530889108",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1849",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_bnf_btv1b53088762g",
    "type": "digital_collection",
    "title": "Africa / Arrowsmith Aaron ; 1750-1833",
    "description": "Auteur: Arrowsmith, Aaron (1750-1833). Auteur du texte. BnF Gallica digital archive resource: Africa / Arrowsmith Aaron ; 1750-1833",
    "country": "FR",
    "region": "Île-de-France",
    "city": "Paris",
    "language": "fr",
    "topics": [
      "bnf_gallica_collection",
      "french_national_library",
      "afrique",
      "african_history"
    ],
    "source_id": "src_bnf",
    "external_source_id": "ark:/12148/btv1b53088762g",
    "source_url": "https://gallica.bnf.fr/ark:/12148/btv1b53088762g",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "1802",
    "retrieved_at": "2026-08-19T10:15:55.088Z",
    "last_verified_at": "2026-08-19T10:15:55.088Z",
    "next_verification_at": "2026-11-17T10:15:55.088Z",
    "verification_method": "bnf_gallica_sru_xml_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:55.088Z",
    "updated_at": "2026-08-19T10:15:55.088Z"
  },
  {
    "id": "res_europeana_2059218_data_sounds_it_dds0000006600000300",
    "type": "digital_collection",
    "title": "Africa Africa",
    "description": "Europeana digitized cultural heritage object.",
    "country": "IT",
    "region": "Internet Culturale",
    "city": "Internet Culturale",
    "language": "it",
    "topics": [
      "europeana_collection",
      "european_culture",
      "musik",
      "popmusik",
      "music",
      "pop_music",
      "musica",
      "musica_pop"
    ],
    "source_id": "src_europeana",
    "external_source_id": "/2059218/data_sounds_IT_DDS0000006600000300",
    "source_url": "http://www.internetculturale.it/opencms/opencms/it/viewItemMag.jsp?id=oai%3A192.168.10.31%3A22%3ARM0200%3AIT-DDS0000006600000300&teca=ICBSA",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "retrieved_at": "2026-08-19T10:15:57.170Z",
    "last_verified_at": "2026-08-19T10:15:57.170Z",
    "next_verification_at": "2026-10-18T10:15:57.170Z",
    "verification_method": "europeana_rest_api_search",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:57.170Z",
    "updated_at": "2026-08-19T10:15:57.170Z"
  },
  {
    "id": "res_europeana_447_geo0003413",
    "type": "digital_collection",
    "title": "Africa...",
    "description": "Europeana digitized cultural heritage object.",
    "country": "IT",
    "region": "Marciana National Library",
    "city": "Marciana National Library",
    "language": "it",
    "topics": [
      "europeana_collection",
      "european_culture",
      "maps",
      "carte_geografiche_mappe"
    ],
    "source_id": "src_europeana",
    "external_source_id": "/447/GEO0003413",
    "source_url": "https://www.internetculturale.it/jmms/iccuviewer/iccu.jsp?id=mag_GEO0003413",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "retrieved_at": "2026-08-19T10:15:57.170Z",
    "last_verified_at": "2026-08-19T10:15:57.170Z",
    "next_verification_at": "2026-10-18T10:15:57.170Z",
    "verification_method": "europeana_rest_api_search",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:57.170Z",
    "updated_at": "2026-08-19T10:15:57.170Z"
  },
  {
    "id": "res_europeana_446_ge38005585",
    "type": "digital_collection",
    "title": "[* Africa]",
    "description": "Europeana digitized cultural heritage object.",
    "country": "IT",
    "region": "University Library of Genova",
    "city": "University Library of Genova",
    "language": "it",
    "topics": [
      "europeana_collection",
      "european_culture",
      "maps",
      "carte_geografiche_mappe"
    ],
    "source_id": "src_europeana",
    "external_source_id": "/446/GE38005585",
    "source_url": "https://www.internetculturale.it/jmms/iccuviewer/iccu.jsp?id=oai%3Awww.internetculturale.sbn.it%2FTeca%3A20%3ANT0000%3AGE38005585",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "retrieved_at": "2026-08-19T10:15:57.170Z",
    "last_verified_at": "2026-08-19T10:15:57.170Z",
    "next_verification_at": "2026-10-18T10:15:57.170Z",
    "verification_method": "europeana_rest_api_search",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:57.170Z",
    "updated_at": "2026-08-19T10:15:57.170Z"
  },
  {
    "id": "res_europeana_446_it_sgi_casta_4100",
    "type": "digital_collection",
    "title": "[Africa].",
    "description": "Europeana digitized cultural heritage object.",
    "country": "IT",
    "region": "Internet Culturale",
    "city": "Internet Culturale",
    "language": "it",
    "topics": [
      "europeana_collection",
      "european_culture",
      "maps",
      "carte_geografiche_mappe"
    ],
    "source_id": "src_europeana",
    "external_source_id": "/446/IT_SGI_CASTA_4100",
    "source_url": "https://www.internetculturale.it/jmms/iccuviewer/iccu.jsp?id=oai%3Awww.internetculturale.sbn.it%2FTeca%3A20%3ANT0000%3AN%3AIT_SGI_CASTA_4100",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "retrieved_at": "2026-08-19T10:15:57.170Z",
    "last_verified_at": "2026-08-19T10:15:57.170Z",
    "next_verification_at": "2026-10-18T10:15:57.170Z",
    "verification_method": "europeana_rest_api_search",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:57.170Z",
    "updated_at": "2026-08-19T10:15:57.170Z"
  },
  {
    "id": "res_europeana_2022362__royal_museums_greenwich__http___collections_rmg_co_uk_collections_objects_541144",
    "type": "digital_collection",
    "title": "Africa",
    "description": "Europeana digitized cultural heritage object.",
    "country": "GB",
    "region": "Royal Museums Greenwich",
    "city": "Royal Museums Greenwich",
    "language": "en",
    "topics": [
      "europeana_collection",
      "european_culture",
      "karte",
      "kartta",
      "mapa",
      "em_lapis",
      "zemljovid",
      "eogr_fisk_karte"
    ],
    "source_id": "src_europeana",
    "external_source_id": "/2022362/_Royal_Museums_Greenwich__http___collections_rmg_co_uk_collections_objects_541144",
    "source_url": "http://collections.rmg.co.uk/mediaLib/410/media-410166/large.jpg",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "retrieved_at": "2026-08-19T10:15:57.170Z",
    "last_verified_at": "2026-08-19T10:15:57.170Z",
    "next_verification_at": "2026-10-18T10:15:57.170Z",
    "verification_method": "europeana_rest_api_search",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:15:57.170Z",
    "updated_at": "2026-08-19T10:15:57.170Z"
  },
  {
    "id": "res_openlib_works_ol2747608w",
    "type": "book",
    "title": "Africa: history of a continent",
    "description": "Authoritative bibliography record for: Africa: history of a continent by Basil Davidson.",
    "country": "GLOBAL",
    "language": "en",
    "topics": [
      "open_library_collection",
      "literature_and_poetry",
      "book_catalog",
      "african_history",
      "history"
    ],
    "source_id": "src_open_library",
    "external_source_id": "/works/OL2747608W",
    "source_url": "https://openlibrary.org/works/OL2747608W",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "publication_date": "1966",
    "retrieved_at": "2026-08-19T10:16:04.576Z",
    "last_verified_at": "2026-08-19T10:16:04.576Z",
    "next_verification_at": "2027-02-15T10:16:04.576Z",
    "verification_method": "open_library_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:04.576Z",
    "updated_at": "2026-08-19T10:16:04.576Z"
  },
  {
    "id": "res_openlib_works_ol2701044w",
    "type": "book",
    "title": "History of Africa",
    "description": "Authoritative bibliography record for: History of Africa by Kevin Shillington.",
    "country": "GLOBAL",
    "language": "en",
    "topics": [
      "open_library_collection",
      "literature_and_poetry",
      "book_catalog",
      "african_history",
      "history"
    ],
    "source_id": "src_open_library",
    "external_source_id": "/works/OL2701044W",
    "source_url": "https://openlibrary.org/works/OL2701044W",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "publication_date": "1989",
    "retrieved_at": "2026-08-19T10:16:04.576Z",
    "last_verified_at": "2026-08-19T10:16:04.576Z",
    "next_verification_at": "2027-02-15T10:16:04.576Z",
    "verification_method": "open_library_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:04.576Z",
    "updated_at": "2026-08-19T10:16:04.576Z"
  },
  {
    "id": "res_openlib_works_ol18916147w",
    "type": "book",
    "title": "Themes in West Africa's history",
    "description": "Authoritative bibliography record for: Themes in West Africa's history by Emmanuel Kwaku Akyeampong.",
    "country": "GLOBAL",
    "language": "en",
    "topics": [
      "open_library_collection",
      "literature_and_poetry",
      "book_catalog",
      "african_history",
      "history"
    ],
    "source_id": "src_open_library",
    "external_source_id": "/works/OL18916147W",
    "source_url": "https://openlibrary.org/works/OL18916147W",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "publication_date": "2006",
    "retrieved_at": "2026-08-19T10:16:04.576Z",
    "last_verified_at": "2026-08-19T10:16:04.576Z",
    "next_verification_at": "2027-02-15T10:16:04.576Z",
    "verification_method": "open_library_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:04.576Z",
    "updated_at": "2026-08-19T10:16:04.576Z"
  },
  {
    "id": "res_openlib_works_ol16026005w",
    "type": "book",
    "title": "A History of Art in Africa",
    "description": "Authoritative bibliography record for: A History of Art in Africa by Monica Blackmun Visonà, Monica Blackmun Visoná, Robin Poynor, Herbert M. Cole, Michael D. Harris, Rowland Abiodun, Suzanne Preston Blier, Monica Blackmun Visona.",
    "country": "GLOBAL",
    "language": "en",
    "topics": [
      "open_library_collection",
      "literature_and_poetry",
      "book_catalog",
      "african_history",
      "history"
    ],
    "source_id": "src_open_library",
    "external_source_id": "/works/OL16026005W",
    "source_url": "https://openlibrary.org/works/OL16026005W",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "publication_date": "2000",
    "retrieved_at": "2026-08-19T10:16:04.576Z",
    "last_verified_at": "2026-08-19T10:16:04.576Z",
    "next_verification_at": "2027-02-15T10:16:04.576Z",
    "verification_method": "open_library_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:04.576Z",
    "updated_at": "2026-08-19T10:16:04.576Z"
  },
  {
    "id": "res_openlib_works_ol4415958w",
    "type": "book",
    "title": "The Negroes of Africa",
    "description": "Authoritative bibliography record for: The Negroes of Africa by Maurice Delafosse.",
    "country": "GLOBAL",
    "language": "en",
    "topics": [
      "open_library_collection",
      "literature_and_poetry",
      "book_catalog",
      "african_history"
    ],
    "source_id": "src_open_library",
    "external_source_id": "/works/OL4415958W",
    "source_url": "https://openlibrary.org/works/OL4415958W",
    "source_type": "official_api",
    "source_authority": "tier2_established_aggregator",
    "temporal_status": "PERMANENT",
    "publication_date": "1931",
    "retrieved_at": "2026-08-19T10:16:04.576Z",
    "last_verified_at": "2026-08-19T10:16:04.576Z",
    "next_verification_at": "2027-02-15T10:16:04.576Z",
    "verification_method": "open_library_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:04.576Z",
    "updated_at": "2026-08-19T10:16:04.576Z"
  },
  {
    "id": "res_loc_http___www_loc_gov_item_2021688764",
    "type": "digital_archive",
    "title": "Africa: Re-Sourcing History",
    "description": "David Birmingham presents a lecture on \"Africa: Re-Sourcing History.\"",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "loc_collection",
      "library_of_congress",
      "religion",
      "government_world_affairs",
      "african_history"
    ],
    "source_id": "src_loc",
    "external_source_id": "http://www.loc.gov/item/2021688764/",
    "source_url": "http://www.loc.gov/item/2021688764/",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2011",
    "retrieved_at": "2026-08-19T10:16:06.319Z",
    "last_verified_at": "2026-08-19T10:16:06.319Z",
    "next_verification_at": "2026-12-17T10:16:06.319Z",
    "verification_method": "library_of_congress_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:06.319Z",
    "updated_at": "2026-08-19T10:16:06.319Z"
  },
  {
    "id": "res_loc_https___blogs_loc_gov_law_2011_02_african_american_history_month",
    "type": "digital_collection",
    "title": "African American History Month",
    "description": "February is African American History Month.  The month celebrates the contributions that African Americans have made to American history in their struggles for freedom and equality and deepens our understanding of our Nation&#8217;s history. On the Law Library&#8217;s Commemorative Observations page for African American History Month, you can find an overview of the day as &hellip;",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "loc_collection",
      "library_of_congress",
      "law",
      "law_library",
      "blogs",
      "african_history",
      "american_cultural_history"
    ],
    "source_id": "src_loc",
    "external_source_id": "https://blogs.loc.gov/law/2011/02/african-american-history-month/",
    "source_url": "https://blogs.loc.gov/law/2011/02/african-american-history-month/",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2011",
    "retrieved_at": "2026-08-19T10:16:06.319Z",
    "last_verified_at": "2026-08-19T10:16:06.319Z",
    "next_verification_at": "2026-12-17T10:16:06.319Z",
    "verification_method": "library_of_congress_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:06.319Z",
    "updated_at": "2026-08-19T10:16:06.319Z"
  },
  {
    "id": "res_loc_https___blogs_loc_gov_law_2012_02_african_american_history_month_2",
    "type": "digital_collection",
    "title": "African American History Month",
    "description": "Last year Christine wrote about some of the laws and history relating to African American History Month, which is observed every February.  We thought we&#8217;d take a closer look and expand on some of the information in that post. Although a law designating February as African American History Month was not passed until 1986 (more &hellip;",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "loc_collection",
      "library_of_congress",
      "law",
      "law_library",
      "blogs",
      "african_history",
      "american_cultural_history"
    ],
    "source_id": "src_loc",
    "external_source_id": "https://blogs.loc.gov/law/2012/02/african-american-history-month-2/",
    "source_url": "https://blogs.loc.gov/law/2012/02/african-american-history-month-2/",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2012",
    "retrieved_at": "2026-08-19T10:16:06.319Z",
    "last_verified_at": "2026-08-19T10:16:06.319Z",
    "next_verification_at": "2026-12-17T10:16:06.319Z",
    "verification_method": "library_of_congress_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:06.319Z",
    "updated_at": "2026-08-19T10:16:06.319Z"
  },
  {
    "id": "res_loc_http___lccn_loc_gov_2017950403",
    "type": "book",
    "title": "The Palgrave handbook of African colonial and postcolonial history",
    "description": "\"This wide-ranging volume presents the most complete appraisal of modern African history to date. It assembles dozens of new and established scholars to tackle the questions and subjects that define the field, ranging from the economy, the two world wars, nationalism, decolonization, and postcolonial politics to religion, development, sexuality, and the African youth experience. Contributors are drawn from numerous fields in African studies, including art, music, literature, education, and an...",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "loc_collection",
      "library_of_congress",
      "africa",
      "social_aspects",
      "postcolonialism",
      "afrique",
      "postcolonialisme",
      "religion"
    ],
    "source_id": "src_loc",
    "external_source_id": "http://lccn.loc.gov/2017950403",
    "source_url": "http://lccn.loc.gov/2017950403",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2018",
    "retrieved_at": "2026-08-19T10:16:06.320Z",
    "last_verified_at": "2026-08-19T10:16:06.320Z",
    "next_verification_at": "2026-12-17T10:16:06.320Z",
    "verification_method": "library_of_congress_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:06.320Z",
    "updated_at": "2026-08-19T10:16:06.320Z"
  },
  {
    "id": "res_loc_https___blogs_loc_gov_loc_2015_02_pinteresting_african_american_history",
    "type": "digital_collection",
    "title": "Pinteresting African American History",
    "description": "February is African American History Month, an annual celebration that has existed since 1926. This year&#8217;s theme, according to the Association for the Study of African American Life and History (ASALH) is &#8220;A Century of Black Life, History and Culture.&#8221; This year also marks the centennial of ASALH, which was established in 1915 by Carter G. &hellip;",
    "country": "US",
    "region": "District of Columbia",
    "city": "Washington",
    "language": "en",
    "topics": [
      "loc_collection",
      "library_of_congress",
      "exhibitions",
      "national_library",
      "blogs",
      "african_history",
      "american_cultural_history"
    ],
    "source_id": "src_loc",
    "external_source_id": "https://blogs.loc.gov/loc/2015/02/pinteresting-african-american-history/",
    "source_url": "https://blogs.loc.gov/loc/2015/02/pinteresting-african-american-history/",
    "source_type": "official_api",
    "source_authority": "tier1_primary_institutional",
    "temporal_status": "PERMANENT",
    "publication_date": "2015",
    "retrieved_at": "2026-08-19T10:16:06.320Z",
    "last_verified_at": "2026-08-19T10:16:06.320Z",
    "next_verification_at": "2026-12-17T10:16:06.320Z",
    "verification_method": "library_of_congress_search_api",
    "confidence": 1,
    "status": "active",
    "created_at": "2026-08-19T10:16:06.320Z",
    "updated_at": "2026-08-19T10:16:06.320Z"
  }
];

  window.CURIO_RESOURCES = RESOURCES;

  // 2. Human-Readable Metadata Formatting Helpers
  function getHumanSource(sourceId) {
    var sources = {
      src_smithsonian: "Smithsonian Institution",
      src_bnf: "Bibliothèque nationale de France — Gallica",
      src_europeana: "Europeana Aggregations",
      src_open_library: "Open Library Catalog",
      src_loc: "Library of Congress",
      src_grandpalais: "Réunion des Musées Nationaux - Grand Palais"
    };
    return sources[sourceId] || "Institutional Partner";
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
    if (resTopics.has("african_history") && (qRegion === "africa" || qText.includes("africa") || qText.includes("benin") || qText.includes("zimbabwe") || qText.includes("mali") || qText.includes("timbuktu") || qText.includes("soudan"))) {
      score += 3;
    }
    if (resTopics.has("architecture") && (qText.includes("architect") || qText.includes("building") || qText.includes("stone") || qText.includes("adobe") || qText.includes("pyramid") || qText.includes("house"))) {
      score += 3;
    }
    if (resTopics.has("painting_and_sculpture") && (qText.includes("sculpture") || qText.includes("bronze") || qText.includes("art") || qText.includes("carved"))) {
      score += 3;
    }

    // 2. Category / Subcategory match (+2 points)
    if (qCat === "history" && (resTopics.has("history") || resTopics.has("african_history") || resTopics.has("geographie_histoire") || resTopics.has("histoire_geographie") || resTopics.has("open_library_collection"))) {
      score += 2;
    }
    if (qCat === "geography" && (resTopics.has("geography") || resTopics.has("description_and_travel") || resTopics.has("voyages_afrique") || resTopics.has("geographie_universelle"))) {
      score += 2;
    }
    if (qCat === "arts" && (resTopics.has("art") || resTopics.has("sculpture") || resTopics.has("painting_and_sculpture") || resTopics.has("art_africain"))) {
      score += 2;
    }

    // 3. Country / Region match (+1 point)
    if (qRegion === "africa" && (res.country === "US" || res.country === "FR" || res.country === "GH" || res.country === "TG" || res.country === "GLOBAL") && (resTopics.has("african_history") || resTopics.has("histoire_afrique"))) {
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
