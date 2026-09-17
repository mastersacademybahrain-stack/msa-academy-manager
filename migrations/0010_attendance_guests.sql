CREATE TABLE attendance_guests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 academy_session_id uuid NOT NULL,
 guest_name text NOT NULL,
 status text NOT NULL DEFAULT 'Present',
 session_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);