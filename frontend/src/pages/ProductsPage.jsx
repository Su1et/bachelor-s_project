import CrudPage from '../components/CrudPage'
import client from '../api/client'

export default function ProductsPage() {
  return (
    <CrudPage
      title="Управління товарами"
      fields={[
        { name: 'sku', label: 'SKU' }, { name: 'name', label: 'Назва' }, { name: 'category', label: 'Категорія' },
        { name: 'unit', label: 'Одиниця' }, { name: 'price', label: 'Ціна', type: 'number' },
        { name: 'min_stock_level', label: 'Мін. залишок', type: 'number' }, { name: 'supplier_id', label: 'ID постачальника', type: 'number', nullable: true },
        { name: 'description', label: 'Опис' }
      ]}
      fetchAll={() => client.get('/products')}
      createItem={(payload) => client.post('/products', payload)}
      updateItem={(id, payload) => client.put(`/products/${id}`, payload)}
      deleteItem={(id) => client.delete(`/products/${id}`)}
      emptyItem={{ sku: '', name: '', category: '', unit: 'шт.', price: 0, min_stock_level: 0, supplier_id: '', description: '' }}
      createRoles={['admin', 'manager']}
      editRoles={['admin', 'manager']}
      deleteRoles={['admin']}
    />
  )
}
