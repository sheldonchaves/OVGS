import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import OrderItemsTable from '../components/OrderItemsTable'
import TableSearch from '../components/TableSearch'
import {
  Client,
  Item,
  NEXT_STATUS,
  SalesOrder,
  TransportType,
} from '../types'
import { unwrapList } from '../utils/apiHelpers'
import { filterBySearch } from '../utils/tableSearch'

export default function OrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SalesOrder | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleOrder, setScheduleOrder] = useState<SalesOrder | null>(null)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [windowStart, setWindowStart] = useState('08:00')
  const [windowEnd, setWindowEnd] = useState('12:00')
  const [clientId, setClientId] = useState('')
  const [transportTypeId, setTransportTypeId] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<Array<{ itemId: string; quantity: number; name: string }>>([])
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)

  const selectedClient = clients.find((c) => c.id === clientId)
  const availableTransports = selectedClient?.authorizedTransports.map((t) => t.transportType) || []

  async function refresh() {
    const data = await api.get<SalesOrder[] | { data: SalesOrder[] }>('/sales-orders')
    setOrders(unwrapList(data))
    if (selected) {
      const updated = unwrapList(data).find((o) => o.id === selected.id) || null
      setSelected(updated)
    }
  }

  useEffect(() => {
    Promise.all([
      api.get<SalesOrder[] | { data: SalesOrder[] }>('/sales-orders'),
      api.get<Client[]>('/clients'),
      api.get<Item[]>('/items'),
    ])
      .then(([o, c, i]) => {
        setOrders(unwrapList(o))
        setClients(c)
        setItems(i)
        if (c[0]) setClientId(c[0].id)
        if (i[0]) setItemId(i[0].id)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (availableTransports.length) {
      setTransportTypeId(availableTransports[0].id)
    } else {
      setTransportTypeId('')
    }
  }, [clientId, clients])

  const filteredOrders = useMemo(
    () =>
      filterBySearch(orders, search, (o) => [
        o.code,
        o.status,
        o.client.name,
        o.transportType.name,
        o.notes,
      ]),
    [orders, search],
  )

  function openCreate() {
    setNotes('')
    setLineItems([])
    setQuantity(1)
    setFormError('')
    if (clients[0]) setClientId(clients[0].id)
    if (items[0]) setItemId(items[0].id)
    setCreateOpen(true)
  }

  function closeCreate() {
    setCreateOpen(false)
    setFormError('')
  }

  function openDetail(order: SalesOrder) {
    setSelected(order)
    setDetailOpen(true)
  }

  function addItem() {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setLineItems((prev) => {
      const existing = prev.find((p) => p.itemId === itemId)
      if (existing) {
        return prev.map((p) =>
          p.itemId === itemId ? { ...p, quantity: p.quantity + quantity } : p,
        )
      }
      return [...prev, { itemId, quantity, name: `${item.sku} — ${item.name}` }]
    })
  }

  async function createOrder(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    try {
      if (!lineItems.length) throw new Error('Adicione ao menos um item')
      const created = await api.post<SalesOrder>('/sales-orders', {
        clientId,
        transportTypeId,
        notes: notes || undefined,
        items: lineItems.map(({ itemId: id, quantity: q }) => ({ itemId: id, quantity: q })),
      })
      setSuccess(`Ordem ${created.code} criada`)
      closeCreate()
      await refresh()
      openDetail(created)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar')
    }
  }

  async function advanceStatus(order: SalesOrder) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setError('')
    setSuccess('')

    if (next === 'AGENDADA') {
      if (order.schedule?.confirmed) {
        try {
          const updated = await api.patch<SalesOrder>(`/sales-orders/${order.id}/status`, {
            status: next,
          })
          setSuccess(`Status atualizado para ${updated.status}`)
          await refresh()
          setSelected(updated)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao atualizar status')
        }
        return
      }

      setScheduleOrder(order)
      setScheduleError('')
      if (order.schedule) {
        setDeliveryDate(order.schedule.deliveryDate.slice(0, 10))
        setWindowStart(order.schedule.windowStart)
        setWindowEnd(order.schedule.windowEnd)
      } else {
        setDeliveryDate('')
        setWindowStart('08:00')
        setWindowEnd('12:00')
      }
      setDetailOpen(false)
      setScheduleOpen(true)
      return
    }

    try {
      const updated = await api.patch<SalesOrder>(`/sales-orders/${order.id}/status`, {
        status: next,
      })
      setSuccess(`Status atualizado para ${updated.status}`)
      await refresh()
      setSelected(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  function closeSchedule() {
    setScheduleOpen(false)
    setScheduleOrder(null)
    setScheduleError('')
    setScheduleSaving(false)
  }

  async function submitScheduleAndAdvance(e: FormEvent) {
    e.preventDefault()
    if (!scheduleOrder) return
    setScheduleError('')
    setScheduleSaving(true)
    setSuccess('')
    try {
      if (!scheduleOrder.schedule) {
        await api.post(`/scheduling/${scheduleOrder.id}`, {
          deliveryDate,
          windowStart,
          windowEnd,
          confirmed: true,
        })
      } else if (!scheduleOrder.schedule.confirmed) {
        await api.patch(`/scheduling/${scheduleOrder.id}`, {
          deliveryDate,
          windowStart,
          windowEnd,
          confirmed: true,
        })
      }

      const updated = await api.patch<SalesOrder>(
        `/sales-orders/${scheduleOrder.id}/status`,
        { status: 'AGENDADA' },
      )
      setSuccess(`Ordem ${updated.code} agendada com sucesso`)
      closeSchedule()
      await refresh()
      setSelected(updated)
      setDetailOpen(true)
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Erro ao agendar')
    } finally {
      setScheduleSaving(false)
    }
  }

  async function changeTransport(order: SalesOrder, transportId: string) {
    setError('')
    setSuccess('')
    try {
      const updated = await api.patch<SalesOrder>(`/sales-orders/${order.id}/transport`, {
        transportTypeId: transportId,
      })
      setSuccess('Transporte atualizado')
      await refresh()
      setSelected(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar transporte')
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Ordens de Venda</h1>
          <p>Crie, consulte e avance o fluxo operacional das OVs.</p>
        </div>
        <button className="btn" type="button" onClick={openCreate}>
          Nova ordem
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="panel">
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Código">{o.code}</td>
                  <td data-label="Cliente">{o.client.name}</td>
                  <td data-label="Transporte">{o.transportType.name}</td>
                  <td data-label="Status"><span className={`badge ${o.status}`}>{o.status}</span></td>
                  <td data-label="Ações">
                    <button className="btn secondary" onClick={() => openDetail(o)}>
                      Ver
                    </button>
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

      <Modal open={createOpen} title="Nova ordem de venda" onClose={closeCreate}>
        {formError && <div className="error">{formError}</div>}
        <form className="stack" onSubmit={createOrder}>
          <div className="form-grid">
            <div className="field">
              <label>Cliente</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Transporte</label>
              <select
                value={transportTypeId}
                onChange={(e) => setTransportTypeId(e.target.value)}
                required
              >
                {availableTransports.map((t: TransportType) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Observações</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Item</label>
              <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Qtd</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="actions" style={{ alignSelf: 'end' }}>
              <button type="button" className="btn secondary" onClick={addItem}>
                Adicionar item
              </button>
            </div>
          </div>
          {lineItems.length > 0 && (
            <ul>
              {lineItems.map((li) => (
                <li key={li.itemId}>{li.name} × {li.quantity}</li>
              ))}
            </ul>
          )}
          <div className="actions">
            <button className="btn" type="submit">Criar ordem</button>
            <button className="btn secondary" type="button" onClick={closeCreate}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailOpen && !!selected}
        title={selected ? `Ordem ${selected.code}` : 'Detalhe'}
        onClose={() => setDetailOpen(false)}
      >
        {selected && (
          <div className="stack">
            <div className="detail-grid">
              <div><span className="muted">Código</span><strong>{selected.code}</strong></div>
              <div>
                <span className="muted">Status</span>
                <span className={`badge ${selected.status}`}>{selected.status}</span>
              </div>
              <div><span className="muted">Cliente</span><span>{selected.client.name}</span></div>
              <div><span className="muted">Transporte</span><span>{selected.transportType.name}</span></div>
            </div>
            <OrderItemsTable items={selected.items} />
            <div className="actions">
              {NEXT_STATUS[selected.status] && (
                <button className="btn" onClick={() => advanceStatus(selected)}>
                  {NEXT_STATUS[selected.status] === 'AGENDADA'
                    ? 'Agendar e avançar para AGENDADA'
                    : `Avançar para ${NEXT_STATUS[selected.status]}`}
                </button>
              )}
            </div>
            {selected.status !== 'ENTREGUE' && (
              <div className="field">
                <label>Alterar transporte</label>
                <select
                  value={selected.transportType.id}
                  onChange={(e) => changeTransport(selected, e.target.value)}
                >
                  {selected.client.authorizedTransports?.map((t) => (
                    <option key={t.transportTypeId} value={t.transportTypeId}>
                      {t.transportType.name}
                    </option>
                  )) || (
                    <option value={selected.transportType.id}>
                      {selected.transportType.name}
                    </option>
                  )}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={scheduleOpen && !!scheduleOrder}
        title={scheduleOrder ? `Agendar ordem ${scheduleOrder.code}` : 'Agendamento'}
        onClose={closeSchedule}
      >
        {scheduleOrder && (
          <form className="stack" onSubmit={submitScheduleAndAdvance}>
            {scheduleError && <div className="error">{scheduleError}</div>}
            <p className="muted">
              Para avançar para AGENDADA, informe a data e a janela de atendimento.
              O agendamento será confirmado automaticamente.
            </p>
            <div className="detail-grid">
              <div><span className="muted">Cliente</span><span>{scheduleOrder.client.name}</span></div>
              <div>
                <span className="muted">Transporte</span>
                <span>{scheduleOrder.transportType.name}</span>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Data de entrega</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Início da janela</label>
                <input
                  type="time"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Fim da janela</label>
                <input
                  type="time"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="actions">
              <button className="btn" type="submit" disabled={scheduleSaving}>
                {scheduleSaving ? 'Agendando…' : 'Confirmar agendamento'}
              </button>
              <button className="btn secondary" type="button" onClick={closeSchedule}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
