-- Mèo Ngữ — D1 schema
-- Users are anonymous device accounts: the client keeps a random secret token,
-- the server only stores its SHA-256 hash as the user id.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,           -- sha256(device token)
  created_at    INTEGER NOT NULL,
  share_audio   INTEGER NOT NULL DEFAULT 0, -- 1 = consented to store raw audio in R2
  agent_day     TEXT,                       -- YYYY-MM-DD of last agent call (UTC)
  agent_calls   INTEGER NOT NULL DEFAULT 0, -- agent calls on agent_day
  consent_at    INTEGER,                    -- when the owner accepted the terms (NULL = not yet)
  consent_version TEXT,                     -- which version of privacy.html they accepted
  share_model   INTEGER NOT NULL DEFAULT 0  -- 1 = labelled measurements may improve the shared model
);
-- Migration for databases created before 2026-10-14:
-- ALTER TABLE users ADD COLUMN consent_at INTEGER;
-- ALTER TABLE users ADD COLUMN consent_version TEXT;
-- ALTER TABLE users ADD COLUMN share_model INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS cats (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sex         TEXT,          -- 'duc' | 'cai' | NULL
  neutered    INTEGER,       -- 1/0/NULL
  birth_year  INTEGER,
  breed       TEXT,
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cats_user ON cats(user_id);

-- One row per recorded vocalisation. features = JSON numeric vector + named fields.
CREATE TABLE IF NOT EXISTS sounds (
  id          TEXT PRIMARY KEY,
  cat_id      TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  source      TEXT NOT NULL DEFAULT 'mic',   -- mic | upload
  duration    REAL,
  features    TEXT NOT NULL,                 -- JSON
  predicted   TEXT,                          -- context the app guessed
  confidence  INTEGER,
  label       TEXT,                          -- context the owner confirmed
  outcome     TEXT,                          -- calmed | continued | ignored
  audio_key   TEXT                           -- R2 key when the owner shared audio
);
CREATE INDEX IF NOT EXISTS idx_sounds_cat_time ON sounds(cat_id, created_at);

-- Free-text behaviour / body-language / routine / health notes.
CREATE TABLE IF NOT EXISTS observations (
  id          TEXT PRIMARY KEY,
  cat_id      TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  kind        TEXT NOT NULL,                 -- behavior | body | routine | health | other
  text        TEXT NOT NULL,
  tags        TEXT,                          -- JSON array
  author      TEXT NOT NULL DEFAULT 'owner'  -- owner | agent
);
CREATE INDEX IF NOT EXISTS idx_obs_cat_time ON observations(cat_id, created_at);

-- Feline Five questionnaire result (Litchfield et al., 2017).
CREATE TABLE IF NOT EXISTS personality (
  cat_id      TEXT PRIMARY KEY REFERENCES cats(id) ON DELETE CASCADE,
  scores      TEXT NOT NULL,                 -- JSON {neuroticism, extraversion, ...} 0..100
  answers     TEXT NOT NULL,                 -- JSON {itemId: 1..7}
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  cat_id      TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  role        TEXT NOT NULL,                 -- user | assistant
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_msg_cat_time ON messages(cat_id, created_at);
