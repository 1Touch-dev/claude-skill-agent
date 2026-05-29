import React from 'react';
import ListView from './ListView';
export default function Workspaces(){
  return <ListView title="Workspaces" path="/workspaces" columns={["id","customer_id","external_id","name"]} mapRow={r=>r} queryParam="name"/>;
}
