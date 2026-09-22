import { useEffect, useState } from 'react'
import './App.css'

const ADMIN_PASSWORD = '0011'
const API_BASE_URL = 'http://localhost:5001/api'

const stats = [
  { label: 'Ministries', value: '0', change: 'No data yet' },
  { label: 'Institutions', value: '0', change: 'No data yet' },
  { label: 'New Updates', value: '0', change: 'Waiting for entries' },
  { label: 'Admin Users', value: '1', change: 'System ready' },
]

const quickActions = ['Add Ministry', 'Add Institution', 'Publish Update', 'Export CSV']

const ministries = []

const institutions = []

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [ministerForm, setMinisterForm] = useState({ name: '', description: '' })
  const [editingMinisterId, setEditingMinisterId] = useState(null)
  const [ministriesList, setMinistriesList] = useState([])

  const [registeredUsers, setRegisteredUsers] = useState([
    { name: 'Admin', password: ADMIN_PASSWORD, role: 'Admin' },
    { name: 'Sample User 01', password: 'sample123', role: 'Editor' },
  ])

  const [formData, setFormData] = useState({ name: '', password: '', role: 'Editor' })
  const [message, setMessage] = useState('Admin password is fixed as 0011 for this demo.')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users`)
        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.message || 'Unable to load users')
        }

        const users = await response.json()
        if (users.length > 0) {
          setRegisteredUsers(users)
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
        setMessage(error.message)
      }
    }

    fetchUsers()
  }, [])

  const handleRegister = async (event) => {
    event.preventDefault()

    const name = formData.name.trim()
    const password = formData.password.trim()

    if (!name || !password) {
      setMessage('Please enter both name and password.')
      return
    }

    if (password === ADMIN_PASSWORD) {
      setMessage('This password is reserved for the admin account. Please choose another password for a new user.')
      return
    }

    const role = formData.role || 'Editor'

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, password, role }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      setRegisteredUsers((currentUsers) => [result, ...currentUsers])
      setFormData({ name: '', password: '', role: 'Editor' })
      setMessage(`User "${name}" registered successfully as ${role}.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const renderDashboard = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow muted">Overview</p>
          <h1>Admin Dashboard</h1>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" type="button">Export</button>
          <button className="primary-btn" type="button" onClick={() => setActiveView('create-user')}>
            Add new
          </button>
        </div>
      </header>

      <section className="stats-grid">
        {stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <p>{item.label}</p>
            <h3>{item.value}</h3>
            <span>{item.change}</span>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Quick actions</h3>
            <button className="link-btn" type="button">View all</button>
          </div>

          <div className="action-list">
            {quickActions.map((action) => (
              <button key={action} className="action-btn" type="button">
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="panel spotlight">
          <div className="panel-header">
            <h3>New submissions</h3>
            <span className="badge">0</span>
          </div>
          <ul className="spotlight-list">
            <li>
              <strong>No new entries</strong>
              <span>Waiting for data to be added.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <h3>Ministry summary</h3>
          <button className="link-btn" type="button">Manage</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ministry</th>
              <th>Institutions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ministries.length ? (
              ministries.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.count}</td>
                  <td>
                    <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No ministries added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <h3>Recent institution updates</h3>
          <button className="link-btn" type="button">View timeline</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Ministry</th>
              <th>Type</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {institutions.length ? (
              institutions.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.ministry}</td>
                  <td>{item.type}</td>
                  <td>{item.updated}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">No institution records available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )

  const renderCreateUser = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow muted">System</p>
          <h1>Create User</h1>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" type="button" onClick={() => setActiveView('dashboard')}>
            Back to dashboard
          </button>
        </div>
      </header>

      <section className="panel user-panel">
        <div className="panel-header">
          <h3>Register a new admin user</h3>
        </div>

        <form className="register-form dedicated-form" onSubmit={handleRegister}>
          <div className="form-grid">
            <label>
              <span>Full Name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Enter full name"
              />
            </label>

            <label>
              <span>Role</span>
              <select
                value={formData.role}
                onChange={(event) => setFormData({ ...formData, role: event.target.value })}
              >
                <option value="Editor">Editor</option>
                <option value="Manager">Manager</option>
                <option value="Viewer">Viewer</option>
              </select>
            </label>
          </div>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              placeholder="Enter password"
            />
          </label>

          <button type="submit" className="primary-btn full-width">
            Register user
          </button>
        </form>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <h3>Registered users</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            {registeredUsers.map((user) => (
              <tr key={`${user.name}-${user.password}`}>
                <td>{user.name}</td>
                <td>{user.role || 'Editor'}</td>
                <td>{user.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )

  const handleMinisterSubmit = (event) => {
    event.preventDefault()

    const name = ministerForm.name.trim()
    const description = ministerForm.description.trim()

    if (!name || !description) {
      setMessage('Please enter both minister name and description.')
      return
    }

    const nextMinister = {
      id: editingMinisterId || Date.now(),
      name,
      description,
    }

    if (editingMinisterId) {
      setMinistriesList((current) =>
        current.map((minister) => (minister.id === editingMinisterId ? nextMinister : minister)),
      )
      setMessage(`Minister "${name}" updated successfully.`)
    } else {
      setMinistriesList((current) => [nextMinister, ...current])
      setMessage(`Minister "${name}" added successfully.`)
    }

    setMinisterForm({ name: '', description: '' })
    setEditingMinisterId(null)
  }

  const handleEditMinister = (minister) => {
    setEditingMinisterId(minister.id)
    setMinisterForm({ name: minister.name, description: minister.description })
    setActiveView('add-minister')
  }

  const handleDeleteMinister = (id) => {
    setMinistriesList((current) => current.filter((minister) => minister.id !== id))
    setMessage('Minister deleted successfully.')
  }

  const renderMinisterPage = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow muted">Ministry</p>
          <h1>{editingMinisterId ? 'Edit Minister' : 'Add Minister'}</h1>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" type="button" onClick={() => setActiveView('dashboard')}>
            Back to dashboard
          </button>
        </div>
      </header>

      <section className="panel user-panel">
        <div className="panel-header">
          <h3>{editingMinisterId ? 'Update minister details' : 'Create a new minister entry'}</h3>
        </div>

        <form className="register-form dedicated-form" onSubmit={handleMinisterSubmit}>
          <label>
            <span>Minister Name</span>
            <input
              type="text"
              value={ministerForm.name}
              onChange={(event) => setMinisterForm({ ...ministerForm, name: event.target.value })}
              placeholder="e.g. Minister of Education"
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              rows="4"
              value={ministerForm.description}
              onChange={(event) => setMinisterForm({ ...ministerForm, description: event.target.value })}
              placeholder="Add ministry description"
            />
          </label>

          <button type="submit" className="primary-btn full-width">
            {editingMinisterId ? 'Update Minister' : 'Add Minister'}
          </button>
        </form>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <h3>Minister List</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ministriesList.length ? (
              ministriesList.map((minister) => (
                <tr key={minister.id}>
                  <td>{minister.name}</td>
                  <td>{minister.description}</td>
                  <td className="action-cell">
                    <button
                      type="button"
                      className="small-btn edit-btn"
                      onClick={() => handleEditMinister(minister)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="small-btn delete-btn"
                      onClick={() => handleDeleteMinister(minister.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No ministers added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">SL</div>
          <div>
            <p className="eyebrow">CMS</p>
            <h2>Lanka Admin</h2>
          </div>
        </div>

        <nav className="side-nav">
          <button
            type="button"
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === 'create-user' ? 'active' : ''}`}
            onClick={() => setActiveView('create-user')}
          >
            Create User
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === 'add-minister' ? 'active' : ''}`}
            onClick={() => setActiveView('add-minister')}
          >
            Add Minister
          </button>
        </nav>

        <div className="mini-card">
          <span className="mini-label">Admin</span>
          <strong>Password: {ADMIN_PASSWORD}</strong>
          <small>{message}</small>
        </div>
      </aside>

      <main className="main-panel">
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'create-user' && renderCreateUser()}
        {activeView === 'add-minister' && renderMinisterPage()}
      </main>
    </div>
  )
}

export default App
