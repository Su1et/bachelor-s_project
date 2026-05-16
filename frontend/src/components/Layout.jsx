import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from './RoleGate'

const navItems = [
  ['/', 'Дашборд', ['admin', 'manager', 'warehouse', 'analyst', 'operator']],
  ['/products', 'Товари', ['admin', 'manager', 'warehouse', 'analyst', 'operator']],
  ['/suppliers', 'Постачальники', ['admin', 'manager']],
  ['/warehouses', 'Склади / карта', ['admin', 'manager', 'warehouse', 'analyst', 'operator']],
  ['/inventory', 'Запаси', ['admin', 'manager', 'warehouse', 'analyst']],
  ['/movements', 'Рух запасів', ['admin', 'manager', 'warehouse', 'analyst']],
  ['/orders', 'Замовлення', ['admin', 'manager', 'operator', 'analyst']],
  ['/users', 'Користувачі', ['admin']]
]

export default function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>LogiCore OMS</h1>
        <p className="muted-light">CRM/ERP для логістично-складської компанії</p>
        <nav>
          {navItems.filter(([, , roles]) => hasRole(user, roles)).map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div><strong>{user?.full_name}</strong><div className="muted">Роль: {user?.role}</div></div>
          <button onClick={logout}>Вийти</button>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
