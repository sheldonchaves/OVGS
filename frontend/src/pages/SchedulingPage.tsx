import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import TableSearch from '../components/TableSearch'
import { DeliverySchedule, SalesOrder } from '../types'
import { unwrapList } from '../utils/apiHelpers'
import { filterBySearch } from '../utils/tableSearch'

export default function SchedulingPage() {
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleId, setRescheduleId] = useState('')
  const [salesOrderId, setSalesOrderId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [windowStart, setWindowStart] = useState('08:00')
  const [windowEnd, setWindowEnd] = useState('12:00')
  const [filterDate, setFilterDate] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    const qs = filterDate ? `?date=${filterDate}` : ''
    const [s, o] = await Promise.all([
      api.get<DeliverySchedule[]>(`/scheduling${qs}`),
      api.get<SalesOrder[] | { data: SalesOrder[] }>('/sales-orders'),
    ])
    setSchedules(s)
    const eligible = unwrapList(o).filter(
      (order) =>
        (order.status === 'CRIADA' || order.status === 'PLANEJADA') && !order.schedule,
    )
    setOrders(eligible)
    if (eligible[0]) setSalesOrderId(eligible[0].id)
    else setSalesOrderId('')
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  const filteredSchedules = useMemo(
    () =>
      filterBySearch(schedules, search, (s) => [
        s.salesOrder?.code,
        s.salesOrder?.client.name,
        new Date(s.deliveryDate).toLocaleDateString('pt-BR'),
        s.windowStart,
        s.windowEnd,
        s.confirmed ? 'Sim' : 'Não',
      ]),
    [schedules, search],
  )

  function openCreate() {
    setDeliveryDate('')
    setWindowStart('08:00')
    setWindowEnd('12:00')
    setFormError('')
    if (orders[0]) setSalesOrderId(orders[0].id)
    setCreateOpen(true)
  }

  function openReschedule(schedule: DeliverySchedule) {
    setRescheduleId(schedule.salesOrderId)
    setDeliveryDate(schedule.deliveryDate.slice(0, 10))
    setWindowStart(schedule.windowStart)
    setWindowEnd(schedule.windowEnd)
    setFormError('')
    setRescheduleOpen(true)
  }

  async function createSchedule(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    try {
      await api.post(`/scheduling/${salesOrderId}`, {
        deliveryDate,
        windowStart,
        windowEnd,
        confirmed: false,
      })
      setSuccess('Agendamento criado')
      setCreateOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao agendar')
    }
  }

  async function confirm(salesOrderIdValue: string) {
    setError('')
    setSuccess('')
    try {
      await api.post(`/scheduling/${salesOrderIdValue}/confirm`, {})
      const order = await api.get<SalesOrder>(`/sales-orders/${salesOrderIdValue}`)
      if (order.status === 'PLANEJADA') {
        await api.patch(`/sales-orders/${salesOrderIdValue}/status`, {
          status: 'AGENDADA',
        })
        setSuccess('Agendamento confirmado e ordem avançada para AGENDADA')
      } else {
        setSuccess('Agendamento confirmado')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar')
    }
  }

  async function submitReschedule(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSuccess('')
    try {
      await api.patch(`/scheduling/${rescheduleId}`, {
        deliveryDate,
        windowStart,
        windowEnd,
        confirmed: false,
      })
      setSuccess('Reagendamento realizado')
      setRescheduleOpen(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao reagendar')
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Central de Agendamento</h1>
          <p>Defina data, janela de atendimento, confirme ou reagende.</p>
        </div>
        <button className="btn" type="button" onClick={openCreate}>
          Novo agendamento
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="panel">
        <div className="actions" style={{ marginBottom: '1rem' }}>
          <div className="field" style={{ minWidth: 180 }}>
            <label>Filtro por data</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <button
            className="btn secondary"
            style={{ alignSelf: 'end' }}
            onClick={() => load().catch((e) => setError(e.message))}
          >
            Aplicar
          </button>
        </div>

        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar ordem, cliente, data, janela…"
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Janela</th>
                <th>Confirmado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((s) => (
                <tr key={s.id}>
                  <td data-label="Ordem">{s.salesOrder?.code}</td>
                  <td data-label="Cliente">{s.salesOrder?.client.name}</td>
                  <td data-label="Data">{new Date(s.deliveryDate).toLocaleDateString('pt-BR')}</td>
                  <td data-label="Janela">{s.windowStart} – {s.windowEnd}</td>
                  <td data-label="Confirmado">{s.confirmed ? 'Sim' : 'Não'}</td>
                  <td data-label="Ações">
                    <div className="actions">
                      {!s.confirmed && (
                        <button className="btn" onClick={() => confirm(s.salesOrderId)}>
                          Confirmar
                        </button>
                      )}
                      <button className="btn secondary" onClick={() => openReschedule(s)}>
                        Reagendar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td className="muted">Nenhum agendamento</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={createOpen} title="Novo agendamento" onClose={() => setCreateOpen(false)}>
        {formError && <div className="error">{formError}</div>}
        <form className="stack" onSubmit={createSchedule}>
          <div className="field">
            <label>Ordem elegível</label>
            <select
              value={salesOrderId}
              onChange={(e) => setSalesOrderId(e.target.value)}
              required
            >
              {orders.length === 0 && <option value="">Nenhuma ordem elegível</option>}
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} — {o.client.name}
                </option>
              ))}
            </select>
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
              <label>Início</label>
              <input
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Fim</label>
              <input
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="submit" disabled={!salesOrderId}>
              Agendar
            </button>
            <button className="btn secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={rescheduleOpen} title="Reagendar entrega" onClose={() => setRescheduleOpen(false)}>
        {formError && <div className="error">{formError}</div>}
        <form className="stack" onSubmit={submitReschedule}>
          <div className="form-grid">
            <div className="field">
              <label>Nova data</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Início</label>
              <input
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Fim</label>
              <input
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="submit">Salvar</button>
            <button className="btn secondary" type="button" onClick={() => setRescheduleOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
