import { useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../components/RoleGate'

export default function InventoryPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user, ['admin', 'manager', 'warehouse'])
  const canDelete = hasRole(user, ['admin'])
  
  const [inventory, setInventory] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  
  const initialFormState = { product_id: '', warehouse_id: '', quantity: 0 }
  
  const [form, setForm] = useState(initialFormState)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => { 
    try {
      const [invRes, prodRes, whRes] = await Promise.all([
        client.get('/inventory'),
        client.get('/products'),
        client.get('/warehouses')
      ])
      setInventory(invRes.data)
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
        product_id: Number(form.product_id), 
        warehouse_id: Number(form.warehouse_id), 
        quantity: Number(form.quantity) 
      }

      if (editingId) await client.put(`/inventory/${editingId}`, payload)
      else await client.post('/inventory', payload)
      
      setForm(initialFormState)
      setEditingId(null); setError(''); await load()
    } catch (err) { setError(err?.response?.data?.detail || 'Помилка збереження запису') }
  }

  const editItem = (item) => {
    setEditingId(item.id)
    setForm({ 
      product_id: item.product_id, 
      warehouse_id: item.warehouse_id, 
      quantity: item.quantity 
    })
  }
  
  const deleteItem = async (id) => { 
    if (!window.confirm('Видалити цей запис про залишок?')) return; 
    await client.delete(`/inventory/${id}`); 
    await load() 
  }

  const productTotals = {};
  inventory.forEach(item => {
    if (!productTotals[item.product_id]) {
      productTotals[item.product_id] = 0;
    }
    productTotals[item.product_id] += item.quantity;
  });

  return (
    <div className="page">
      <h2>Управління залишками на складах</h2>
      {error && <div className="error-box">{error}</div>}
      <div className={canEdit ? 'grid-two' : 'grid-one'}>
        {canEdit && (
          <form className="card form-grid" onSubmit={handleSubmit}>
            
            <label className="full-width">
              <span>Товар</span>
              <select 
                value={form.product_id} 
                onChange={e => setForm({...form, product_id: e.target.value})} 
                required
                disabled={!!editingId}
                style={editingId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                <option value="" disabled>Оберіть товар...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                ))}
              </select>
            </label>

            <label className="full-width">
              <span>Склад</span>
              <select 
                value={form.warehouse_id} 
                onChange={e => setForm({...form, warehouse_id: e.target.value})} 
                required
                disabled={!!editingId}
                style={editingId ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                <option value="" disabled>Оберіть склад...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.location || w.type})</option>
                ))}
              </select>
            </label>
            
            <label>
              <span>Кількість</span>
              <input 
                type="number" 
                min="0"
                value={form.quantity} 
                onChange={e => setForm({...form, quantity: e.target.value})} 
                required
              />
            </label>
            
            <div className="actions full-width" style={{ marginTop: '10px' }}>
              <button type="submit">{editingId ? 'Оновити кількість' : 'Додати залишок'}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(initialFormState) }}>Скасувати</button>}
            </div>
          </form>
        )}
        
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Склад</th>
                <th>Кількість</th>
                {(canEdit || canDelete) && <th>Дії</th>}
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const totalQuantity = productTotals[item.product_id] || 0;
                
                const isLowStock = totalQuantity === 0 || (item.product && totalQuantity <= item.product.min_stock_level);
                
                return (
                  <tr key={item.id}>
                    <td><strong>{item.product?.name || `ID: ${item.product_id}`}</strong> <span className="muted">({item.product?.sku})</span></td>
                    <td>{item.warehouse?.name || `ID: ${item.warehouse_id}`}</td>
                    <td>
                      <span className="badge" style={{ 
                        backgroundColor: isLowStock ? '#fee2e2' : '#dcfce7', 
                        color: isLowStock ? '#ef4444' : '#16a34a', 
                        fontSize: '14px' 
                      }} title={`Загальний залишок по всіх складах: ${totalQuantity}`}>
                        {item.quantity} {item.product?.unit || 'шт.'}
                      </span>
                    </td>
                    
                    {(canEdit || canDelete) && (
                      <td className="nowrap">
                        {canEdit && <button className="secondary small" onClick={() => editItem(item)}>Редагувати</button>}
                        {canDelete && <button className="danger small" onClick={() => deleteItem(item.id)}>Видалити</button>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}