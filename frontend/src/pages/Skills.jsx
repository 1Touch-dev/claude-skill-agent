import React from 'react';
import ListView from './ListView';

export default function Skills(){
  return <ListView title="Skill Registry" path="/skills" columns={["id","key","name","risk_tier","trust","review","quarantined"]} mapRow={r=>r} queryParam="name"/>;
}
