ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_weeks integer;
UPDATE packages SET duration_weeks=duration_months*4 WHERE duration_weeks IS NULL AND duration_months IS NOT NULL;