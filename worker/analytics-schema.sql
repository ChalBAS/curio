-- QPIO ANALYTICS — one database, tables by purpose.
--
-- CEO, 6 September 2026: "Use ONE Cloudflare D1 analytics database now.
-- Separate by PURPOSE using tables, not separate databases unless evidence
-- later requires it." And: "Do not build one giant behavioural event log.
-- Aggregate-on-write: store useful counters/totals rather than a raw
-- per-reader event history."
--
-- FIVE RULES THAT DECIDE EVERY TABLE BELOW.
--
-- 1. AGGREGATE-ON-WRITE. Every write is an increment into a row that was
--    declared before any reader arrived. No raw per-event row exists anywhere,
--    at any point, even briefly -- so there is no deletion job that can fail
--    and no ordering to reconstruct. A row's insertion order is a clock; a
--    table of increments has no such clock.
--
-- 2. NO READER IDENTITY, EVER. No device id, no install id, no session id, no
--    fingerprint, no hashed IP, no salted rotating token. There is no column
--    anywhere below whose value is the same for two events from one reader.
--    That is what lets the word "anonymous" be used honestly rather than as a
--    synonym for "pseudonymous", which is a different and much weaker thing.
--
-- 3. COUNTRY IS KEPT AT COUNTRY LEVEL. CEO, explicitly: "Do not collapse
--    Africa/Asia/etc. into meaningless broad regions at source. QPIO needs
--    country-level evidence for cultural representation, localisation, market
--    development and detecting US/Europe-centric bias." Regions are derived at
--    reading time and can always be recomputed; a country thrown away at write
--    time is gone for good. Thin countries are handled by suppressing small
--    cells when something is PUBLISHED, never by refusing to record them.
--
-- 4. THE READER'S OWN DAY, NOT THE SERVER'S. Qpio serves one set of five
--    questions per content day. A reader in Auckland and a reader in Lima meet
--    the same five; grouping by the server's UTC clock would split one day's
--    audience across two rows and make every daily comparison wrong at the
--    edges. The device reports the content day it was actually served.
--
-- 5. TWO VERSIONS, NOT ONE. app_version is the code the reader is running.
--    content_version is which release of the question bank they were served.
--    They move independently, and the second one matters more than it looks:
--    the daily rotation is seeded partly by how many questions are in the bank,
--    so publishing questions re-deals the deck. Without content_version, two
--    stretches of a question's history would be silently different experiments
--    glued into one series.
--
-- WHY THE TABLES ARE SPLIT THE WAY THEY ARE. Every dimension added to a key
-- divides the events per row by its size. Question x day x country x language
-- would put almost every row at one or two counts, which is both useless and
-- the point at which a row starts describing a person rather than a pattern.
-- So the dimensions are spread across purpose tables that are each dense
-- enough to read: the question tables carry the question, the audience table
-- carries the market, and they are joined at reading time.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- 1 · QUESTION
-- How each question performs. The core of MSR-14 and the reason any of this
-- exists: 760 questions and, until now, no evidence about a single one of them.
--
-- Day-level, deliberately. A question airs on one date per rotation, so "how
-- hard is this question" and "who happened to be playing that day" are the same
-- number unless a question can be compared against the four that aired WITH it.
-- The day is a property of the publishing schedule, not of a reader -- everyone
-- that day was served the same five.
--
-- No country column here. Country lives in question_country_week below, at a
-- coarser time grain, so the two can be read together without either table
-- collapsing into rows of one.
CREATE TABLE IF NOT EXISTS question_day (
  content_day     TEXT    NOT NULL,   -- YYYY-MM-DD, the reader's served content day
  qid             TEXT    NOT NULL,   -- permanent question id, never reused
  qrev            INTEGER NOT NULL,   -- the question's revision; a reword starts a new series
  lang            TEXT    NOT NULL,   -- presentation language: translation quality is comparable
  lrev            INTEGER NOT NULL,   -- that translation's revision
  surface         TEXT    NOT NULL,   -- daily | quickfire | vault | city
  mode            TEXT    NOT NULL,   -- adult | kids
  position        INTEGER NOT NULL,   -- 1..5 in the round; later questions look easier, so this
                                      -- is needed to compare a question against its own slot
  content_version TEXT    NOT NULL,   -- which bank release; the rotation changes when it does
  shown           INTEGER NOT NULL DEFAULT 0,  -- placed into a round. NOT an impression: we
                                               -- cannot know what was on screen and never claim to
  answered        INTEGER NOT NULL DEFAULT 0,
  correct         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (content_day, qid, qrev, lang, lrev, surface, mode, position, content_version)
) WITHOUT ROWID;

-- The same question, by country, at week grain. This is the cultural-
-- representation and localisation evidence: whether a question about West
-- African history lands differently in Senegal than in France is exactly the
-- bias question Qpio exists to answer, and it cannot be asked of a region.
CREATE TABLE IF NOT EXISTS question_country_week (
  iso_week   TEXT    NOT NULL,   -- YYYY-Www of the content day
  qid        TEXT    NOT NULL,
  qrev       INTEGER NOT NULL,
  lang       TEXT    NOT NULL,
  country    TEXT    NOT NULL,   -- ISO 3166-1 alpha-2, or XX when the edge gives none
  shown      INTEGER NOT NULL DEFAULT 0,
  answered   INTEGER NOT NULL DEFAULT 0,
  correct    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (iso_week, qid, qrev, lang, country)
) WITHOUT ROWID;

-- ---------------------------------------------------------------- 2 · AUDIENCE
-- Who is reading, as a market rather than as people. One row per day per market
-- slice; this is the table that answers "which countries are we reaching, in
-- which language, on which build".
CREATE TABLE IF NOT EXISTS audience_day (
  content_day      TEXT    NOT NULL,
  country          TEXT    NOT NULL,   -- country level, never a region
  lang             TEXT    NOT NULL,
  mode             TEXT    NOT NULL,   -- adult | kids
  platform         TEXT    NOT NULL,   -- ios | android | desktop | other
  installed        INTEGER NOT NULL,   -- 1 when running as an installed app, 0 in a browser tab
  app_version      TEXT    NOT NULL,
  content_version  TEXT    NOT NULL,
  discovery_source TEXT    NOT NULL,   -- what the reader said once, at onboarding. Never inferred,
                                       -- never a lifetime tracker: see 4 below
  rounds_started   INTEGER NOT NULL DEFAULT 0,
  rounds_completed INTEGER NOT NULL DEFAULT 0,
  answers          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (content_day, country, lang, mode, platform, installed, app_version, content_version, discovery_source)
) WITHOUT ROWID;

-- --------------------------------------------------------------- 3 · DISCOVERY
-- Doors: the links out of Qpio to a book, a video, a museum. This is the
-- commercial instrument -- it is what shows Qpio moves people somewhere, which
-- is what a partner pays for.
CREATE TABLE IF NOT EXISTS door_day (
  content_day  TEXT    NOT NULL,
  qid          TEXT    NOT NULL,   -- which question sent them. The join between curiosity and intent
  door_class   TEXT    NOT NULL,   -- read | watch | visit | lead
  slot         TEXT    NOT NULL,   -- lead | shelf1..shelf5
  lang         TEXT    NOT NULL,
  country      TEXT    NOT NULL,
  taps         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (content_day, qid, door_class, slot, lang, country)
) WITHOUT ROWID;

-- ---------------------------------------------------------------- 4 · RETENTION
-- Whether people come back -- the one number no advertising budget can buy.
--
-- THE BAND IS NOT AN IDENTIFIER. The device reports which of four buckets it
-- first played in. Every device in a bucket reports the same value, so it
-- cannot single anyone out, cannot be followed, and cannot be joined to
-- anything. What it supports is a statement about ROUNDS: "of the rounds
-- completed this week, N in 100 came from devices that first played eight or
-- more weeks ago." That is not a statement about people and must never be
-- reworded into one.
--
-- Known limits, recorded here because a number whose bias is undocumented gets
-- quoted as if it had none: a cleared browser comes back as new, private
-- browsing is always new, and a shared tablet is one device. All three push
-- return DOWN, so every figure from this table is a floor.
CREATE TABLE IF NOT EXISTS cohort_week (
  iso_week         TEXT    NOT NULL,
  first_seen_band  TEXT    NOT NULL,   -- new | w2_4 | w5_12 | w13plus
  lang             TEXT    NOT NULL,
  country          TEXT    NOT NULL,
  rounds_completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (iso_week, first_seen_band, lang, country)
) WITHOUT ROWID;

-- ------------------------------------------------------------ 5 · CONTENT REGISTRY
-- What each question IS, so analysis never needs the app bundle to read the
-- numbers, and so a question retired from the bank keeps its meaning in the
-- history. Written by the release pipeline, not by readers.
CREATE TABLE IF NOT EXISTS content_registry (
  qid             TEXT    NOT NULL,
  qrev            INTEGER NOT NULL,
  category        TEXT,
  subcategory     TEXT,
  region          TEXT,
  difficulty      INTEGER,
  kids            INTEGER,
  first_published TEXT,
  last_published  TEXT,
  content_version TEXT,
  PRIMARY KEY (qid, qrev)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS content_language (
  qid          TEXT    NOT NULL,
  lang         TEXT    NOT NULL,
  lrev         INTEGER NOT NULL,
  published_at TEXT,
  PRIMARY KEY (qid, lang, lrev)
) WITHOUT ROWID;

-- ------------------------------------------------------- 6 · INSTRUMENT HEALTH
-- CEO: "Analytics must never silently fail and then look like real user
-- behaviour." This table is the difference between "nobody played today" and
-- "the counter stopped working today", which otherwise look identical.
CREATE TABLE IF NOT EXISTS instrument_day (
  content_day     TEXT    NOT NULL,
  signal          TEXT    NOT NULL,   -- see the closed list in analytics.js
  app_version     TEXT    NOT NULL,
  n               INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (content_day, signal, app_version)
) WITHOUT ROWID;

-- Rows the instrument REFUSED, kept as a count with the reason. A rejected row
-- is not a bad reader, it is a bug or an attack, and either way the silence
-- would be indistinguishable from a quiet day.
CREATE TABLE IF NOT EXISTS rejected_day (
  content_day TEXT    NOT NULL,
  reason      TEXT    NOT NULL,
  n           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (content_day, reason)
) WITHOUT ROWID;

-- ------------------------------------------------------------------ housekeeping
CREATE TABLE IF NOT EXISTS schema_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
) WITHOUT ROWID;

INSERT INTO schema_meta (k, v) VALUES ('version', '1')
  ON CONFLICT(k) DO UPDATE SET v = excluded.v;
INSERT INTO schema_meta (k, v) VALUES ('created', datetime('now'))
  ON CONFLICT(k) DO NOTHING;
INSERT INTO schema_meta (k, v) VALUES ('doctrine', 'D-087 · aggregate-on-write · no reader identity · country kept at country level')
  ON CONFLICT(k) DO UPDATE SET v = excluded.v;
