import { useEffect, useState, useRef } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import client from '../api/client'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const dashboardRef = useRef(null)

  useEffect(() => {
    client.get('/dashboard/summary')
      .then((res) => setData(res.data))
      .catch(() => setError('Не вдалося завантажити дашборд'))
  }, [])

  const exportToPDF = async () => {
    setIsExporting(true)
    try {
      const element = dashboardRef.current
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#f8fafc'
      })  
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`LogiCore_Report_${new Date().toLocaleDateString('uk-UA')}.pdf`)
    } catch (err) {
      console.error('Помилка генерації PDF:', err)
      alert('Не вдалося згенерувати PDF-звіт.')
    } finally {
      setIsExporting(false)
    }
  }

  if (error) return <div className="page"><div className="error-box">{error}</div></div>
  if (!data) return <div className="page"><p>Завантаження дашборду...</p></div>

  const cards = [
    ['Товари', data.products], ['Постачальники', data.suppliers], ['Склади', data.warehouses],
    ['Усі замовлення', data.orders], ['Активні замовлення', data.active_orders], ['Запасів, од.', data.inventory_units],
    ['Операції руху', data.movements], ['Критичні залишки', data.low_stock_products], ['Сер. час переміщення', `${data.avg_transfer_minutes} хв`],
    ['Сума замовлень', `${data.order_revenue} грн`]
  ]

  return (
    <div className="page" ref={dashboardRef} style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
      <div className="hero-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>Аналітична панель LogiCore OMS</h2>
          <p style={{ margin: 0 }}>Веб-орієнтована CRM/ERP-система для логістично-складської компанії: склади, товари, постачальники, запаси, переміщення, замовлення, карта складів і KPI.</p>
        </div>
        <button 
          onClick={exportToPDF} 
          disabled={isExporting}
          style={{
            backgroundColor: isExporting ? '#94a3b8' : '#ffffff',
            color: isExporting ? '#ffffff' : '#1e40af',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
          }}
        >
          {isExporting ? '⏳ Формування PDF...' : '📄 Завантажити звіт (PDF)'}
        </button>
      </div>

      <div className="stats-grid">
        {cards.map(([label, value]) => (
          <div className="card stat-card" key={label}>
            <div className="muted">{label}</div>
            <div className="big-number">{value}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px' }}>
        
        <div className="card chart-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '0' }}>Товари за категоріями</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={data.charts.products_by_category} 
                  dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90} fill="#8884d8" 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.charts.products_by_category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '0' }}>Залишки за складами (од.)</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.stock_by_warehouse} margin={{ top: 20, right: 30, left: 0, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" angle={-35} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#82ca9d" name="Кількість запасів" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '0' }}>Замовлення за статусами</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                <Pie 
                  data={data.charts.orders_by_status} 
                  dataKey="value" nameKey="label" cx="50%" cy="45%" innerRadius={60} outerRadius={85} fill="#8884d8" label
                >
                  {data.charts.orders_by_status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '0' }}>Операції руху запасів</h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.movements_by_type} layout="vertical" margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="label" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#FF8042" name="Кількість операцій" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Товари з критичним залишком</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Товар</th><th>Поточний залишок</th><th>Мінімальний рівень</th></tr>
            </thead>
            <tbody>
              {data.low_stock_items.length === 0 && <tr><td colSpan="3">Критичних залишків немає</td></tr>}
              {data.low_stock_items.map((item) => (
                <tr key={item.name} style={{ color: item.quantity === 0 ? 'red' : 'inherit' }}>
                  <td>{item.name}</td>
                  <td><strong>{item.quantity}</strong></td>
                  <td>{item.min_stock_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}