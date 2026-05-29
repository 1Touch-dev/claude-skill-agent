import React from 'react';
import ListView from './ListView';
export default function Runs(){
  return <ListView title="Skill Runs" path="/runs" columns={["id","task_id","workspace_id","user_id","agent_id","skill_id","state","risk_tier","credits_charged"]} mapRow={r=>r} queryParam="workspace_id"/>;
}
