type PaginationMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

type PaginationBarProps = {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  disabled?: boolean
}

export default function PaginationBar({
  meta,
  onPageChange,
  disabled = false,
}: PaginationBarProps) {
  const { page, totalPages, total, limit } = meta
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="pagination-bar">
      <span className="pagination-info muted">
        {total === 0 ? 'Nenhum registro' : `${from}–${to} de ${total}`}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn secondary"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <span className="pagination-page">
          Página {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn secondary"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
