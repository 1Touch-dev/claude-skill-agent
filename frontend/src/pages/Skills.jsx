import React from 'react';
import ListView from './ListView';

export default function Skills() {
  return (
    <ListView
      title="Skill Registry"
      subtitle="MVP registry: lifecycle, source provenance, review state, and governance fields."
      path="/skills"
      columns={['id', 'key', 'name', 'lifecycle', 'risk_tier', 'trust', 'review', 'quarantined']}
      mapRow={(r) => r}
      queryParam="name"
    />
  );
}
