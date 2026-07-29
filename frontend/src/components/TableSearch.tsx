type TableSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function TableSearch({
  value,
  onChange,
  placeholder = 'Buscar na tabela…',
}: TableSearchProps) {
  return (
    <div className="table-toolbar">
      <div className="field table-search">
        <label>Buscar</label>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
    </div>
  )
}
