ALTER TABLE players ADD COLUMN IF NOT EXISTS tennis_categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE academy_sessions ADD COLUMN IF NOT EXISTS tennis_categories text[] NOT NULL DEFAULT '{}';
UPDATE players SET tennis_categories=ARRAY[]::text[] WHERE sport='Tennis' AND tennis_categories IS NULL;
UPDATE academy_sessions SET tennis_categories=ARRAY['Red','Orange','Green','Yellow','Veteran']::text[] WHERE sport='Tennis' AND cardinality(tennis_categories)=0;