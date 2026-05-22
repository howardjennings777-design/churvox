import React from 'react';

export default function PremiumTable({ columns = [], rows = [], onRowClick, emptyText = 'No records', className = '' }) {
  return (
    <div className={`px-table-wrap ${className}`}>
      <div className="overflow-x-auto">
        <table className="px-table">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={col.key || col.header || i} style={col.width ? { width: col.width } : undefined}>
                  {col.header || col.label || col.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="text-center py-8 px-row__sub">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={row.id || row._id || ri}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col, ci) => (
                    <td key={col.key || ci}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
