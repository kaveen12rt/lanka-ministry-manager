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
  const [departmentForm, setDepartmentForm] = useState({ name: '', ministryId: '' })
  const [departmentNames, setDepartmentNames] = useState([''])
  const [editingDepartmentId, setEditingDepartmentId] = useState(null)
  const [departmentsList, setDepartmentsList] = useState([])

  const [registeredUsers, setRegisteredUsers] = useState([
    { name: 'Admin', password: ADMIN_PASSWORD, role: 'Admin' },
    { name: 'Sample User 01', password: 'sample123', role: 'Editor' },
  ])

  const [formData, setFormData] = useState({ name: '', password: '', ministries: [] })
  const [editingUserId, setEditingUserId] = useState(null)
  const [userEditForm, setUserEditForm] = useState({ name: '', password: '', ministries: [] })
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

    const fetchMinistries = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ministries`)
        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.message || 'Unable to load ministries')
        }

        const ministries = await response.json()
        setMinistriesList(ministries.map((ministry) => ({ ...ministry, id: ministry._id })))
      } catch (error) {
        console.error('Failed to fetch ministries:', error)
        setMessage(error.message)
      }
    }

    fetchMinistries()

    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/departments`)
        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.message || 'Unable to load departments')
        }

        const departments = await response.json()
        setDepartmentsList(departments)
      } catch (error) {
        console.error('Failed to fetch departments:', error)
        setMessage(error.message)
      }
    }

    fetchDepartments()
  }, [])

  const handleRegister = async (event) => {
    event.preventDefault()

    const name = formData.name.trim()
    const password = formData.password.trim()

    if (!name || !password) {
      setMessage('Please enter both username and password.')
      return
    }

    if (password === ADMIN_PASSWORD) {
      setMessage('This password is reserved for the admin account. Please choose another password for a new user.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, password, ministries: formData.ministries }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      setRegisteredUsers((currentUsers) => [result, ...currentUsers])
      setFormData({ name: '', password: '', ministries: [] })
      setMessage(`User "${name}" registered successfully.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const startEditingUser = (user) => {
    setEditingUserId(user._id)
    setUserEditForm({ name: user.name, password: '', ministries: user.ministries || [] })
  }

  const handleUpdateUser = async (event, user) => {
    event.preventDefault()

    const name = userEditForm.name.trim()
    const password = userEditForm.password.trim()

    if (!name) {
      setMessage('Username cannot be empty.')
      return
    }

    if (password === ADMIN_PASSWORD) {
      setMessage('This password is reserved for the admin account.')
      return
    }

    try {
      const body = { name, ministries: userEditForm.ministries }
      if (password) body.password = password

      const response = await fetch(`${API_BASE_URL}/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.message || 'User update failed')

      setRegisteredUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser._id === user._id ? result : currentUser)),
      )
      setEditingUserId(null)
      setMessage(`User "${name}" updated successfully.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const handleToggleUserBlock = async (user) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.message || 'Unable to update user status')

      setRegisteredUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser._id === user._id ? result : currentUser)),
      )
      setMessage(`User "${user.name}" ${result.isBlocked ? 'blocked' : 'unblocked'}.`)
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
              <span>Username</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Enter username"
              />
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

          <fieldset className="ministry-picker">
            <legend>Assign Ministries <small>(optional)</small></legend>
            {ministriesList.length ? (
              <div className="ministry-options">
                {ministriesList.map((ministry) => (
                  <label className="ministry-option" key={ministry.id}>
                    <input
                      type="checkbox"
                      checked={formData.ministries.includes(ministry.name)}
                      onChange={(event) => {
                        const selectedMinistries = event.target.checked
                          ? [...formData.ministries, ministry.name]
                          : formData.ministries.filter((name) => name !== ministry.name)

                        setFormData({ ...formData, ministries: selectedMinistries })
                      }}
                    />
                    <span>{ministry.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="empty-picker">Add a ministry first to assign it to this user.</p>
            )}
          </fieldset>

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
              <th>Username</th>
              <th>Role</th>
              <th>Ministries</th>
              <th>Password</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registeredUsers.map((user) => (
              editingUserId === user._id ? (
                <tr key={user._id || `${user.name}-${user.password}`}>
                  <td colSpan="6">
                    <form className="inline-user-form" onSubmit={(event) => handleUpdateUser(event, user)}>
                      <input
                        value={userEditForm.name}
                        onChange={(event) => setUserEditForm({ ...userEditForm, name: event.target.value })}
                        aria-label="Edit username"
                      />
                      <input
                        type="password"
                        value={userEditForm.password}
                        onChange={(event) => setUserEditForm({ ...userEditForm, password: event.target.value })}
                        placeholder="New password (optional)"
                        aria-label="New password"
                      />
                      {ministriesList.length > 0 && (
                        <div className="inline-ministry-options">
                          {ministriesList.map((ministry) => (
                            <label key={ministry.id}>
                              <input
                                type="checkbox"
                                checked={userEditForm.ministries.includes(ministry.name)}
                                onChange={(event) => {
                                  const selectedMinistries = event.target.checked
                                    ? [...userEditForm.ministries, ministry.name]
                                    : userEditForm.ministries.filter((name) => name !== ministry.name)

                                  setUserEditForm({ ...userEditForm, ministries: selectedMinistries })
                                }}
                              />
                              {ministry.name}
                            </label>
                          ))}
                        </div>
                      )}
                      <button type="submit" className="small-btn edit-btn">Save</button>
                      <button type="button" className="small-btn cancel-btn" onClick={() => setEditingUserId(null)}>
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={user._id || `${user.name}-${user.password}`} className={user.isBlocked ? 'blocked-row' : ''}>
                  <td>{user.name}</td>
                  <td>{user.role || 'Editor'}</td>
                  <td>{user.ministries?.length ? user.ministries.join(', ') : 'None assigned'}</td>
                  <td>{user.password}</td>
                  <td><span className={`user-status ${user.isBlocked ? 'blocked' : 'active'}`}>{user.isBlocked ? 'Blocked' : 'Active'}</span></td>
                  <td className="action-cell">
                    <button type="button" className="small-btn edit-btn" onClick={() => startEditingUser(user)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`small-btn ${user.isBlocked ? 'unblock-btn' : 'block-btn'}`}
                      onClick={() => handleToggleUserBlock(user)}
                    >
                      {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </section>
    </>
  )

  const handleMinisterSubmit = async (event) => {
    event.preventDefault()

    const name = ministerForm.name.trim()

    if (!name) {
      setMessage('Please enter the minister name.')
      return
    }

    try {
      const endpoint = editingMinisterId
        ? `${API_BASE_URL}/ministries/${editingMinisterId}`
        : `${API_BASE_URL}/ministries`
      const response = await fetch(endpoint, {
        method: editingMinisterId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.message || 'Ministry save failed')

      const savedMinistry = { ...result, id: result._id }
      setMinistriesList((current) =>
        editingMinisterId
          ? current.map((minister) => (minister.id === editingMinisterId ? savedMinistry : minister))
          : [savedMinistry, ...current],
      )
      setMessage(`Minister "${name}" ${editingMinisterId ? 'updated' : 'added'} successfully.`)
      setMinisterForm({ name: '', description: '' })
      setEditingMinisterId(null)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const handleEditMinister = (minister) => {
    setEditingMinisterId(minister.id)
    setMinisterForm({ name: minister.name, description: minister.description })
    setActiveView('add-minister')
  }

  const handleDeleteMinister = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ministries/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Ministry delete failed')

      setMinistriesList((current) => current.filter((minister) => minister.id !== id))
      setMessage('Minister deleted successfully.')
    } catch (error) {
      setMessage(error.message)
    }
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ministriesList.length ? (
              ministriesList.map((minister) => (
                <tr key={minister.id}>
                  <td>{minister.name}</td>
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
                <td colSpan="2">No ministers added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )

  const handleDepartmentSubmit = async (event) => {
    event.preventDefault()

    const names = editingDepartmentId
      ? [departmentForm.name.trim()]
      : departmentNames.map((name) => name.trim()).filter(Boolean)

    if (!names.length || !departmentForm.ministryId) {
      setMessage('Please enter at least one department name and select a ministry.')
      return
    }

    try {
      const savedDepartments = []

      for (const name of names) {
        const endpoint = editingDepartmentId
          ? `${API_BASE_URL}/departments/${editingDepartmentId}`
          : `${API_BASE_URL}/departments`
        const response = await fetch(endpoint, {
          method: editingDepartmentId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, ministryId: departmentForm.ministryId }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || `Failed to save ${name}`)
        savedDepartments.push(result)
      }

      setDepartmentsList((current) => editingDepartmentId
        ? current.map((department) => (department._id === editingDepartmentId ? savedDepartments[0] : department))
        : [...savedDepartments.reverse(), ...current])
      setDepartmentForm({ name: '', ministryId: departmentForm.ministryId })
      setDepartmentNames([''])
      setEditingDepartmentId(null)
      setMessage(`${savedDepartments.length} department${savedDepartments.length > 1 ? 's' : ''} ${editingDepartmentId ? 'updated' : 'added'} successfully.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const handleEditDepartment = (department) => {
    setEditingDepartmentId(department._id)
    setDepartmentForm({ name: department.name, ministryId: department.ministry?._id || department.ministryId })
    setDepartmentNames([department.name])
    setActiveView('add-department')
  }

  const handleDeleteDepartment = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Department delete failed')

      setDepartmentsList((current) => current.filter((department) => department._id !== id))
      setMessage('Department deleted successfully.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const prepareAnotherDepartment = () => {
    setEditingDepartmentId(null)
    setDepartmentForm({ name: '', ministryId: departmentForm.ministryId })
    setDepartmentNames((current) => [...current, ''])
    setActiveView('add-department')
    setMessage('Ready to add another department.')
  }

  const renderDepartmentPage = () => (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow muted">Structure</p>
          <h1>{editingDepartmentId ? 'Edit Department' : 'Add Department'}</h1>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" type="button" onClick={() => setActiveView('dashboard')}>
            Back to dashboard
          </button>
        </div>
      </header>

      <section className="panel user-panel">
        <div className="panel-header">
          <h3>{editingDepartmentId ? 'Update department details' : 'Create a new department'}</h3>
        </div>

        <form className="register-form dedicated-form" onSubmit={handleDepartmentSubmit}>
          <label>
            <span>Step 1 · Select Ministry</span>
            <select
              value={departmentForm.ministryId}
              disabled={!ministriesList.length}
              onChange={(event) => setDepartmentForm({ ...departmentForm, ministryId: event.target.value })}
            >
              <option value="">Select a ministry</option>
              {ministriesList.map((ministry) => (
                <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
              ))}
            </select>
          </label>

          {!ministriesList.length && (
            <div className="form-notice">
              <span>Add a ministry first before creating departments.</span>
              <button type="button" className="link-btn" onClick={() => setActiveView('add-minister')}>
                Add Ministry
              </button>
            </div>
          )}

          {editingDepartmentId ? (
            <label>
              <span>Step 2 · Department Name</span>
              <input
                type="text"
                value={departmentForm.name}
                disabled={!departmentForm.ministryId}
                onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })}
                placeholder="e.g. Department of Education"
              />
            </label>
          ) : (
            <div className="department-input-list">
              {departmentNames.map((name, index) => (
                <div className="repeatable-department-row" key={`department-input-${index}`}>
                  <label>
                    <span>Step 2 · Department {index + 1}</span>
                    <input
                      type="text"
                      value={name}
                      disabled={!departmentForm.ministryId}
                      onChange={(event) => setDepartmentNames((current) => current.map((item, itemIndex) => (
                        itemIndex === index ? event.target.value : item
                      )))}
                      placeholder={departmentForm.ministryId ? 'e.g. Department of Education' : 'Select a ministry first'}
                    />
                  </label>
                  {departmentNames.length > 1 && (
                    <button
                      type="button"
                      className="remove-department-btn"
                      aria-label={`Remove department ${index + 1}`}
                      title="Remove department field"
                      onClick={() => setDepartmentNames((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="primary-btn full-width" disabled={!departmentForm.ministryId}>
            {editingDepartmentId ? 'Update Department' : 'Add Department'}
          </button>
          {!editingDepartmentId && departmentForm.ministryId && (
            <button type="button" className="ghost-btn full-width" onClick={prepareAnotherDepartment}>
              Add Next Department
            </button>
          )}
        </form>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <h3>
            {departmentForm.ministryId
              ? `Departments under ${ministriesList.find((ministry) => ministry.id === departmentForm.ministryId)?.name || 'selected ministry'}`
              : 'Department List'}
          </h3>
        </div>

        <table>
          <thead>
            <tr><th>Department</th><th>Ministry</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {departmentsList.filter((department) => !departmentForm.ministryId || department.ministry?._id === departmentForm.ministryId).length ? departmentsList
              .filter((department) => !departmentForm.ministryId || department.ministry?._id === departmentForm.ministryId)
              .map((department) => (
              <tr key={department._id}>
                <td>{department.name}</td>
                <td>{department.ministry?.name || 'Unknown ministry'}</td>
                <td className="action-cell">
                  <button type="button" className="small-btn edit-btn" onClick={() => handleEditDepartment(department)}>Edit</button>
                  <button type="button" className="small-btn delete-btn" onClick={() => handleDeleteDepartment(department._id)}>Delete</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="3">No departments added yet.</td></tr>
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
          <button
            type="button"
            className={`nav-item ${activeView === 'add-department' ? 'active' : ''}`}
            onClick={() => setActiveView('add-department')}
          >
            Add Department
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
        {activeView === 'add-department' && renderDepartmentPage()}
      </main>
    </div>
  )
}

export default App
