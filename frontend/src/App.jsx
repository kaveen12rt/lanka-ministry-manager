import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'lanka-admin-users'
const ADMIN_PASSWORD = '0011'

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
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return [{ name: 'Admin', password: ADMIN_PASSWORD }]
    }

    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) && parsed.length ? parsed : [{ name: 'Admin', password: ADMIN_PASSWORD }]
    } catch {
      return [{ name: 'Admin', password: ADMIN_PASSWORD }]
    }
  })

  const [formData, setFormData] = useState({ name: '', password: '' })
  const [message, setMessage] = useState('Admin password is fixed as 0011 for this demo.')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registeredUsers))
  }, [registeredUsers])

  const handleRegister = (event) => {
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

    const alreadyExists = registeredUsers.some(
      (user) => user.name.toLowerCase() === name.toLowerCase(),
    )

    if (alreadyExists) {
      setMessage('This user already exists. Please choose another name.')
      return
    }

    const nextUsers = [...registeredUsers, { name, password }]
    setRegisteredUsers(nextUsers)
    setFormData({ name: '', password: '' })
    setMessage(`User "${name}" registered successfully.`)
  }

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
          <a className="nav-item active" href="#">Dashboard</a>
          <a className="nav-item" href="#">Ministries</a>
          <a className="nav-item" href="#">Institutions</a>
          <a className="nav-item" href="#">Reports</a>
          <a className="nav-item" href="#">Settings</a>
        </nav>

        <div className="extra-actions">
          <h3>Other actions</h3>
          <button type="button">Add user</button>
          <button type="button">Audit log</button>
          <button type="button">Backup</button>
        </div>

        <form className="register-form" onSubmit={handleRegister}>
          <h3>Create user</h3>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              placeholder="Enter name"
            />
          </label>

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

        <div className="user-list">
          <h4>Registered users</h4>
          <ul>
            {registeredUsers.map((user) => (
              <li key={`${user.name}-${user.password}`}>
                {user.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="mini-card">
          <span className="mini-label">Admin</span>
          <strong>Password: {ADMIN_PASSWORD}</strong>
          <small>{message}</small>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow muted">Overview</p>
            <h1>Admin Dashboard</h1>
          </div>

          <div className="header-actions">
            <button className="ghost-btn">Export</button>
            <button className="primary-btn">Add new</button>
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
              <button className="link-btn">View all</button>
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
            <button className="link-btn">Manage</button>
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
            <button className="link-btn">View timeline</button>
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
      </main>
    </div>
  )
}

export default App
