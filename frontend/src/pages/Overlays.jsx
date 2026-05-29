import React from 'react';
import ListView from './ListView';
export default function Overlays(){
  return <ListView title="Industry Overlays" path="/overlays" columns={["id","key","name","included_credits"]} mapRow={r=>r} queryParam="key"/>;
}
