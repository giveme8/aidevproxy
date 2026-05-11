import React from "react";
import Select from "./Select";

interface PaginationProps {
  page: number;
  total: number;
  onChange?: (p: number) => void;
  perPage?: number;
  onPerPage?: (n: number) => void;
}

const PER_PAGE_OPTIONS = [
  { value: "10", label: "10 / page" },
  { value: "20", label: "20 / page" },
  { value: "50", label: "50 / page" },
];

export default function Pagination({
  page,
  total,
  onChange,
  perPage = 10,
  onPerPage,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const infoStyle: React.CSSProperties = {
    fontSize: 13,
    color: "var(--text-tertiary)",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };

  const pagesRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
  };

  const pageBtnBase: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    background: "transparent",
    color: "var(--text-secondary)",
    transition: "background 0.15s, color 0.15s",
  };

  const pageBtnActive: React.CSSProperties = {
    ...pageBtnBase,
    background: "#22c55e",
    color: "#06140c",
    fontWeight: 600,
  };

  const pageBtnDisabled: React.CSSProperties = {
    ...pageBtnBase,
    opacity: 0.3,
    cursor: "default",
  };

  const chevronStyle: React.CSSProperties = {
    fontSize: 11,
  };

  // Build page range: show up to 5 page buttons around current page
  function getVisiblePages(current: number, max: number): number[] {
    if (max <= 7) {
      return Array.from({ length: max }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    const start = Math.max(2, current - 2);
    const end = Math.min(max - 1, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    pages.push(max);
    return pages;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div style={containerStyle}>
      <div style={infoStyle}>
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </div>
      <div style={pagesRowStyle}>
        <button
          style={page <= 1 ? pageBtnDisabled : pageBtnBase}
          onClick={() => page > 1 && onChange?.(page - 1)}
          disabled={page <= 1}
        >
          <span style={chevronStyle}>&#9664;</span>
        </button>
        {visiblePages.map((p, idx) => {
          // Add ellipsis gaps
          const prev = visiblePages[idx - 1];
          const showEllipsis =
            prev !== undefined && p - prev > 1;

          return (
            <React.Fragment key={p}>
              {showEllipsis && (
                <span
                  style={{
                    ...pageBtnBase,
                    cursor: "default",
                    fontSize: 10,
                  }}
                >
                  ...
                </span>
              )}
              <button
                style={p === page ? pageBtnActive : pageBtnBase}
                onClick={() => p !== page && onChange?.(p)}
              >
                {p}
              </button>
            </React.Fragment>
          );
        })}
        <button
          style={page >= totalPages ? pageBtnDisabled : pageBtnBase}
          onClick={() => page < totalPages && onChange?.(page + 1)}
          disabled={page >= totalPages}
        >
          <span style={chevronStyle}>&#9654;</span>
        </button>
      </div>
      {onPerPage && (
        <Select
          value={String(perPage)}
          options={PER_PAGE_OPTIONS}
          onChange={(v) => onPerPage(Number(v))}
          size="sm"
        />
      )}
    </div>
  );
}
