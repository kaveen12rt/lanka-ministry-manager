import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api`.replace(/\/\/$/, '')

const quickActions = ['Add Ministry', 'Add Department', 'Create User']

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [ministerForm, setMinisterForm] = useState({ name: '', description: '' })
  const [editingMinisterId, setEditingMinisterId] = useState(null)
  const [ministriesList, setMinistriesList] = useState([])
  const [departmentForm, setDepartmentForm] = useState({ name: '', ministryId: '' })
  const [departmentNames, setDepartmentNames] = useState([''])
  const [editingDepartmentId, setEditingDepartmentId] = useState(null)
  const [departmentsList, setDepartmentsList] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('all')
  const [ministrySearch, setMinistrySearch] = useState('')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [departmentMinistryFilter, setDepartmentMinistryFilter] = useState('all')

  const [registeredUsers, setRegisteredUsers] = useState([
    { name: 'Admin', role: 'Admin' },
    { name: 'Sample User 01', role: 'Editor' },
  ])

  const [formData, setFormData] = useState({ name: '', email: '', password: '', ministries: [] })
  const [editingUserId, setEditingUserId] = useState(null)
  const [userEditForm, setUserEditForm] = useState({ name: '', email: '', password: '', ministries: [] })
  const [message, setMessage] = useState('Use the secure admin sign-in portal.')
  const [messageType, setMessageType] = useState('info')

  const setAdminMessage = (text, type = 'info') => {
    setMessage(text || 'Something went wrong.')
    setMessageType(type)
  }

  const clearAdminMessage = () => {
    setMessage('')
    setMessageType('info')
  }

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
        setAdminMessage(error?.message || 'Unable to load users', 'error')
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
        setAdminMessage(error?.message || 'Unable to load ministries', 'error')
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
        setAdminMessage(error?.message || 'Unable to load departments', 'error')
      }
    }

    fetchDepartments()
  }, [])

  const handleRegister = async (event) => {
    event.preventDefault()

    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()
    const password = formData.password.trim()

    if (!name || !email || !password) {
      setAdminMessage('Please enter username, email, and password.', 'error')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAdminMessage('Please enter a valid email address.', 'error')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, ministries: formData.ministries }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      setRegisteredUsers((currentUsers) => [result, ...currentUsers])
      setFormData({ name: '', email: '', password: '', ministries: [] })
      setAdminMessage(`User "${name}" registered successfully.`, 'success')
    } catch (error) {
      setAdminMessage(error?.message || 'Registration failed', 'error')
    }
  }

  const startEditingUser = (user) => {
    setEditingUserId(user._id)
    setUserEditForm({ name: user.name, email: user.email || '', password: '', ministries: user.ministries || [] })
  }

  const handleUpdateUser = async (event, user) => {
    event.preventDefault()

    const name = userEditForm.name.trim()
    const email = userEditForm.email.trim().toLowerCase()
    const password = userEditForm.password.trim()

    if (!name) {
      setAdminMessage('Username cannot be empty.', 'error')
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAdminMessage('Please enter a valid email address.', 'error')
      return
    }

    try {
      const body = { name, email, ministries: userEditForm.ministries }
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
      setAdminMessage(`User "${name}" updated successfully.`, 'success')
    } catch (error) {
      setAdminMessage(error?.message || 'User update failed', 'error')
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
      setAdminMessage(`User "${user.name}" ${result.isBlocked ? 'blocked' : 'unblocked'}.`, 'success')
    } catch (error) {
      setAdminMessage(error?.message || 'Unable to update user status', 'error')
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
        {[
          { label: 'Ministries', value: ministriesList.length, change: 'Managed entries' },
          { label: 'Departments', value: departmentsList.length, change: 'Across all ministries' },
          { label: 'Registered Users', value: registeredUsers.length, change: 'Admin-managed accounts' },
          { label: 'Blocked Users', value: registeredUsers.filter((user) => user.isBlocked).length, change: 'Access restricted' },
        ].map((item) => (
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
            {quickActions.slice(0, 3).map((action) => (
              <button
                key={action}
                className="action-btn"
                type="button"
                onClick={() => setActiveView(action === 'Add Ministry' ? 'add-minister' : action === 'Add Department' ? 'add-department' : 'create-user')}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="panel spotlight">
          <div className="panel-header">
            <h3>New submissions</h3>
            <span className="badge">{departmentsList.length}</span>
          </div>
          <ul className="spotlight-list">
            <li>
              <strong>{departmentsList.length ? 'Directory structure is active' : 'No departments yet'}</strong>
              <span>{departmentsList.length ? `${departmentsList.length} departments are linked to ministries.` : 'Add a department to build the directory.'}</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <h3>Ministry summary</h3>
          <button className="link-btn" type="button" onClick={() => setActiveView('add-minister')}>Manage</button>
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
            {ministriesList.length ? (
              ministriesList.map((ministry) => {
                const departmentCount = departmentsList.filter((department) => department.ministry?._id === ministry.id).length
                return (
                  <tr key={ministry.id}>
                    <td>{ministry.name}</td>
                    <td>{departmentCount}</td>
                    <td>
                      <span className={`status ${departmentCount ? 'active' : 'pending'}`}>{departmentCount ? 'Active' : 'Empty'}</span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="3">No ministries added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

    </>
  )

  const renderCreateUser = () => {
    const filteredUsers = registeredUsers.filter((user) => {
      const query = userSearch.trim().toLowerCase()
      const matchesSearch = !query || user.name.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
      const matchesStatus = userStatusFilter === 'all'
        || (userStatusFilter === 'blocked' && user.isBlocked)
        || (userStatusFilter === 'active' && !user.isBlocked)
      return matchesSearch && matchesStatus
    })

    return (
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

            <label>
              <span>Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="Enter email address"
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

        <div className="search-toolbar">
          <input
            type="search"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search username or email"
            aria-label="Search registered users"
          />
          <select value={userStatusFilter} onChange={(event) => setUserStatusFilter(event.target.value)} aria-label="Filter users by status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Ministries</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id || user.name} className={user.isBlocked ? 'blocked-row' : ''}>
                <td>{user.name}</td>
                <td>{user.email || 'Not provided'}</td>
                <td>{user.role || 'Editor'}</td>
                <td>{user.ministries?.length ? user.ministries.join(', ') : 'None assigned'}</td>
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
            ))}
          </tbody>
        </table>
      </section>

      {editingUserId && (
        <div className="user-edit-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingUserId(null)
        }}>
          <section className="user-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow muted">Registered users</p>
                <h2 id="edit-user-title">Edit User</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingUserId(null)} aria-label="Close edit user page">
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={(event) => handleUpdateUser(event, registeredUsers.find((user) => user._id === editingUserId))}>
              <label>
                <span>Username</span>
                <input
                  value={userEditForm.name}
                  onChange={(event) => setUserEditForm({ ...userEditForm, name: event.target.value })}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={userEditForm.email}
                  onChange={(event) => setUserEditForm({ ...userEditForm, email: event.target.value })}
                />
              </label>
              <label>
                <span>New Password <small>(optional)</small></span>
                <input
                  type="password"
                  value={userEditForm.password}
                  onChange={(event) => setUserEditForm({ ...userEditForm, password: event.target.value })}
                  placeholder="Leave blank to keep current password"
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
                          checked={userEditForm.ministries.includes(ministry.name)}
                          onChange={(event) => {
                            const selectedMinistries = event.target.checked
                              ? [...userEditForm.ministries, ministry.name]
                              : userEditForm.ministries.filter((name) => name !== ministry.name)
                            setUserEditForm({ ...userEditForm, ministries: selectedMinistries })
                          }}
                        />
                        <span>{ministry.name}</span>
                      </label>
                    ))}
                  </div>
                ) : <p className="empty-picker">No ministries available.</p>}
              </fieldset>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditingUserId(null)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
    )
  }

  const handleMinisterSubmit = async (event) => {
    event.preventDefault()

    const name = ministerForm.name.trim()

    if (!name) {
      setAdminMessage('Please enter the minister name.', 'error')
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
      setAdminMessage(`Minister "${name}" ${editingMinisterId ? 'updated' : 'added'} successfully.`, 'success')
      setMinisterForm({ name: '', description: '' })
      setEditingMinisterId(null)
    } catch (error) {
      setAdminMessage(error?.message || 'Ministry save failed', 'error')
    }
  }

  const handleEditMinister = (minister) => {
    setEditingMinisterId(minister.id)
    setMinisterForm({ name: minister.name, description: minister.description })
  }

  const handleDeleteMinister = async (id) => {
    const ministry = ministriesList.find((item) => item.id === id)
    const shouldDelete = window.confirm(`Delete ministry "${ministry?.name || 'this ministry'}"?`)
    if (!shouldDelete) return

    try {
      const response = await fetch(`${API_BASE_URL}/ministries/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Ministry delete failed')

      setMinistriesList((current) => current.filter((minister) => minister.id !== id))
      setAdminMessage('Minister deleted successfully.', 'success')
    } catch (error) {
      setAdminMessage(error?.message || 'Ministry delete failed', 'error')
    }
  }

  const renderMinisterPage = () => {
    const filteredMinistries = ministriesList.filter((minister) =>
      minister.name.toLowerCase().includes(ministrySearch.trim().toLowerCase()),
    )

    return (
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

        <div className="search-toolbar">
          <input
            type="search"
            value={ministrySearch}
            onChange={(event) => setMinistrySearch(event.target.value)}
            placeholder="Search ministries"
            aria-label="Search ministries"
          />
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMinistries.length ? (
              filteredMinistries.map((minister) => (
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

      {editingMinisterId && (
        <div className="user-edit-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingMinisterId(null)
        }}>
          <section className="user-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-ministry-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow muted">Ministry management</p>
                <h2 id="edit-ministry-title">Edit Ministry</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingMinisterId(null)} aria-label="Close edit ministry form">×</button>
            </div>
            <form className="modal-form" onSubmit={handleMinisterSubmit}>
              <label>
                <span>Ministry Name</span>
                <input
                  value={ministerForm.name}
                  onChange={(event) => setMinisterForm({ ...ministerForm, name: event.target.value })}
                  autoFocus
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditingMinisterId(null)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
    )
  }

  const handleDepartmentSubmit = async (event) => {
    event.preventDefault()

    const names = editingDepartmentId
      ? [departmentForm.name.trim()]
      : departmentNames.map((name) => name.trim()).filter(Boolean)

    if (!names.length || !departmentForm.ministryId) {
      setAdminMessage('Please enter at least one department name and select a ministry.', 'error')
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
      setAdminMessage(`${savedDepartments.length} department${savedDepartments.length > 1 ? 's' : ''} ${editingDepartmentId ? 'updated' : 'added'} successfully.`, 'success')
    } catch (error) {
      setAdminMessage(error?.message || 'Department save failed', 'error')
    }
  }

  const handleEditDepartment = (department) => {
    setEditingDepartmentId(department._id)
    setDepartmentForm({ name: department.name, ministryId: department.ministry?._id || department.ministryId })
    setDepartmentNames([department.name])
  }

  const handleDeleteDepartment = async (id) => {
    const department = departmentsList.find((item) => item._id === id)
    const shouldDelete = window.confirm(`Delete department "${department?.name || 'this department'}"?`)
    if (!shouldDelete) return

    try {
      const response = await fetch(`${API_BASE_URL}/departments/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Department delete failed')

      setDepartmentsList((current) => current.filter((department) => department._id !== id))
      setAdminMessage('Department deleted successfully.', 'success')
    } catch (error) {
      setAdminMessage(error?.message || 'Department delete failed', 'error')
    }
  }

  const prepareAnotherDepartment = () => {
    setEditingDepartmentId(null)
    setDepartmentForm({ name: '', ministryId: departmentForm.ministryId })
    setDepartmentNames((current) => [...current, ''])
    setActiveView('add-department')
    setAdminMessage('Ready to add another department.', 'info')
  }

  const renderDepartmentPage = () => {
    const filteredDepartments = departmentsList.filter((department) => {
      const query = departmentSearch.trim().toLowerCase()
      const matchesSearch = !query || department.name.toLowerCase().includes(query)
      const matchesMinistry = departmentMinistryFilter === 'all' || department.ministry?._id === departmentMinistryFilter
      return matchesSearch && matchesMinistry
    })

    return (
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

          {!editingDepartmentId && departmentForm.ministryId && (
            <button type="button" className="ghost-btn full-width" onClick={prepareAnotherDepartment}>
              Add Next Department
            </button>
          )}

          <button type="submit" className="primary-btn full-width" disabled={!departmentForm.ministryId}>
            {editingDepartmentId ? 'Update Department' : 'Add Department'}
          </button>
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

        <div className="search-toolbar">
          <input
            type="search"
            value={departmentSearch}
            onChange={(event) => setDepartmentSearch(event.target.value)}
            placeholder="Search departments"
            aria-label="Search departments"
          />
          <select value={departmentMinistryFilter} onChange={(event) => setDepartmentMinistryFilter(event.target.value)} aria-label="Filter departments by ministry">
            <option value="all">All ministries</option>
            {ministriesList.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
            ))}
          </select>
        </div>

        <table>
          <thead>
            <tr><th>Department</th><th>Ministry</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filteredDepartments.length ? filteredDepartments.map((department) => (
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

      {editingDepartmentId && (
        <div className="user-edit-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditingDepartmentId(null)
        }}>
          <section className="user-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-department-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow muted">Department management</p>
                <h2 id="edit-department-title">Edit Department</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingDepartmentId(null)} aria-label="Close edit department form">×</button>
            </div>
            <form className="modal-form" onSubmit={handleDepartmentSubmit}>
              <label>
                <span>Department Name</span>
                <input
                  value={departmentForm.name}
                  onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })}
                  autoFocus
                />
              </label>
              <label>
                <span>Parent Ministry</span>
                <select
                  value={departmentForm.ministryId}
                  onChange={(event) => setDepartmentForm({ ...departmentForm, ministryId: event.target.value })}
                >
                  <option value="">Select a ministry</option>
                  {ministriesList.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>{ministry.name}</option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setEditingDepartmentId(null)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
    )
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

        <div className={`mini-card ${messageType === 'error' ? 'is-error' : messageType === 'success' ? 'is-success' : ''}`}>
          <span className="mini-label">Admin</span>
          <strong>Admin access protected</strong>
          <small>{message}</small>
        </div>
      </aside>

      <main className="main-panel">
        {message && messageType === 'error' && (
          <div className="admin-alert error-alert" role="alert">
            <div className="alert-content">
              <strong>Form error</strong>
              <span>{message}</span>
            </div>
            <button type="button" className="alert-close" onClick={clearAdminMessage} aria-label="Close error alert">
              ×
            </button>
          </div>
        )}
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'create-user' && renderCreateUser()}
        {activeView === 'add-minister' && renderMinisterPage()}
        {activeView === 'add-department' && renderDepartmentPage()}
      </main>
    </div>
  )
}

export default App
