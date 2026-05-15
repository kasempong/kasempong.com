CREATE TABLE IF NOT EXISTS statements (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  bank TEXT,
  period_start TEXT,
  period_end TEXT,
  filename TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  statement_id TEXT REFERENCES statements(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  category TEXT,
  vendor_name TEXT,
  source TEXT NOT NULL,
  bank TEXT,
  is_reconciled INTEGER NOT NULL DEFAULT 0,
  matched_id TEXT,
  is_anomalous INTEGER NOT NULL DEFAULT 0,
  anomaly_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON transactions(statement_id);

CREATE TABLE IF NOT EXISTS vendor_cache (
  pattern TEXT PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  category TEXT NOT NULL,
  researched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  date_start TEXT,
  date_end TEXT,
  transaction_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
