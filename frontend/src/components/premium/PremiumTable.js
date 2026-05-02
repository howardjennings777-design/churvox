import React from 'react';

export default function PremiumTable({ columns = [], rows = [], onRowClick, emptyText = 'No records', className = '' }) {
  return (
    <div className={`px-table-wrap ${className}`}>
      <div className="overflow-x-auto">
        <table className="px-table">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={col.width ? { width: col.width } : undefined}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-[#5b6c87]">{emptyText}</td></tr>
            ) : (
              rows.map((row, ri) => (
                <tr key={row.id || ri} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick ? 'cursor-pointer' : ''}>
                  {columns.map((col, ci) => (
                    <td key={ci}>{col.render ? col.render(row) : row[col.key]}</td>
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
