import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import OrderItemsTable from '../components/OrderItemsTable'
import TableSearch from '../components/TableSearch'
import { Client, SalesOrder, SalesOrderStatus, TransportType } from '../types'
import { unwrapList } from '../utils/apiHelpers'
import { filterBySearch } from '../utils/tableSearch'

const statuses: Array<SalesOrderStatus | ''> = [
  '',
  'CRIADA',
  'PLANEJADA',
  'AGENDADA',
  'EM_TRANSPORTE',
  'ENTREGUE',
]

export default function MonitoringPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [transports, setTransports] = useState<TransportType[]>([])
  const [status, setStatus] = useState('')
  const [clientId, setClientId] = useState('')
  const [transportTypeId, setTransportTypeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SalesOrder | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Client[]>('/clients'),
      api.get<TransportType[]>('/transport-types'),
    ])
      .then(([c, t]) => {
        setClients(c)
        setTransports(t)
      })
      .catch((e) => setError(e.message))
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (clientId) params.set('clientId', clientId)
      if (transportTypeId) params.set('transportTypeId', transportTypeId)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const qs = params.toString()
      const data = await api.get<SalesOrder[] | { data: SalesOrder[] }>(
        `/sales-orders${qs ? `?${qs}` : ''}`,
      )
      setOrders(unwrapList(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status, clientId, transportTypeId])

  function onFilterSubmit(e: FormEvent) {
    e.preventDefault()
    load()
  }

  async function openDetail(order: SalesOrder) {
    setSelected(order)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const full = await api.get<SalesOrder>(`/sales-orders/${order.id}`)
      setSelected(full)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhe')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
    setSelected(null)
  }

  const filteredOrders = useMemo(
    () =>
      filterBySearch(orders, search, (o) => [
        o.code,
        o.status,
        o.client.name,
        o.transportType.name,
        new Date(o.createdAt).toLocaleString('pt-BR'),
        o.schedule
          ? `${new Date(o.schedule.deliveryDate).toLocaleDateString('pt-BR')} ${o.schedule.windowStart}-${o.schedule.windowEnd}`
          : '',
      ]),
    [orders, search],
  )

  const counts = useMemo(() => {
    return statuses.filter(Boolean).reduce<Record<string, number>>((acc, s) => {
      acc[s] = orders.filter((o) => o.status === s).length
      return acc
    }, {})
  }, [orders])

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Monitoramento operacional</h1>
          <p>Acompanhe ordens por status, cliente, transporte e período.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats">
        {statuses.filter(Boolean).map((s) => (
          <div className="stat" key={s}>
            <span>{s}</span>
            <strong>{counts[s] || 0}</strong>
          </div>
        ))}
      </div>

      <div className="panel">
        <form className="filters" onSubmit={onFilterSubmit}>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {statuses.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Cliente</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Transporte</label>
            <select value={transportTypeId} onChange={(e) => setTransportTypeId(e.target.value)}>
              <option value="">Todos</option>
              {transports.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>De</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>Até</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="actions" style={{ alignSelf: 'end' }}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Filtrando…' : 'Filtrar'}
            </button>
          </div>
        </form>

        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar código, cliente, transporte, status…"
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Transporte</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Código">
                    <button
                      type="button"
                      className="table-link"
                      onClick={() => openDetail(o)}
                    >
                      {o.code}
                    </button>
                  </td>
                  <td data-label="Cliente">{o.client.name}</td>
                  <td data-label="Transporte">{o.transportType.name}</td>
                  <td data-label="Status"><span className={`badge ${o.status}`}>{o.status}</span></td>
                  <td data-label="Criada em">{new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                  <td data-label="Entrega">
                    {o.schedule
                      ? `${new Date(o.schedule.deliveryDate).toLocaleDateString('pt-BR')} ${o.schedule.windowStart}-${o.schedule.windowEnd}`
                      : '—'}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td className="muted">Nenhuma ordem encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={detailOpen && !!selected}
        title={selected ? `Ordem ${selected.code}` : 'Detalhe'}
        onClose={closeDetail}
      >
        {selected && (
          <div className="stack">
            {detailLoading && <p className="muted">Atualizando detalhe…</p>}
            <div className="detail-grid">
              <div><span className="muted">Código</span><strong>{selected.code}</strong></div>
              <div>
                <span className="muted">Status</span>
                <span className={`badge ${selected.status}`}>{selected.status}</span>
              </div>
              <div><span className="muted">Cliente</span><span>{selected.client.name}</span></div>
              <div><span className="muted">Documento</span><span>{selected.client.document}</span></div>
              <div><span className="muted">Transporte</span><span>{selected.transportType.name}</span></div>
              <div>
                <span className="muted">Criada em</span>
                <span>{new Date(selected.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              {selected.notes && (
                <div><span className="muted">Observações</span><span>{selected.notes}</span></div>
              )}
              {selected.schedule && (
                <>
                  <div>
                    <span className="muted">Entrega</span>
                    <span>
                      {new Date(selected.schedule.deliveryDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="muted">Janela</span>
                    <span>
                      {selected.schedule.windowStart} – {selected.schedule.windowEnd}
                    </span>
                  </div>
                  <div>
                    <span className="muted">Agendamento</span>
                    <span>{selected.schedule.confirmed ? 'Confirmado' : 'Pendente'}</span>
                  </div>
                </>
              )}
            </div>
            <OrderItemsTable items={selected.items} />
          </div>
        )}
      </Modal>
    </div>
  )
}
