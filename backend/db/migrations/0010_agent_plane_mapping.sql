-- 0010_agent_plane_mapping.sql
-- P1-8: Map agent profiles to Plane workspace members.
-- Adds plane_member_id (Plane user UUID) to agent_profiles so routed work items
-- can be automatically assigned to the corresponding Plane member.

ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS plane_member_id TEXT;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS plane_member_email TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_profiles_plane_member
  ON agent_profiles(plane_member_id)
  WHERE plane_member_id IS NOT NULL;
