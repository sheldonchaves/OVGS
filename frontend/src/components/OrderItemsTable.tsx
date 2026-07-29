import { Item } from '../types'

type OrderLine = {
  id: string
  quantity: number
  item: Pick<Item, 'sku' | 'name' | 'unit' | 'description'>
}

type OrderItemsTableProps = {
  items: OrderLine[]
}

export default function OrderItemsTable({ items }: OrderItemsTableProps) {
  const totalQty = items.reduce((sum, line) => sum + line.quantity, 0)

  return (
    <div className="order-items">
      <div className="order-items-header">
        <h3>Itens da ordem</h3>
        <span className="muted">
          {items.length} {items.length === 1 ? 'linha' : 'linhas'} · {totalQty} un.
        </span>
      </div>

      {items.length === 0 ? (
        <p className="muted order-items-empty">Nenhum item nesta ordem.</p>
      ) : (
        <div className="order-items-list">
          {items.map((line) => (
            <article key={line.id} className="order-item-card">
              <div className="order-item-main">
                <span className="order-item-sku">{line.item.sku}</span>
                <strong className="order-item-name">{line.item.name}</strong>
                {line.item.description && (
                  <p className="order-item-desc muted">{line.item.description}</p>
                )}
              </div>
              <div className="order-item-meta">
                <div className="order-item-qty">
                  <span className="muted">Qtd</span>
                  <strong>{line.quantity}</strong>
                </div>
                <div className="order-item-unit">
                  <span className="muted">Unidade</span>
                  <strong>{line.item.unit || 'UN'}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
