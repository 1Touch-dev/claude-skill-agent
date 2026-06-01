import React from 'react';
import ListView from './ListView';

export default function Integrations() {
  return (
    <ListView
      title="Third-Party Integrations & MCP Credentials"
      path="/integrations"
      columns={["id", "provider", "name", "endpoint_url", "client_id", "status", "active"]}
      mapRow={(r) => r}
      queryParam="provider"
    />
  );
}
