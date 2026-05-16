import { useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../components/RoleGate'

const emptyItem = { product_id: 0, quantity: 1, unit_price: 0 }

export default function OrdersPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user, ['admin', 'manager', 'operator'])
  const canDelete = hasRole(user, ['admin'])
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState({ order_number: '', customer_name: '', status: 'draft', assigned_user_id: '', notes: '', items: [emptyItem] })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => { const { data } = await client.get('/orders'); setOrders(data) }
  useEffect(() => { load().catch(() => setError('Не вдалося завантажити замовлення')) }, [])

  const payload = () => ({ ...form, assigned_user_id: form.assigned_user_id === '' ? null : Number(form.assigned_user_id) })
  const handleItemChange = (index, field, value) => {
    const items = [...form.items]
    items[index] = { ...items[index], [field]: ['quantity', 'unit_price', 'product_id'].includes(field) ? Number(value) : value }
    setForm({ ...form, items })
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) await client.put(`/orders/${editingId}`, payload())
      else await client.post('/orders', payload())
      setForm({ order_number: '', customer_name: '', status: 'draft', assigned_user_id: '', notes: '', items: [emptyItem] })
      setEditingId(null); setError(''); await load()
    } catch (err) { setError(err?.response?.data?.detail || 'Помилка збереження замовлення') }
  }
  const editOrder = (order) => {
    setEditingId(order.id)
    setForm({ order_number: order.order_number, customer_name: order.customer_name, status: order.status, assigned_user_id: order.assigned_user_id || '', notes: order.notes || '', items: order.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price })) })
  }
  const deleteOrder = async (id) => { if (!window.confirm('Видалити замовлення?')) return; await client.delete(`/orders/${id}`); await load() }

  return (
    <div className="page">
      <h2>Управління замовленнями</h2>
      {error && <div className="error-box">{error}</div>}
      <div className={canEdit ? 'grid-two' : 'grid-one'}>
        {canEdit && <form className="card form-grid" onSubmit={handleSubmit}>
          <label><span>Номер замовлення</span><input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} /></label>
          <label><span>Клієнт</span><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
          <label><span>Статус</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">draft</option><option value="approved">approved</option><option value="in_progress">in_progress</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select></label>
          <label><span>ID відповідального</span><input type="number" value={form.assigned_user_id} onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })} /></label>
          <label className="full-width"><span>Примітки</span><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="full-width card nested-card"><h3>Позиції замовлення</h3>{form.items.map((item, index) => <div key={index} className="inline-grid"><input type="number" placeholder="ID товару" value={item.product_id} onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} /><input type="number" placeholder="Кількість" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} /><input type="number" placeholder="Ціна" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} /></div>)}<button type="button" className="secondary" onClick={() => setForm({ ...form, items: [...form.items, emptyItem] })}>Додати позицію</button></div>
          <div className="actions"><button type="submit">{editingId ? 'Оновити замовлення' : 'Створити замовлення'}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm({ order_number: '', customer_name: '', status: 'draft', assigned_user_id: '', notes: '', items: [emptyItem] }) }}>Скасувати</button>}</div>
        </form>}
        <div className="card table-wrap"><table><thead><tr><th>№</th><th>Клієнт</th><th>Статус</th><th>Сума</th><th>Позиції</th>{(canEdit || canDelete) && <th>Дії</th>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.order_number}</td><td>{order.customer_name}</td><td>{order.status}</td><td>{order.total_amount} грн</td><td>{order.items.map((item) => <div key={item.id}>{item.product?.name || item.product_id}: {item.quantity} × {item.unit_price}</div>)}</td>{(canEdit || canDelete) && <td className="nowrap">{canEdit && <button className="secondary small" onClick={() => editOrder(order)}>Редагувати</button>}{canDelete && <button className="danger small" onClick={() => deleteOrder(order.id)}>Видалити</button>}</td>}</tr>)}</tbody></table></div>
      </div>
    </div>
  )
}
