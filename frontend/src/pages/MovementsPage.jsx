import CrudPage from '../components/CrudPage'
import client from '../api/client'

export default function MovementsPage() {
  return (
    <CrudPage
      title="Рух запасів і розрахунок часу переміщення"
      fields={[
        { name: 'product_id', label: 'ID товару', type: 'number' },
        { name: 'movement_type', label: 'Тип', type: 'select', options: [
          { value: 'in', label: 'Надходження' }, { value: 'out', label: 'Списання' }, { value: 'transfer', label: 'Переміщення' }, { value: 'return', label: 'Повернення' },
        ] },
        { name: 'quantity', label: 'Кількість', type: 'number' },
        { name: 'source_warehouse_id', label: 'Склад-відправник', type: 'number', nullable: true },
        { name: 'destination_warehouse_id', label: 'Склад-отримувач', type: 'number', nullable: true },
        { name: 'status', label: 'Статус', type: 'select', options: [
          { value: 'planned', label: 'planned' }, { value: 'in_transit', label: 'in_transit' }, { value: 'completed', label: 'completed' }, { value: 'cancelled', label: 'cancelled' },
        ] },
        { name: 'distance_km', label: 'Відстань, км', form: false, render: (row) => row.distance_km ?? '—' },
        { name: 'estimated_minutes', label: 'Час, хв', form: false, render: (row) => row.estimated_minutes ?? '—' },
        { name: 'comment', label: 'Коментар' },
      ]}
      fetchAll={async () => {
        const { data } = await client.get('/inventory/movements')
        return { data: data.map((row) => ({ ...row, source_warehouse_id: row.source_warehouse_id ?? '', destination_warehouse_id: row.destination_warehouse_id ?? '', distance_km: row.distance_km ?? '', estimated_minutes: row.estimated_minutes ?? '', comment: row.comment ?? '' })) }
      }}
      createItem={(payload) => client.post('/inventory/movements', payload)}
      updateItem={() => Promise.reject(new Error('Редагування руху не підтримується'))}
      deleteItem={() => Promise.reject(new Error('Видалення руху не підтримується'))}
      emptyItem={{ product_id: 0, movement_type: 'transfer', quantity: 1, source_warehouse_id: '', destination_warehouse_id: '', status: 'completed', comment: '' }}
      createRoles={['admin', 'manager', 'warehouse']}
      editRoles={[]}
      deleteRoles={[]}
      renderExtra={() => <div className="card info-card"><strong>Унікальний функціонал:</strong> для переміщення між складами система автоматично розраховує відстань за координатами складів і орієнтовний час доставки.</div>}
    />
  )
}
