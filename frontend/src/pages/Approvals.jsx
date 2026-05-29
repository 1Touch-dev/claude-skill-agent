import React from 'react';
import ListView from './ListView';
export default function Approvals(){
  return <ListView title="Approval Queue" path="/approvals" columns={["id","run_id","status","sla_deadline","owners","decided_by","decided_at"]} mapRow={r=>r} />;
}
