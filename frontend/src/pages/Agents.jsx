import React from 'react';
import ListView from './ListView';
export default function Agents(){
  return <ListView title="Agent Profiles" path="/agents" columns={["id","workspace_id","name","key","pooled","autonomy_level"]} mapRow={r=>r} queryParam="name"/>;
}
