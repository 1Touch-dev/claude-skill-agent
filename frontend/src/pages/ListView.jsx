import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

export default function ListView({ title, path, columns, mapRow = (row) => row, queryParam }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setErr('');
    apiGet(path)
      .then((data) => setRows(Array.isArray(data) ? data.map(mapRow) : []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [path]);

  const filtered =
    queryParam && filter
      ? rows.filter((row) =>
          String(row[queryParam] ?? '')
            .toLowerCase()
            .includes(filter.toLowerCase())
        )
      : rows;

  return (
    <div style={{ padding: 20 }}>
      <h2>{title}</h2>
      {queryParam && (
        <input
          placeholder={`Filter by ${queryParam}`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ marginBottom: 12, padding: '0.35rem 0.5rem' }}
        />
      )}
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={{ textAlign: 'left' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row.id ?? index}>
                {columns.map((col) => (
                  <td key={col}>{formatCell(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && !err && filtered.length === 0 && <p>No rows.</p>}
    </div>
  );
}

function formatCell(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
