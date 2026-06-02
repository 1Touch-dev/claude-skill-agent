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
    <main className="page">
      <div className="page__header">
        <h2>{title}</h2>
      </div>
      {queryParam && (
        <input
          className="field-input"
          placeholder={`Filter by ${queryParam}`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {err && <div className="status status--error">{err}</div>}
      {loading ? (
        <p className="status status--muted">Loading…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
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
        </div>
      )}
      {!loading && !err && filtered.length === 0 && <p className="status status--muted">No rows.</p>}
    </main>
  );
}

function formatCell(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
