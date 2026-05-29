import React from 'react';
import ListView from './ListView';
export default function Customers(){
  return <ListView title="Customers" path="/customers" columns={["id","external_id","name"]} mapRow={r=>r} queryParam="name"/>;
}
