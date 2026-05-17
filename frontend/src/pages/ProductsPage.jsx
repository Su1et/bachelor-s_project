import { useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../components/RoleGate'

const generateNextSKU = (productsList) => {
  if (!productsList || productsList.length === 0) return 'LOG-001';

  let maxId = 0;
  productsList.forEach(product => {
    const match = product.sku?.match(/^LOG-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  });

  const nextId = String(maxId + 1).padStart(3, '0');
  return `LOG-${nextId}`;
};

export default function ProductsPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user, ['admin', 'manager', 'operator'])
  const canDelete = hasRole(user, ['admin'])
  
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  
  const initialFormState = { 
    sku: '', 
    name: '', 
    category: '', 
    unit: 'шт.', 
    price: '', 
    min_stock_level: '', 
    supplier_id: '', 
    description: '' 
  }
  
  const [form, setForm] = useState(initialFormState)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const load = async () => { 
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        client.get('/products'),
        client.get('/suppliers')
      ])
      const fetchedProducts = productsRes.data;
      setProducts(fetchedProducts)
      setSuppliers(suppliersRes.data)
      
      setForm(prev => {
        if (!editingId && prev.sku === '') {
          return { ...prev, sku: generateNextSKU(fetchedProducts) }
        }
        return prev;
      })
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
        price: Number(form.price),
        min_stock_level: Number(form.min_stock_level),
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null
      }

      if (editingId) await client.put(`/products/${editingId}`, payload)
      else await client.post('/products', payload)
      
      const { data: updatedProducts } = await client.get('/products')
      setProducts(updatedProducts)
      
      setForm({ ...initialFormState, sku: generateNextSKU(updatedProducts) })
      setEditingId(null); setError('')
    } catch (err) { setError(err?.response?.data?.detail || 'Помилка збереження товару') }
  }

  const editProduct = (product) => {
    setEditingId(product.id)
    setForm({ 
      sku: product.sku, 
      name: product.name, 
      category: product.category || '', 
      unit: product.unit || 'шт.', 
      price: product.price || 0, 
      min_stock_level: product.min_stock_level || 0, 
      supplier_id: product.supplier_id || '', 
      description: product.description || '' 
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ ...initialFormState, sku: generateNextSKU(products) })
  }
  
  const deleteProduct = async (id) => { 
    if (!window.confirm('Видалити товар?')) return; 
    await client.delete(`/products/${id}`); 
    
    const { data: updatedProducts } = await client.get('/products')
    setProducts(updatedProducts)
    if (!editingId) {
      setForm(prev => ({ ...prev, sku: generateNextSKU(updatedProducts) }))
    }
  }

  const getSupplierName = (supplierId) => {
    if (!supplierId) return <span className="muted">Немає</span>;
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : <span className="muted">Невідомо</span>;
  };

  return (
    <div className="page">
      <h2>Управління товарами</h2>
      {error && <div className="error-box">{error}</div>}
      <div className={canEdit ? 'grid-two' : 'grid-one'}>
        {canEdit && (
          <form className="card form-grid" onSubmit={handleSubmit}>
            
            <label>
              <span>SKU (Артикул)</span>
              <input 
                value={form.sku} 
                readOnly 
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#0f172a', fontWeight: 'bold' }}
                title="Генерується автоматично"
              />
            </label>
            
            <label><span>Назва товару</span><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required/></label>
            <label><span>Категорія</span><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Наприклад: Фарби"/></label>
            <label><span>Одиниця виміру</span><input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="шт., кг, літр"/></label>
            <label><span>Ціна (грн)</span><input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required/></label>
            <label><span>Мін. залишок</span><input type="number" min="0" value={form.min_stock_level} onChange={e => setForm({...form, min_stock_level: e.target.value})} required/></label>
            
            <label className="full-width">
              <span>Постачальник</span>
              <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} required>
                <option value="" disabled>Оберіть постачальника...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.contact_person || 'без контакту'})</option>
                ))}
              </select>
            </label>

            <label className="full-width"><span>Опис</span><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
            
            <div className="actions">
              <button type="submit">{editingId ? 'Оновити товар' : 'Створити товар'}</button>
              {editingId && <button type="button" className="secondary" onClick={handleCancelEdit}>Скасувати</button>}
            </div>
          </form>
        )}
        
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Назва</th>
                <th>Категорія</th>
                <th>Одиниця</th>
                <th>Ціна</th>
                <th>Мін. залишок</th>
                <th>Постачальник</th>
                <th>Опис</th>
                {(canEdit || canDelete) && <th>Дії</th>}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.sku}</strong></td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.unit}</td>
                  <td>{p.price} грн</td>
                  <td>{p.min_stock_level}</td>
                  
                  <td>{getSupplierName(p.supplier_id)}</td>
                  
                  <td>{p.description}</td>
                  {(canEdit || canDelete) && (
                    <td className="nowrap">
                      {canEdit && <button className="secondary small" onClick={() => editProduct(p)}>Редагувати</button>}
                      {canDelete && <button className="danger small" onClick={() => deleteProduct(p.id)}>Видалити</button>}
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