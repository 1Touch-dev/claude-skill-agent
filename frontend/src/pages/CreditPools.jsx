import React from 'react';
import ListView from './ListView';
export default function CreditPools(){
  return <ListView title="Credit Pools" path="/credit-pools" columns={["id","workspace_id","period_start","period_end","included_credits","consumed_credits","overage_credits"]} mapRow={r=>r} />;
}
