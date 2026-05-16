import CrudPage from '../components/CrudPage'
import client from '../api/client'

function WarehousesMap({ items }) {
  const valid = items.filter((w) => w.latitude && w.longitude)
  const markers = valid.map((w) => `${w.latitude},${w.longitude}`).join('|')
  const first = valid[0]
  const mapUrl = first
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${first.longitude - 1},${first.latitude - 1},${first.longitude + 1},${first.latitude + 1}&layer=mapnik&marker=${first.latitude},${first.longitude}`
    : 'https://www.openstreetmap.org/export/embed.html?bbox=29.0,49.0,32.0,51.5&layer=mapnik'
  return (
    <div className="card">
      <h3>Карта складів</h3>
      <p className="muted">Для кожного складу з координатами доступне відкриття адреси на OpenStreetMap. У межах дипломного проєкту карта демонструє логістичну прив’язку складів.</p>
      <iframe className="map-frame" title="Карта складів" src={mapUrl} />
      <div className="warehouse-links">
        {valid.map((w) => <a key={w.id} target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${w.latitude}&mlon=${w.longitude}#map=13/${w.latitude}/${w.longitude}`}>📍 {w.name}</a>)}
      </div>
    </div>
  )
}

export default function WarehousesPage() {
  return (
    <CrudPage
      title="Управління складами та картою розташування"
      fields={[
        { name: 'name', label: 'Назва' },
        { name: 'location', label: 'Адреса / локація' },
        { name: 'manager_name', label: 'Відповідальний' },
        { name: 'capacity', label: 'Місткість', type: 'number' },
        { name: 'latitude', label: 'Широта', type: 'number', nullable: true },
        { name: 'longitude', label: 'Довгота', type: 'number', nullable: true },
        { name: 'status', label: 'Статус', type: 'select', options: [{ value: 'active', label: 'active' }, { value: 'reserve', label: 'reserve' }, { value: 'inactive', label: 'inactive' }] },
      ]}
      fetchAll={() => client.get('/warehouses')}
      createItem={(payload) => client.post('/warehouses', payload)}
      updateItem={(id, payload) => client.put(`/warehouses/${id}`, payload)}
      deleteItem={(id) => client.delete(`/warehouses/${id}`)}
      emptyItem={{ name: '', location: '', manager_name: '', capacity: 0, latitude: '', longitude: '', status: 'active' }}
      createRoles={['admin', 'manager']}
      editRoles={['admin', 'manager']}
      deleteRoles={['admin']}
      renderExtra={(items) => <WarehousesMap items={items} />}
    />
  )
}
