ALTER TABLE player_registrations ADD COLUMN IF NOT EXISTS sport text;
ALTER TABLE player_registrations ADD COLUMN IF NOT EXISTS tennis_categories text[] NOT NULL DEFAULT '{}';
UPDATE player_registrations pr SET sport=pk.sport FROM packages pk WHERE pk.id=pr.package_id AND (pr.sport IS NULL OR pr.sport='');