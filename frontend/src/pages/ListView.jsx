import React, { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../lib/api';

const PAGE_SIZE = 10;

export default function ListView({
  title,
  path,
  columns,
  mapRow = (row) => row,
  queryParam,
  subtitle,
}) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setErr('');
    apiGet(path)
      .then((data) => setRows(Array.isArray(data) ? data.map(mapRow) : []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    setPage(1);
  }, [filter, path]);

  const filtered = useMemo(() => {
    if (!queryParam || !filter) return rows;
    return rows.filter((row) =>
      String(row[queryParam] ?? '')
        .toLowerCase()
        .includes(filter.toLowerCase())
    );
  }, [rows, queryParam, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="page">
      <div className="page__header">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {!loading && !err && (
          <p className="page__meta">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
        )}
      </div>
      {queryParam && (
        <input
          className="field-input"
          placeholder={`Search by ${queryParam}`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {err && <div className="status status--error">{err}</div>}
      {loading ? (
        <p className="status status--muted">Loading…</p>
      ) : (
        <>
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
                {pageRows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    {columns.map((col) => (
                      <td key={col}>{formatCell(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="pagination">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      {!loading && !err && filtered.length === 0 && (
        <p className="status status--muted">No records found.</p>
      )}
    </main>
  );
}

function formatCell(value) {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
