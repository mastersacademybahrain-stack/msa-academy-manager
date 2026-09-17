ALTER TABLE player_registrations ADD COLUMN IF NOT EXISTS number_weeks integer;
ALTER TABLE player_registrations ADD COLUMN IF NOT EXISTS reference_price numeric;
ALTER TABLE player_registrations ADD COLUMN IF NOT EXISTS net_price numeric;
ALTER TABLE player_registrations ADD COLUMN IF NOT EXISTS discount_percentage numeric;
ALTER TABLE player_registrations ADD COLUMN IF NOT EXISTS discounted_price numeric;