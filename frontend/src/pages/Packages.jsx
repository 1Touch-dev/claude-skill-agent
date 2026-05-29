import React from 'react';
import ListView from './ListView';
export default function Packages(){
  return <ListView title="Skill Packages" path="/packages" columns={["id","skill_id","version","registry","integrity_hash"]} mapRow={r=>r} queryParam="version"/>;
}
