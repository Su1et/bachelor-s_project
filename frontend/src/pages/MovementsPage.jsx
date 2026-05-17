import { useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../components/RoleGate'

const TYPE_LABELS = {
  'in': 'Надходження',
  'out': 'Списання',
  'transfer': 'Переміщення',
  'return': 'Повернення'
}

const STATUS_BADGE_COLORS = {
  'planned': 'badge-secondary',     // Сірий
  'in_transit': 'badge-warning',    // Жовтий/Оранжевий
  'completed': 'badge-success',     // Зелений
  'cancelled': 'badge-danger'       // Червоний
}

export default function MovementsPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user, ['admin', 'manager', 'warehouse'])
  
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  
  const initialFormState = { 
    product_id: '', 
    movement_type: 'transfer', 
    quantity: 1, 
    source_warehouse_id: '', 
    destination_warehouse_id: '', 
    status: 'planned', 
    comment: '' 
  }
  
  const [form, setForm] = useState(initialFormState)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => { 
    try {
      const [movRes, prodRes, whRes] = await Promise.all([
        client.get('/inventory/movements'),
        client.get('/products'),
        client.get('/warehouses')
      ])
      setMovements(movRes.data)
      setProducts(prodRes.data)
      setWarehouses(whRes.data)
    } catch {
      setError('Не вдалося завантажити дані')
    }
  }
  
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { 
        ...form,
        product_id: Number(form.product_id), 
        quantity: Number(form.quantity),
        source_warehouse_id: form.source_warehouse_id ? Number(form.source_warehouse_id) : null,
        destination_warehouse_id: form.destination_warehouse_id ? Number(form.destination_warehouse_id) : null
      }

      if (editingId) await client.put(`/inventory/movements/${editingId}`, payload)
      else await client.post('/inventory/movements', payload)
      
      setForm(initialFormState)
      setEditingId(null); setError(''); await load()
    } catch (err) { setError(err?.response?.data?.detail || 'Помилка збереження руху запасів') }
  }

  const editItem = (item) => {
    setEditingId(item.id)
    setForm({ 
      product_id: item.product_id, 
      movement_type: item.movement_type, 
      quantity: item.quantity,
      source_warehouse_id: item.source_warehouse_id || '',
      destination_warehouse_id: item.destination_warehouse_id || '',
      status: item.status,
      comment: item.comment || ''
    })
  }

  return (
    <div className="page">
      <h2>Рух запасів і розрахунок часу переміщення</h2>
      
      <div className="card info-card" style={{ marginBottom: '20px', backgroundColor: '#f0f9ff', borderLeft: '4px solid #0ea5e9' }}>
        <strong>Унікальний функціонал:</strong> для переміщення між складами система автоматично розраховує відстань за координатами складів і орієнтовний час доставки.
      </div>

      {error && <div className="error-box">{error}</div>}
      
      <div className={canEdit ? 'grid-two' : 'grid-one'}>
        {canEdit && (
          <form className="card form-grid" onSubmit={handleSubmit}>
            
            <label className="full-width">
              <span>Товар {editingId && <span className="muted">(не змінюється)</span>}</span>
              <select 
                value={form.product_id} 
                onChange={e => setForm({...form, product_id: e.target.value})} 
                required
                disabled={!!editingId}
                style={editingId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                <option value="" disabled>Оберіть товар...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
              </select>
            </label>

            <label>
              <span>Тип операції {editingId && <span className="muted">(не змінюється)</span>}</span>
              <select 
                value={form.movement_type} 
                onChange={e => setForm({...form, movement_type: e.target.value})}
                disabled={!!editingId}
                style={editingId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                <option value="in">Надходження</option>
                <option value="out">Списання</option>
                <option value="transfer">Переміщення</option>
                <option value="return">Повернення</option>
              </select>
            </label>

            <label>
              <span>Кількість {editingId && <span className="muted">(не змінюється)</span>}</span>
              <input 
                type="number" min="1"
                value={form.quantity} 
                onChange={e => setForm({...form, quantity: e.target.value})} 
                required
                readOnly={!!editingId}
                style={editingId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              />
            </label>

            <label className="full-width">
              <span>Склад-відправник {editingId && <span className="muted">(не змінюється)</span>}</span>
              <select 
                value={form.source_warehouse_id} 
                onChange={e => setForm({...form, source_warehouse_id: e.target.value})}
                disabled={!!editingId}
                style={editingId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                <option value="">— Немає (зовнішнє надходження) —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>

            <label className="full-width">
              <span>Склад-отримувач {editingId && <span className="muted">(не змінюється)</span>}</span>
              <select 
                value={form.destination_warehouse_id} 
                onChange={e => setForm({...form, destination_warehouse_id: e.target.value})}
                disabled={!!editingId}
                style={editingId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                <option value="">— Немає (зовнішнє списання) —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label>
              <span>Статус</span>
              <select 
                value={form.status} 
                onChange={e => setForm({...form, status: e.target.value})}
                style={{ border: editingId ? '2px solid #3b82f6' : '' }}
              >
                <option value="planned">Заплановано (planned)</option>
                <option value="in_transit">В дорозі (in_transit)</option>
                <option value="completed">Виконано (completed)</option>
                <option value="cancelled">Скасовано (cancelled)</option>
              </select>
            </label>

            <label className="full-width">
              <span>Коментар</span>
              <input 
                value={form.comment} 
                onChange={e => setForm({...form, comment: e.target.value})} 
                placeholder="Причина переміщення або номер авто"
                style={{ border: editingId ? '2px solid #3b82f6' : '' }}
              />
            </label>
            
            <div className="actions full-width" style={{ marginTop: '10px' }}>
              <button type="submit">{editingId ? 'Оновити статус' : 'Створити рух'}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(initialFormState) }}>Скасувати</button>}
            </div>
          </form>
        )}
        
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Тип</th>
                <th>Кількість</th>
                <th>Відправник</th>
                <th>Отримувач</th>
                <th>Статус</th>
                <th>Відстань</th>
                <th>Час</th>
                <th>Коментар</th>
                {canEdit && <th>Дії</th>}
              </tr>
            </thead>
            <tbody>
              {movements.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.product?.name || `ID: ${item.product_id}`}</strong> <br/><span className="muted" style={{ fontSize: '0.8rem' }}>{item.product?.sku}</span></td>
                  <td>{TYPE_LABELS[item.movement_type] || item.movement_type}</td>
                  <td>{item.quantity} {item.product?.unit}</td>
                  <td>{item.source_warehouse?.name || <span className="muted">—</span>}</td>
                  <td>{item.destination_warehouse?.name || <span className="muted">—</span>}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE_COLORS[item.status] || ''}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.distance_km ? `${item.distance_km} км` : <span className="muted">—</span>}</td>
                  <td>{item.estimated_minutes ? `${item.estimated_minutes} хв` : <span className="muted">—</span>}</td>
                  <td>{item.comment}</td>
                  
                  {canEdit && (
                    <td className="nowrap">
                      <button className="secondary small" onClick={() => editItem(item)}>Редагувати</button>
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