import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api, isAdmin } from '../api'
import Modal from '../components/Modal'
import TableSearch from '../components/TableSearch'
import { TransportType } from '../types'
import { filterBySearch } from '../utils/tableSearch'

export default function TransportTypesPage() {
  const canManage = isAdmin()
  const [items, setItems] = useState<TransportType[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransportType | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setItems(await api.get<TransportType[]>('/transport-types'))
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  const filteredItems = useMemo(
    () =>
      filterBySearch(items, search, (t) => [
        t.name,
        t.description,
        t.active ? 'Sim' : 'Não',
      ]),
    [items, search],
  )

  function openCreate() {
    if (!canManage) return
    setEditing(null)
    setName('')
    setDescription('')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(item: TransportType) {
    if (!canManage) return
    setEditing(item)
    setName(item.name)
    setDescription(item.description || '')
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
    try {
      if (editing) {
        await api.patch(`/transport-types/${editing.id}`, { name, description })
        setSuccess('Tipo atualizado')
      } else {
        await api.post('/transport-types', { name, description })
        setSuccess('Tipo criado')
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
          <h1>Tipos de Transporte</h1>
          <p>Cadastre modalidades sem alterar regras de negócio.</p>
        </div>
        {canManage && (
          <button className="btn" type="button" onClick={openCreate}>
            Novo tipo
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="panel">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar nome, descrição, ativo…"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Ativo</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((t) => (
                <tr key={t.id}>
                  <td data-label="Nome">{t.name}</td>
                  <td data-label="Descrição">{t.description || '—'}</td>
                  <td data-label="Ativo">{t.active ? 'Sim' : 'Não'}</td>
                  {canManage && (
                    <td data-label="Ações">
                      <button className="btn secondary" onClick={() => openEdit(t)}>
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td className="muted">Nenhum tipo encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && (
        <Modal
          open={modalOpen}
          title={editing ? 'Editar tipo' : 'Novo tipo de transporte'}
          onClose={closeModal}
        >
          {formError && <div className="error">{formError}</div>}
          <form className="stack" onSubmit={submit}>
            <div className="field">
              <label>Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn" type="submit">{editing ? 'Salvar' : 'Criar'}</button>
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
