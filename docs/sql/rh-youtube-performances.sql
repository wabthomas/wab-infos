-- Après rh-initial.sql, rh-declarations.sql et les migrations RH existantes.
-- Sauvegarder la base avant exécution. Ne jamais exécuter automatiquement en production.
BEGIN;
CREATE TABLE redaction_rh.youtube_videos (
  video_id varchar(11) PRIMARY KEY,
  title varchar(200) NOT NULL,
  views bigint CHECK (views >= 0),
  likes bigint CHECK (likes >= 0),
  comments bigint CHECK (comments >= 0),
  checked_at timestamptz NOT NULL DEFAULT now(),
  unavailable_at timestamptz
);
CREATE TABLE redaction_rh.youtube_video_snapshots (
  video_id varchar(11) NOT NULL REFERENCES redaction_rh.youtube_videos(video_id),
  checked_at timestamptz NOT NULL,
  views bigint, likes bigint, comments bigint,
  PRIMARY KEY (video_id, checked_at)
);
CREATE TABLE redaction_rh.youtube_contributions (
  id uuid PRIMARY KEY,
  video_id varchar(11) NOT NULL REFERENCES redaction_rh.youtube_videos(video_id),
  collaborator_id uuid NOT NULL REFERENCES redaction_rh.collaborators(id),
  submission_id uuid NOT NULL UNIQUE REFERENCES redaction_rh.activity_submissions(id),
  contribution_role varchar(80) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decision_note varchar(500) NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  bonus_minor bigint NOT NULL DEFAULT 0 CHECK (bonus_minor >= 0),
  bonus_currency varchar(3) NOT NULL DEFAULT 'CDF' CHECK (bonus_currency IN ('CDF','USD')),
  bonus_note varchar(500) NOT NULL DEFAULT '',
  decided_by varchar(320),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, collaborator_id)
);
CREATE INDEX youtube_contributions_person_idx ON redaction_rh.youtube_contributions (collaborator_id, created_at DESC);
CREATE INDEX youtube_contributions_status_idx ON redaction_rh.youtube_contributions (status, created_at DESC);
-- Journal dédié : toutes les corrections de prime et les décisions sont conservées.
CREATE TABLE redaction_rh.youtube_contribution_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contribution_id uuid NOT NULL REFERENCES redaction_rh.youtube_contributions(id),
  actor_email varchar(320) NOT NULL,
  action varchar(24) NOT NULL CHECK (action IN ('claim','approve','reject','bonus')),
  old_bonus_minor bigint,
  new_bonus_minor bigint,
  note varchar(500) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
-- Accorder au rôle applicatif (pas au rôle public) SELECT/INSERT/UPDATE sur youtube_videos,
-- SELECT/INSERT sur youtube_video_snapshots, SELECT/INSERT/UPDATE sur youtube_contributions,
-- SELECT/INSERT sur youtube_contribution_events et USAGE sur sa séquence IDENTITY.
