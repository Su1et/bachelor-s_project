import { useEffect, useState } from 'react'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../components/RoleGate'

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
    console.error('Помилка геокодування:', error);
  }
  return null;
};

export default function SuppliersPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user, ['admin', 'manager'])
  const canDelete = hasRole(user, ['admin'])
  
  const [suppliers, setSuppliers] = useState([])
  const initialFormState = { name: '', contact_person: '', email: '', phone: '', address: '', capacity: 1000, notes: '' }
  const [form, setForm] = useState(initialFormState)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const load = async () => { 
    try {
      const { data } = await client.get('/suppliers')
      setSuppliers(data)
    } catch {
      setError('Не вдалося завантажити постачальників')
    }
  }
  
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, capacity: Number(form.capacity) }
      
      if (!editingId && payload.address) {
        const coords = await geocodeAddress(payload.address);
        if (coords) {
          payload.latitude = coords.latitude;
          payload.longitude = coords.longitude;
        }
      }

      if (editingId) await client.put(`/suppliers/${editingId}`, payload)
      else await client.post('/suppliers', payload)
      
      setForm(initialFormState)
      setEditingId(null); setError(''); await load()
    } catch (err) { setError(err?.response?.data?.detail || 'Помилка збереження') }
  }

  const editSupplier = (item) => {
    setEditingId(item.id)
    setForm({ 
      name: item.name, 
      contact_person: item.contact_person || '', 
      email: item.email || '', 
      phone: item.phone || '', 
      address: item.address || '', 
      capacity: item.capacity || 1000, 
      notes: item.notes || '' 
    })
  }

  const deleteSupplier = async (id) => { 
    if (!window.confirm('Видалити постачальника?')) return; 
    await client.delete(`/suppliers/${id}`); 
    await load();
  }

  return (
    <div className="page">
      <h2>Управління постачальниками</h2>
      {error && <div className="error-box">{error}</div>}
      <div className={canEdit ? 'grid-two' : 'grid-one'}>
        {canEdit && (
          <form className="card form-grid" onSubmit={handleSubmit}>
            <label><span>Назва компанії</span><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required/></label>
            <label><span>Контактна особа</span><input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} placeholder="Наприклад: Дмитро Савчук" /></label>
            <label><span>Email</span><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
            <label><span>Телефон</span><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></label>
            
            <div className="full-width card nested-card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a' }}>Локація (Склад постачальника)</h3>
              <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
                {editingId ? "Дані складу фіксуються при створенні і не підлягають зміні." : "Ці дані будуть використані для автоматичного створення складу."}
              </p>
              <div className="form-grid">
                <label className="full-width">
                  <span>📍 Адреса</span>
                  <input 
                    value={form.address} 
                    onChange={e => setForm({...form, address: e.target.value})} 
                    readOnly={!!editingId}
                    style={editingId ? { backgroundColor: '#e2e8f0', cursor: 'not-allowed', color: '#64748b' } : {}}
                    title={editingId ? "Адресу не можна змінити після створення" : ""}
                  />
                </label>
                <label>
                  <span>📦 Місткість складу</span>
                  <input 
                    type="number" 
                    value={form.capacity} 
                    onChange={e => setForm({...form, capacity: e.target.value})} 
                    readOnly={!!editingId}
                    style={editingId ? { backgroundColor: '#e2e8f0', cursor: 'not-allowed', color: '#64748b' } : {}}
                  />
                </label>
              </div>
            </div>

            <label className="full-width"><span>Примітки</span><input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></label>
            
            <div className="actions">
              <button type="submit">{editingId ? 'Оновити постачальника' : 'Створити постачальника'}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(initialFormState) }}>Скасувати</button>}
            </div>
          </form>
        )}
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Назва</th><th>Контактна особа</th><th>Email</th><th>Телефон</th><th>Адреса складу</th><th>Примітки</th>{(canEdit || canDelete) && <th>Дії</th>}</tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.contact_person}</td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{s.address}</td>
                  <td>{s.notes}</td>
                  {(canEdit || canDelete) && (
                    <td className="nowrap">
                      {canEdit && <button className="secondary small" onClick={() => editSupplier(s)}>Редагувати</button>}
                      {canDelete && <button className="danger small" onClick={() => deleteSupplier(s.id)}>Видалити</button>}
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