-- Apply after rh-declarations.sql and rh-payouts-attendance.sql (backup first).
-- created_at/check_in/check_out = declared event time; received_at = server receipt time.
BEGIN;
ALTER TABLE redaction_rh.activity_submissions ADD COLUMN IF NOT EXISTS received_at timestamptz;
UPDATE redaction_rh.activity_submissions SET received_at=created_at WHERE received_at IS NULL;
ALTER TABLE redaction_rh.activity_submissions ALTER COLUMN received_at SET DEFAULT now();
ALTER TABLE redaction_rh.activity_submissions ALTER COLUMN received_at SET NOT NULL;
ALTER TABLE redaction_rh.attendance ADD COLUMN IF NOT EXISTS check_in_received_at timestamptz;
ALTER TABLE redaction_rh.attendance ADD COLUMN IF NOT EXISTS check_out_received_at timestamptz;
UPDATE redaction_rh.attendance SET check_in_received_at=check_in WHERE check_in IS NOT NULL AND check_in_received_at IS NULL;
UPDATE redaction_rh.attendance SET check_out_received_at=check_out WHERE check_out IS NOT NULL AND check_out_received_at IS NULL;
ALTER TABLE redaction_rh.absence_requests ADD COLUMN IF NOT EXISTS received_at timestamptz;
UPDATE redaction_rh.absence_requests SET received_at=created_at WHERE received_at IS NULL;
ALTER TABLE redaction_rh.absence_requests ALTER COLUMN received_at SET DEFAULT now();
ALTER TABLE redaction_rh.absence_requests ALTER COLUMN received_at SET NOT NULL;
COMMIT;
