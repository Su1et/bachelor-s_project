import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './styles.css'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import SuppliersPage from './pages/SuppliersPage'
import WarehousesPage from './pages/WarehousesPage'
import InventoryPage from './pages/InventoryPage'
import MovementsPage from './pages/MovementsPage'
import OrdersPage from './pages/OrdersPage'
import UsersPage from './pages/UsersPage'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="warehouses" element={<WarehousesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
