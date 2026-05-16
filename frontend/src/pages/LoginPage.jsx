import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('admin@ops.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Помилка входу')
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>Operations Management System</h1>
        <p className="muted">Вхід до веб-орієнтованої системи управління операційними процесами</p>
        {error && <div className="error-box">{error}</div>}
        <label>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span>Пароль</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit">Увійти</button>
        <div className="demo-box">
          <strong>Тестові акаунти:</strong>
          <div>admin@ops.com / admin123</div>
          <div>manager@ops.com / manager123</div>
          <div>warehouse@ops.com / warehouse123</div>
          <div>analyst@ops.com / analyst123</div>
        </div>
      </form>
    </div>
  )
}
