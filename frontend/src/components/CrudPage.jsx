import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from './RoleGate'

export default function CrudPage({ title, fields, fetchAll, createItem, updateItem, deleteItem, emptyItem, createRoles = [], editRoles = [], deleteRoles = [], renderExtra = null }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyItem)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const canCreate = hasRole(user, createRoles)
  const canEdit = hasRole(user, editRoles)
  const canDelete = hasRole(user, deleteRoles)
  const canShowForm = canCreate || (editingId && canEdit)

  const load = async () => {
    try {
      const { data } = await fetchAll()
      setItems(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Помилка завантаження')
    }
  }

  useEffect(() => { load() }, [])

  const handleChange = (field, value) => {
    let next = value
    if (field.type === 'number') next = value === '' ? null : Number(value)
    setForm((prev) => ({ ...prev, [field.name]: next }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form }
      fields.filter((field) => field.form !== false).forEach((field) => {
        if (field.nullable && payload[field.name] === '') payload[field.name] = null
      })
      if (editingId) await updateItem(editingId, payload)
      else await createItem(payload)
      setForm(emptyItem)
      setEditingId(null)
      setError('')
      await load()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Помилка збереження')
    }
  }

  const onEdit = (item) => {
    setEditingId(item.id)
    const nextForm = {}
    fields.filter((field) => field.form !== false).forEach((field) => { nextForm[field.name] = item[field.name] ?? '' })
    setForm(nextForm)
  }

  const onDelete = async (id) => {
    if (!window.confirm('Видалити запис?')) return
    try { await deleteItem(id); await load() }
    catch (err) { setError(err?.response?.data?.detail || 'Помилка видалення') }
  }

  return (
    <div className="page">
      <h2>{title}</h2>
      {error && <div className="error-box">{error}</div>}
      {renderExtra?.(items)}
      <div className={canShowForm ? 'grid-two' : 'grid-one'}>
        {canShowForm && (
          <form className="card form-grid" onSubmit={onSubmit}>
            {fields.filter((field) => field.form !== false).map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                {field.type === 'select' ? (
                  <select value={form[field.name] ?? ''} onChange={(e) => handleChange(field, e.target.value)}>
                    <option value="">Оберіть</option>
                    {field.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea value={form[field.name] ?? ''} onChange={(e) => handleChange(field, e.target.value)} />
                ) : (
                  <input type={field.type || 'text'} value={form[field.name] ?? ''} onChange={(e) => handleChange(field, e.target.value)} />
                )}
              </label>
            ))}
            <div className="actions">
              <button type="submit">{editingId ? 'Оновити' : 'Створити'}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyItem) }}>Скасувати</button>}
            </div>
          </form>
        )}
        <div className="card table-wrap">
          <table>
            <thead><tr>{fields.map((field) => <th key={field.name}>{field.label}</th>)}{(canEdit || canDelete) && <th>Дії</th>}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {fields.map((field) => <td key={field.name}>{field.render ? field.render(item) : String(item[field.name] ?? '')}</td>)}
                  {(canEdit || canDelete) && <td className="nowrap">
                    {canEdit && <button className="secondary small" onClick={() => onEdit(item)}>Редагувати</button>}
                    {canDelete && <button className="danger small" onClick={() => onDelete(item.id)}>Видалити</button>}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
