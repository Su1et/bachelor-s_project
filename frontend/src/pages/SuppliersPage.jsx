import CrudPage from '../components/CrudPage'
import client from '../api/client'

export default function SuppliersPage() {
  return (
    <CrudPage
      title="Управління постачальниками"
      fields={[
        { name: 'name', label: 'Назва' }, { name: 'contact_person', label: 'Контактна особа' }, { name: 'email', label: 'Email' },
        { name: 'phone', label: 'Телефон' }, { name: 'address', label: 'Адреса' }, { name: 'notes', label: 'Примітки' }
      ]}
      fetchAll={() => client.get('/suppliers')}
      createItem={(payload) => client.post('/suppliers', payload)}
      updateItem={(id, payload) => client.put(`/suppliers/${id}`, payload)}
      deleteItem={(id) => client.delete(`/suppliers/${id}`)}
      emptyItem={{ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }}
      createRoles={['admin', 'manager']}
      editRoles={['admin', 'manager']}
      deleteRoles={['admin']}
    />
  )
}
