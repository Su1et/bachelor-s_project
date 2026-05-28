import { useEffect, useState, Fragment } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import client from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../components/RoleGate'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TYPE_LABELS = {
  'in': 'Надходження',
  'out': 'Списання',
  'transfer': 'Переміщення',
  'return': 'Повернення'
}

const STATUS_BADGE_COLORS = {
  'planned': 'badge-secondary',
  'in_transit': 'badge-warning',
  'completed': 'badge-success',
  'cancelled': 'badge-danger'
}

function MovementRouteMap({ startLat, startLng, endLat, endLng, sourceName, destName }) {
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [loadingRoute, setLoadingRoute] = useState(true)

  useEffect(() => {
    if (!startLat || !startLng || !endLat || !endLng) return;

    setLoadingRoute(true)
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]])
          setRouteCoordinates(coords)
        } else {
          setRouteCoordinates([[startLat, startLng], [endLat, endLng]])
        }
      })
      .catch(() => {
        setRouteCoordinates([[startLat, startLng], [endLat, endLng]])
      })
      .finally(() => setLoadingRoute(false))
  }, [startLat, startLng, endLat, endLng])

  return (
    <MapContainer 
      center={[(startLat + endLat) / 2, (startLng + endLng) / 2]} 
      zoom={6} 
      style={{ height: '320px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      <Marker position={[startLat, startLng]}>
        <Popup>
          <strong>Відправник:</strong><br /> {sourceName}
        </Popup>
      </Marker>
      
      <Marker position={[endLat, endLng]}>
        <Popup>
          <strong>Отримувач:</strong><br /> {destName}
        </Popup>
      </Marker>

      {!loadingRoute && routeCoordinates.length > 0 && (
        <Polyline 
          positions={routeCoordinates} 
          pathOptions={{ 
            color: '#2563eb', 
            weight: 5, 
            opacity: 0.85,
            lineJoin: 'round'
          }} 
        />
      )}
    </MapContainer>
  )
}

export default function MovementsPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user, ['admin', 'manager', 'warehouse'])
  
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [expandedRowId, setExpandedRowId] = useState(null)
  
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
            <em>(Для статусу «В дорозі» доступна візуалізація прокладеного маршруту)</em>
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
                <th style={{ textAlign: 'center' }}>Статус</th>
                <th>Відстань</th>
                <th>Час</th>
                <th>Коментар</th>
                {canEdit && <th>Дії</th>}
              </tr>
            </thead>
            <tbody>
              {movements.map(item => {
                const isExpandable = item.movement_type === 'transfer' && item.status === 'in_transit';
                
                const startLat = item.source_warehouse?.latitude;
                const startLng = item.source_warehouse?.longitude;
                const endLat = item.destination_warehouse?.latitude;
                const endLng = item.destination_warehouse?.longitude;
                const hasCoordinates = startLat && startLng && endLat && endLng;

                return (
                  <Fragment key={item.id}>
                    <tr>
                      <td><strong>{item.product?.name || `ID: ${item.product_id}`}</strong> <br/><span className="muted" style={{ fontSize: '0.8rem' }}>{item.product?.sku}</span></td>
                      <td>{TYPE_LABELS[item.movement_type] || item.movement_type}</td>
                      <td>{item.quantity} {item.product?.unit}</td>
                      <td>{item.source_warehouse?.name || <span className="muted">—</span>}</td>
                      <td>{item.destination_warehouse?.name || <span className="muted">—</span>}</td>                 
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '5px', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: '100%' 
                        }}>
                          <span className={`badge ${STATUS_BADGE_COLORS[item.status] || ''}`} style={{ margin: 0 }}>
                            {item.status}
                          </span>
                          {isExpandable && hasCoordinates && (
                            <button 
                              className="secondary small"
                              style={{ 
                                padding: '2px 6px', 
                                fontSize: '0.75rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '3px',
                                margin: 0 
                              }}
                              onClick={() => setExpandedRowId(expandedRowId === item.id ? null : item.id)}
                            >
                              {expandedRowId === item.id ? '▲ Сховати' : '▼ Маршрут'}
                            </button>
                          )}
                        </div>
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

                    {expandedRowId === item.id && isExpandable && hasCoordinates && (
                      <tr>
                        <td colSpan={canEdit ? 10 : 9} style={{ backgroundColor: '#f8fafc', padding: '15px' }}>
                          <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ padding: '8px 12px', backgroundColor: '#e2e8f0', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Перегляд маршруту</span>
                              <span style={{ color: '#2563eb' }}>Маршрут: {item.source_warehouse.name} ➔ {item.destination_warehouse.name}</span>
                            </div>
                            
                            <MovementRouteMap 
                              startLat={startLat}
                              startLng={startLng}
                              endLat={endLat}
                              endLng={endLng}
                              sourceName={item.source_warehouse.name}
                              destName={item.destination_warehouse.name}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}