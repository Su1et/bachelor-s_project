import { useEffect, useState } from 'react'
import client from '../api/client'

function MiniBarChart({ title, data }) {
  const max = Math.max(...(data || []).map((x) => Number(x.value)), 1)
  return (
    <div className="card chart-card">
      <h3>{title}</h3>
      <div className="bar-list">
        {(data || []).map((row) => (
          <div className="bar-row" key={row.label}>
            <span>{row.label}</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max((Number(row.value) / max) * 100, 4)}%` }} /></div>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/dashboard/summary').then((res) => setData(res.data)).catch(() => setError('Не вдалося завантажити дашборд'))
  }, [])

  if (error) return <div className="page"><div className="error-box">{error}</div></div>
  if (!data) return <div className="page"><p>Завантаження дашборду...</p></div>

  const cards = [
    ['Товари', data.products], ['Постачальники', data.suppliers], ['Склади', data.warehouses],
    ['Усі замовлення', data.orders], ['Активні замовлення', data.active_orders], ['Запасів, од.', data.inventory_units],
    ['Операції руху', data.movements], ['Критичні залишки', data.low_stock_products], ['Сер. час переміщення', `${data.avg_transfer_minutes} хв`],
    ['Сума замовлень', `${data.order_revenue} грн`]
  ]

  return (
    <div className="page">
      <div className="hero-card">
        <h2>Аналітична панель LogiCore OMS</h2>
        <p>Веб-орієнтована CRM/ERP-система для логістично-складської компанії: склади, товари, постачальники, запаси, переміщення, замовлення, карта складів і KPI.</p>
      </div>
      <div className="stats-grid">
        {cards.map(([label, value]) => <div className="card stat-card" key={label}><div className="muted">{label}</div><div className="big-number">{value}</div></div>)}
      </div>
      <div className="charts-grid">
        <MiniBarChart title="Товари за категоріями" data={data.charts.products_by_category} />
        <MiniBarChart title="Залишки за складами" data={data.charts.stock_by_warehouse} />
        <MiniBarChart title="Замовлення за статусами" data={data.charts.orders_by_status} />
        <MiniBarChart title="Операції руху запасів" data={data.charts.movements_by_type} />
      </div>
      <div className="card">
        <h3>Товари з критичним залишком</h3>
        <div className="table-wrap">
          <table><thead><tr><th>Товар</th><th>Поточний залишок</th><th>Мінімальний рівень</th></tr></thead><tbody>
            {data.low_stock_items.length === 0 && <tr><td colSpan="3">Критичних залишків немає</td></tr>}
            {data.low_stock_items.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.quantity}</td><td>{item.min_stock_level}</td></tr>)}
          </tbody></table>
        </div>
      </div>
    </div>
  )
}
