import React from 'react';
import ListView from './ListView';
export default function Suites(){
  return <ListView title="Department Suites" path="/suites" columns={["id","key","name","included_credits"]} mapRow={r=>r} queryParam="key"/>;
}
