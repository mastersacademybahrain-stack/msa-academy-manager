ALTER TABLE packages ADD COLUMN IF NOT EXISTS package_type text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS end_date date;