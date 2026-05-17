import { useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../components/RoleGate'

const emptyItem = { product_id: '', quantity: 1, unit_price: 0 }

const geocodeAddress = async (address) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error('Помилка геокодування адреси замовника:', error);
  }
  return null;
};

const generateNextOrderNumber = (ordersList) => {
  const year = new Date().getFullYear();
  if (!ordersList || ordersList.length === 0) return `ORD-${year}-001`;

  let maxId = 0;
  ordersList.forEach(order => {
    const match = order.order_number.match(new RegExp(`^ORD-${year}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  });

  const nextId = String(maxId + 1).padStart(3, '0');
  return `ORD-${year}-${nextId}`;
};

export default function OrdersPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user, ['admin', 'manager', 'operator'])
  const canDelete = hasRole(user, ['admin'])
  
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([]) 
  
  const initialFormState = { 
    order_number: '', 
    customer_name: '', 
    status: 'draft', 
    assigned_user_id: user?.id || '', 
    assigned_user_name: user?.full_name || '', 
    notes: '', 
    items: [emptyItem],
    customer_location: '', 
    customer_capacity: 1000, 
    customer_manager_name: '' 
  }
  
  const [form, setForm] = useState(initialFormState)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => { 
    try {
      const [ordersRes, productsRes] = await Promise.all([
        client.get('/orders'),
        client.get('/products')
      ])
      const fetchedOrders = ordersRes.data;
      setOrders(fetchedOrders)
      setProducts(productsRes.data)
      
      setForm(prev => {
        if (!editingId && prev.order_number === '') {
          return { ...prev, order_number: generateNextOrderNumber(fetchedOrders) }
        }
        return prev;
      })
    } catch {
      setError('Не вдалося завантажити дані')
    }
  }
  
  useEffect(() => { load() }, [])

  const payload = () => ({ 
    order_number: form.order_number,
    customer_name: form.customer_name,
    status: form.status,
    assigned_user_id: form.assigned_user_id === '' ? null : Number(form.assigned_user_id),
    notes: form.notes,
    items: form.items,
    customer_location: form.customer_location,
    customer_capacity: Number(form.customer_capacity),
    customer_manager_name: form.customer_manager_name
  })

  const handleItemChange = (index, field, value) => {
    const items = [...form.items]
    const parsedValue = ['quantity', 'unit_price', 'product_id'].includes(field) ? Number(value) : value
    
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === parsedValue)
      items[index] = { 
        ...items[index], 
        product_id: parsedValue,
        unit_price: selectedProduct ? selectedProduct.price : 0
      }
    } else {
      items[index] = { ...items[index], [field]: parsedValue }
    }
    
    setForm({ ...form, items })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const dataToSubmit = payload();

      if (!editingId && dataToSubmit.customer_location) {
        const coords = await geocodeAddress(dataToSubmit.customer_location);
        if (coords) {
          dataToSubmit.customer_latitude = coords.latitude;
          dataToSubmit.customer_longitude = coords.longitude;
        }
      }

      if (editingId) await client.put(`/orders/${editingId}`, dataToSubmit)
      else await client.post('/orders', dataToSubmit)
      
      const { data: updatedOrders } = await client.get('/orders')
      setOrders(updatedOrders)
      
      setForm({ ...initialFormState, order_number: generateNextOrderNumber(updatedOrders) })
      setEditingId(null); setError('')
    } catch (err) { setError(err?.response?.data?.detail || 'Помилка збереження замовлення') }
  }

  const editOrder = (order) => {
    setEditingId(order.id)
    setForm({ 
      order_number: order.order_number, 
      customer_name: order.customer_name, 
      status: order.status, 
      assigned_user_id: order.assigned_user_id || '', 
      assigned_user_name: order.assigned_user?.full_name || (order.assigned_user_id ? `ID: ${order.assigned_user_id}` : 'Не призначено'),
      notes: order.notes || '', 
      items: order.items.map((item) => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price })),
      customer_location: '', customer_capacity: 1000, customer_manager_name: ''
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ ...initialFormState, order_number: generateNextOrderNumber(orders) })
  }
  
  const deleteOrder = async (id) => { 
    if (!window.confirm('Видалити замовлення?')) return; 
    await client.delete(`/orders/${id}`); 
    
    const { data: updatedOrders } = await client.get('/orders')
    setOrders(updatedOrders)
    if (!editingId) {
      setForm(prev => ({ ...prev, order_number: generateNextOrderNumber(updatedOrders) }))
    }
  }

  return (
    <div className="page">
      <h2>Управління замовленнями</h2>
      {error && <div className="error-box">{error}</div>}
      <div className={canEdit ? 'grid-two' : 'grid-one'}>
        {canEdit && <form className="card form-grid" onSubmit={handleSubmit}>
          
          <label>
            <span>Номер замовлення (автоматично)</span>
            <input 
              value={form.order_number} 
              readOnly 
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#0f172a', fontWeight: 'bold' }}
            />
          </label>
          
          <label><span>Клієнт</span><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required/></label>
          <label><span>Статус</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">draft</option><option value="approved">approved</option><option value="in_progress">in_progress</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select></label>
          
          <label>
            <span>Відповідальний менеджер</span>
            <input 
              value={form.assigned_user_name} 
              readOnly 
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
            />
          </label>
          
          {!editingId && (
            <div className="full-width card nested-card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a' }}>Автоматизація логістики (опціонально)</h3>
              <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Заповніть ці поля, щоб система автоматично створила склад клієнта та розрахувала його координати.</p>
              <div className="form-grid">
                <label className="full-width"><span>📍 Адреса доставки (місто, вулиця)</span><input value={form.customer_location} onChange={(e) => setForm({ ...form, customer_location: e.target.value })} placeholder="Наприклад: Київ, Хрещатик 1"/></label>
                <label><span>📦 Місткість складу</span><input type="number" value={form.customer_capacity} onChange={(e) => setForm({ ...form, customer_capacity: e.target.value })} /></label>
                <label><span>👤 Відповідальний на складі</span><input value={form.customer_manager_name} onChange={(e) => setForm({ ...form, customer_manager_name: e.target.value })} placeholder="ПІБ контактної особи"/></label>
              </div>
            </div>
          )}

          <label className="full-width"><span>Примітки</span><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          
          <div className="full-width card nested-card">
            <h3>Позиції замовлення</h3>
            {form.items.map((item, index) => (
              <div key={index} className="inline-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                <select 
                  value={item.product_id || ''} 
                  onChange={(e) => handleItemChange(index, 'product_id', e.target.value)} 
                  required
                >
                  <option value="" disabled>Оберіть товар...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.price} грн)</option>
                  ))}
                </select>
                <input type="number" placeholder="Кількість" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required min="1" />
                <input 
                  type="number" 
                  placeholder="Ціна" 
                  value={item.unit_price} 
                  readOnly 
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} 
                />
              </div>
            ))}
            <button type="button" className="secondary" onClick={() => setForm({ ...form, items: [...form.items, emptyItem] })}>Додати позицію</button>
          </div>
          
          <div className="actions">
            <button type="submit">{editingId ? 'Оновити замовлення' : 'Створити замовлення'}</button>
            {editingId && <button type="button" className="secondary" onClick={handleCancelEdit}>Скасувати</button>}
          </div>
        </form>}
        
        <div className="card table-wrap">
          <table>
            {/* ОНОВЛЕНО: Додано заголовок стовпчика "Менеджер" */}
            <thead>
              <tr>
                <th>№</th>
                <th>Клієнт</th>
                <th>Менеджер</th>
                <th>Статус</th>
                <th>Сума</th>
                <th>Позиції</th>
                {(canEdit || canDelete) && <th>Дії</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.order_number}</strong></td>
                  <td>{order.customer_name}</td>
                  
                  {/* ОНОВЛЕНО: Виводимо ПІБ менеджера безпосередньо в рядок таблиці */}
                  <td>
                    {order.assigned_user?.full_name || (
                      <span className="muted" style={{ fontStyle: 'italic' }}>Не призначено</span>
                    )}
                  </td>
                  
                  <td><span className={`badge ${order.status}`}>{order.status}</span></td>
                  <td>{order.total_amount} грн</td>
                  <td>
                    {order.items.map((item) => (
                      <div key={item.id}>{item.product?.name || item.product_id}: {item.quantity} шт × {item.unit_price} грн</div>
                    ))}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="nowrap">
                      {canEdit && <button className="secondary small" onClick={() => editOrder(order)}>Редагувати</button>}
                      {canDelete && <button className="danger small" onClick={() => deleteOrder(order.id)}>Видалити</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}