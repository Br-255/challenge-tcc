-- Keep API dates and JSON as text; the application serializes them explicitly.
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  qr_code TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT,
  completed_at TEXT,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  phase1_answer TEXT, phase1_correct INTEGER NOT NULL DEFAULT 0, phase1_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  phase2_answer TEXT, phase2_correct INTEGER NOT NULL DEFAULT 0, phase2_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  phase3_answer TEXT, phase3_correct INTEGER NOT NULL DEFAULT 0, phase3_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  phase4_answer TEXT, phase4_correct INTEGER NOT NULL DEFAULT 0, phase4_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  phase5_answer TEXT, phase5_correct INTEGER NOT NULL DEFAULT 0, phase5_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  phase6_answer TEXT, phase6_correct INTEGER NOT NULL DEFAULT 0, phase6_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  redemption_code TEXT UNIQUE,
  redeemed INTEGER NOT NULL DEFAULT 0 CHECK (redeemed IN (0, 1)),
  redeemed_at TEXT,
  prizes TEXT,
  round INTEGER,
  round_position INTEGER,
  content_version TEXT DEFAULT 'v1',
  revoked_reason TEXT,
  revoked_at TEXT,
  device_id TEXT,
  question_snapshots TEXT,
  timing_version INTEGER NOT NULL DEFAULT 0,
  event_date TEXT,
  event_timezone TEXT,
  phase1_started_ms BIGINT, phase2_started_ms BIGINT, phase3_started_ms BIGINT,
  phase4_started_ms BIGINT, phase5_started_ms BIGINT, phase6_started_ms BIGINT,
  phase1_result TEXT, phase2_result TEXT, phase3_result TEXT,
  phase4_result TEXT, phase5_result TEXT, phase6_result TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
CREATE INDEX idx_attempts_round ON attempts(round);
CREATE INDEX idx_attempts_status ON attempts(status);
CREATE INDEX idx_attempts_completed ON attempts(completed_at);
CREATE INDEX idx_attempts_event ON attempts(event_date, event_timezone, round);

CREATE TABLE prizes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  available INTEGER NOT NULL CHECK (available >= 0 AND available <= quantity),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
CREATE INDEX idx_prizes_category ON prizes(category);

CREATE TABLE prize_deliveries (
  id TEXT PRIMARY KEY,
  prize_id TEXT NOT NULL REFERENCES prizes(id),
  attempt_id TEXT NOT NULL REFERENCES attempts(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'delivered',
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
CREATE INDEX idx_deliveries_attempt ON prize_deliveries(attempt_id);
CREATE INDEX idx_deliveries_prize ON prize_deliveries(prize_id);

CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES admins(username),
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX idx_admin_sessions_expiry ON admin_sessions(expires_at);

CREATE TABLE admin_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  admin_user TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_created ON admin_logs(created_at);

CREATE TABLE hourly_rounds (
  event_date TEXT NOT NULL,
  timezone TEXT NOT NULL,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 9),
  state TEXT NOT NULL CHECK (state IN ('empty', 'winner', 'tie')),
  winner_id TEXT REFERENCES attempts(id),
  candidates TEXT NOT NULL,
  finalized_at TEXT NOT NULL,
  PRIMARY KEY (event_date, timezone, round)
);
