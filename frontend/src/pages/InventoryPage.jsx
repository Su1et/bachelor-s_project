import CrudPage from '../components/CrudPage'
import client from '../api/client'

export default function InventoryPage() {
  return (
    <CrudPage
      title="Управління залишками на складах"
      fields={[
        { name: 'product_id', label: 'ID товару', type: 'number' },
        { name: 'warehouse_id', label: 'ID складу', type: 'number' },
        { name: 'quantity', label: 'Кількість', type: 'number' },
        { name: 'product_name', label: 'Товар', form: false, render: (row) => row.product?.name || '—' },
        { name: 'warehouse_name', label: 'Склад', form: false, render: (row) => row.warehouse?.name || '—' },
      ]}
      fetchAll={async () => {
        const { data } = await client.get('/inventory')
        return { data: data.map((row) => ({ ...row, product_name: row.product?.name, warehouse_name: row.warehouse?.name })) }
      }}
      createItem={(payload) => client.post('/inventory', payload)}
      updateItem={(id, payload) => client.put(`/inventory/${id}`, payload)}
      deleteItem={(id) => client.delete(`/inventory/${id}`)}
      emptyItem={{ product_id: 0, warehouse_id: 0, quantity: 0 }}
      createRoles={['admin', 'manager', 'warehouse']}
      editRoles={['admin', 'manager', 'warehouse']}
      deleteRoles={['admin']}
    />
  )
}
