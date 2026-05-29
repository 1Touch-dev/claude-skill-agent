import React from 'react';
import ListView from './ListView';
export default function Entitlements(){
  return <ListView title="Entitlements" path="/entitlements" columns={["id","scope","workspace_id","customer_id","kind","ref_id","included_credits"]} mapRow={r=>r} />;
}
