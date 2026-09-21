CREATE TABLE IF NOT EXISTS player_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sport text NOT NULL,
  evaluation_date date NOT NULL DEFAULT CURRENT_DATE,
  coach_id uuid NULL REFERENCES coaches(id) ON DELETE SET NULL,
  overall_rating integer NULL CHECK (overall_rating BETWEEN 1 AND 5),
  level text NULL,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths text NULL,
  focus_areas text NULL,
  comments text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_player ON player_evaluations(player_id, sport, evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_player_evaluations_coach ON player_evaluations(coach_id, evaluation_date DESC);