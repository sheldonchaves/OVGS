import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import PaginationBar from '../components/PaginationBar'
import TableSearch from '../components/TableSearch'
import { AuditLog } from '../types'
import { filterBySearch } from '../utils/tableSearch'

type AuditResponse = {
  data: AuditLog[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .get<AuditResponse>(`/audit?page=${page}&limit=${limit}`)
      .then((payload) => {
        setLogs(payload.data)
        setMeta(payload.meta)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, limit])

  const filteredLogs = useMemo(
    () =>
      filterBySearch(logs, search, (log) => [
        new Date(log.createdAt).toLocaleString('pt-BR'),
        log.userEmail,
        log.user?.email,
        log.user?.name,
        log.action,
        log.entityType,
        log.entityId,
        log.previousState,
        log.newState,
      ]),
    [logs, search],
  )

  function changeLimit(nextLimit: number) {
    setLimit(nextLimit)
    setPage(1)
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Auditoria</h1>
          <p>Registro de todas as alterações do sistema e usuário responsável.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="panel">
        <div className="table-toolbar-row">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar na página atual…"
          />
          <div className="field page-size-field">
            <label>Por página</label>
            <select
              value={limit}
              onChange={(e) => changeLimit(Number(e.target.value))}
              disabled={loading}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Anterior</th>
                <th>Posterior</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Data">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                  <td data-label="Usuário">{log.userEmail || log.user?.email || '—'}</td>
                  <td data-label="Ação">{log.action}</td>
                  <td data-label="Entidade">{log.entityType}:{log.entityId.slice(0, 8)}</td>
                  <td data-label="Anterior">
                    <code style={{ fontSize: '0.75rem' }}>
                      {log.previousState ? JSON.stringify(log.previousState) : '—'}
                    </code>
                  </td>
                  <td data-label="Posterior">
                    <code style={{ fontSize: '0.75rem' }}>
                      {log.newState ? JSON.stringify(log.newState) : '—'}
                    </code>
                  </td>
                </tr>
              ))}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td className="muted">Nenhum evento registrado</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="muted">Carregando…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          meta={meta}
          onPageChange={setPage}
          disabled={loading}
        />
      </div>
    </div>
  )
}
