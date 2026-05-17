import { useState } from 'react'
import CrudPage from '../components/CrudPage'
import client from '../api/client'

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

function WarehousesMap({ items }) {
  const valid = items.filter((w) => w.latitude && w.longitude)
  const [selectedWarehouse, setSelectedWarehouse] = useState(valid[0] || null)

  const mapUrl = selectedWarehouse
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedWarehouse.longitude - 0.5},${selectedWarehouse.latitude - 0.5},${selectedWarehouse.longitude + 0.5},${selectedWarehouse.latitude + 0.5}&layer=mapnik&marker=${selectedWarehouse.latitude},${selectedWarehouse.longitude}`
    : 'https://www.openstreetmap.org/export/embed.html?bbox=29.0,49.0,32.0,51.5&layer=mapnik'

  return (
    <div className="card">
      <h3>Карта складів</h3>
      <p className="muted">Натисніть на назву складу нижче, щоб показати його розташування на карті.</p>
      
      <iframe className="map-frame" title="Карта складів" src={mapUrl} />
      
      <div className="warehouse-links" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
        {valid.map((w) => (
          <button 
            key={w.id} 
            onClick={() => setSelectedWarehouse(w)}
            className={selectedWarehouse?.id === w.id ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ cursor: 'pointer', padding: '5px 10px' }}
          >
            📍 {w.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function WarehousesPage() {
  
  const handleCreate = async (payload) => {
    if (payload.location && (!payload.latitude || !payload.longitude)) {
      const coords = await geocodeAddress(payload.location);
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      } else {
        alert('Системі не вдалося автоматично знайти координати для цієї адреси на карті. Запис буде збережено без них.');
      }
    }
    return client.post('/warehouses', payload);
  };

  const handleUpdate = async (id, payload) => {
    if (payload.location && (!payload.latitude || !payload.longitude)) {
      const coords = await geocodeAddress(payload.location);
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      }
    }
    return client.put(`/warehouses/${id}`, payload);
  };

  return (
    <CrudPage
      title="Управління складами та картою розташування"
      fields={[
        { name: 'name', label: 'Назва' },
        { name: 'location', label: 'Адреса (наприклад: Київ, Хрещатик 1)' },
        { name: 'type', label: 'Тип складу', type: 'select', options: [
          { value: 'internal', label: 'Власний склад' },
          { value: 'client', label: 'Клієнт' },
          { value: 'supplier', label: 'Постачальник' }
        ] },
        { name: 'manager_name', label: 'Відповідальний' },
        { name: 'capacity', label: 'Місткість', type: 'number' },
        { name: 'latitude', label: 'Широта (визначається автоматично)', type: 'number', nullable: true },
        { name: 'longitude', label: 'Довгота (визначається автоматично)', type: 'number', nullable: true },
        { name: 'status', label: 'Статус', type: 'select', options: [{ value: 'active', label: 'active' }, { value: 'reserve', label: 'reserve' }, { value: 'inactive', label: 'inactive' }], 
          render: (item) => <span className={`badge ${item.status}`}>{item.status}</span>},
      ]}
      fetchAll={() => client.get('/warehouses')}
      createItem={handleCreate}
      updateItem={handleUpdate}
      deleteItem={(id) => client.delete(`/warehouses/${id}`)}
      emptyItem={{ name: '', location: '', type: 'internal', manager_name: '', capacity: 0, latitude: '', longitude: '', status: 'active' }}
      createRoles={['admin', 'manager']}
      editRoles={['admin', 'manager']}
      deleteRoles={['admin']}
      renderExtra={(items) => <WarehousesMap items={items} />}
    />
  )
}