export function Pagination({ page, pages, total, onPage, label }) {
  return (
    <div className="pharmacy-pagination">
      <span>Showing page {page} of {pages} · {total} {label}</span>
      <div>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} type="button">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} type="button">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
