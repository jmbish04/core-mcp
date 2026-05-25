-- Create mcp_logs table
CREATE TABLE IF NOT EXISTS mcp_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  method TEXT NOT NULL,
  request_payload TEXT NOT NULL,
  response_payload TEXT NOT NULL,
  status_code INTEGER NOT NULL
);

-- Create best_practices table
CREATE TABLE IF NOT EXISTS best_practices (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL UNIQUE,
  guidance_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Create hitl_proposals table
CREATE TABLE IF NOT EXISTS hitl_proposals (
  id TEXT PRIMARY KEY,
  trigger_pattern TEXT NOT NULL,
  suggested_guidance TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  confidence_score REAL NOT NULL,
  created_at TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_logs_timestamp ON mcp_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_best_practices_pattern ON best_practices(pattern);
CREATE INDEX IF NOT EXISTS idx_hitl_proposals_status ON hitl_proposals(status);
