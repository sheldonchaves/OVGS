import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api, isAdmin } from '../api'
import Modal from '../components/Modal'
import TableSearch from '../components/TableSearch'
import { Client, TransportType } from '../types'
import {
  formatCpfCnpj,
  formatPhone,
  isValidCpfCnpj,
  isValidPhone,
} from '../utils/masks'
import { filterBySearch } from '../utils/tableSearch'

export default function ClientsPage() {
  const canManage = isAdmin()
  const [clients, setClients] = useState<Client[]>([])
  const [transports, setTransports] = useState<TransportType[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [transportTypeIds, setTransportTypeIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    const [c, t] = await Promise.all([
      api.get<Client[]>('/clients'),
      api.get<TransportType[]>('/transport-types'),
    ])
    setClients(c)
    setTransports(t.filter((x) => x.active))
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  const filteredClients = useMemo(
    () =>
      filterBySearch(clients, search, (c) => [
        c.name,
        c.document,
        formatCpfCnpj(c.document),
        c.email,
        c.phone,
        c.phone ? formatPhone(c.phone) : '',
        c.authorizedTransports.map((t) => t.transportType.name).join(' '),
      ]),
    [clients, search],
  )

  function toggleTransport(id: string) {
    setTransportTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function openCreate() {
    if (!canManage) return
    setEditing(null)
    setName('')
    setDocument('')
    setEmail('')
    setPhone('')
    setTransportTypeIds([])
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(client: Client) {
    if (!canManage) return
    setEditing(client)
    setName(client.name)
    setDocument(formatCpfCnpj(client.document))
    setEmail(client.email || '')
    setPhone(client.phone ? formatPhone(client.phone) : '')
    setTransportTypeIds(client.authorizedTransports.map((t) => t.transportTypeId))
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setFormError('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canManage) return
    setFormError('')
    setSuccess('')

    if (!editing && !isValidCpfCnpj(document)) {
      setFormError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido')
      return
    }

    if (phone && !isValidPhone(phone)) {
      setFormError('Informe um telefone com DDD (10 ou 11 dígitos)')
      return
    }

    try {
      if (editing) {
        await api.patch(`/clients/${editing.id}`, {
          name,
          email: email || undefined,
          phone: phone || undefined,
          transportTypeIds,
        })
        setSuccess('Cliente atualizado')
      } else {
        await api.post('/clients', {
          name,
          document,
          email: email || undefined,
          phone: phone || undefined,
          transportTypeIds,
        })
        setSuccess('Cliente criado')
      }
      closeModal()
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Cadastro e tipos de transporte autorizados.</p>
        </div>
        {canManage && (
          <button className="btn" type="button" onClick={openCreate}>
            Novo cliente
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="panel">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar nome, documento, telefone, transporte…"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Telefone</th>
                <th>Transportes</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c) => (
                <tr key={c.id}>
                  <td data-label="Nome">{c.name}</td>
                  <td data-label="Documento">{formatCpfCnpj(c.document)}</td>
                  <td data-label="Telefone">{c.phone ? formatPhone(c.phone) : '—'}</td>
                  <td data-label="Transportes">
                    {c.authorizedTransports.map((t) => t.transportType.name).join(', ') || '—'}
                  </td>
                  {canManage && (
                    <td data-label="Ações">
                      <button className="btn secondary" onClick={() => openEdit(c)}>
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td className="muted">Nenhum cliente encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && (
      <Modal
        open={modalOpen}
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        onClose={closeModal}
      >
        {formError && <div className="error">{formError}</div>}
        <form className="stack" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>CPF / CNPJ</label>
              <input
                value={document}
                onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                inputMode="numeric"
                autoComplete="off"
                required={!editing}
                disabled={!!editing}
              />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>
          <div className="field">
            <label>Transportes autorizados</label>
            <div className="checkbox-list">
              {transports.map((t) => (
                <label key={t.id}>
                  <input
                    type="checkbox"
                    checked={transportTypeIds.includes(t.id)}
                    onChange={() => toggleTransport(t.id)}
                  />
                  <span className="checkbox-text">{t.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="submit">
              {editing ? 'Salvar' : 'Criar'}
            </button>
            <button className="btn secondary" type="button" onClick={closeModal}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
      )}
    </div>
  )
}
