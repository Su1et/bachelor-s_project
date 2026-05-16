import CrudPage from '../components/CrudPage'
import client from '../api/client'

export default function UsersPage() {
  return (
    <CrudPage
      title="Управління користувачами та ролями"
      fields={[
        { name: 'full_name', label: 'ПІБ' }, { name: 'email', label: 'Email' },
        { name: 'role', label: 'Роль', type: 'select', options: [
          { value: 'admin', label: 'Адміністратор' }, { value: 'manager', label: 'Менеджер' }, { value: 'warehouse', label: 'Працівник складу' }, { value: 'analyst', label: 'Керівник / аналітик' }, { value: 'operator', label: 'Оператор' },
        ] },
        { name: 'password', label: 'Пароль' },
      ]}
      fetchAll={() => client.get('/users')}
      createItem={(payload) => client.post('/users', { ...payload, is_active: true })}
      updateItem={(id, payload) => client.put(`/users/${id}`, payload)}
      deleteItem={(id) => client.delete(`/users/${id}`)}
      emptyItem={{ full_name: '', email: '', role: 'manager', password: '' }}
      createRoles={['admin']}
      editRoles={['admin']}
      deleteRoles={['admin']}
    />
  )
}
