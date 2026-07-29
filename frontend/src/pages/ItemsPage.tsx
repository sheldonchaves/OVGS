import { FormEvent, useEffect, useMemo, useState } from 'react'
import { api, isAdmin } from '../api'
import Modal from '../components/Modal'
import TableSearch from '../components/TableSearch'
import { Item } from '../types'
import { filterBySearch } from '../utils/tableSearch'

export default function ItemsPage() {
  const canManage = isAdmin()
  const [items, setItems] = useState<Item[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('UN')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setItems(await api.get<Item[]>('/items'))
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  const filteredItems = useMemo(
    () =>
      filterBySearch(items, search, (i) => [i.sku, i.name, i.description, i.unit]),
    [items, search],
  )

  function openCreate() {
    if (!canManage) return
    setEditing(null)
    setSku('')
    setName('')
    setDescription('')
    setUnit('UN')
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(item: Item) {
    if (!canManage) return
    setEditing(item)
    setSku(item.sku)
    setName(item.name)
    setDescription(item.description || '')
    setUnit(item.unit)
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
        await api.patch(`/items/${editing.id}`, {
          name,
          description,
          unit,
        })
        setSuccess('Item atualizado')
      } else {
        await api.post('/items', { sku, name, description, unit })
        setSuccess('Item criado')
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
          <h1>Itens</h1>
          <p>Catálogo prévio de produtos vinculados às ordens.</p>
        </div>
        {canManage && (
          <button className="btn" type="button" onClick={openCreate}>
            Novo item
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="panel">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar SKU, nome, unidade, descrição…"
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Unidade</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((i) => (
                <tr key={i.id}>
                  <td data-label="SKU">{i.sku}</td>
                  <td data-label="Nome">{i.name}</td>
                  <td data-label="Unidade">{i.unit}</td>
                  {canManage && (
                    <td data-label="Ações">
                      <button className="btn secondary" onClick={() => openEdit(i)}>
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td className="muted">Nenhum item encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && (
        <Modal
          open={modalOpen}
          title={editing ? 'Editar item' : 'Novo item'}
          onClose={closeModal}
        >
          {formError && <div className="error">{formError}</div>}
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <div className="field">
                <label>SKU</label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required={!editing}
                  disabled={!!editing}
                />
              </div>
              <div className="field">
                <label>Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Unidade</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} required />
              </div>
            </div>
            <div className="field">
              <label>Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
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
