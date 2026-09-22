import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5002/api";
const COMMON_PORTAL = "http://localhost:5177/";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ======================================================
// ADD TOKEN TO EVERY REQUEST
// ======================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ======================================================
// APP
// ======================================================

function App() {
  const [user, setUser] = useState(null);

  const [ministries, setMinistries] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [activePage, setActivePage] = useState("dashboard");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentName, setDepartmentName] = useState("");
  const [savingDepartment, setSavingDepartment] = useState(false);

  // ======================================================
  // LOAD AND VALIDATE USER
  // ======================================================

  useEffect(() => {
    const loadCurrentUser = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = COMMON_PORTAL;
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
      } catch (err) {
        console.error("Authentication validation failed:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = COMMON_PORTAL;
      }
    };

    loadCurrentUser();
  }, []);

  // ======================================================
  // LOAD DATA
  // ======================================================

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [ministriesResponse, departmentsResponse] =
        await Promise.all([
          api.get("/ministries"),
          api.get("/departments"),
        ]);

      setMinistries(ministriesResponse.data || []);
      setDepartments(departmentsResponse.data || []);
    } catch (err) {
      console.error("Failed to load data:", err);

      if (err.response) {
        setError(
          err.response.data?.message ||
            `Server returned ${err.response.status}`
        );

        if (err.response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = COMMON_PORTAL;
        }
      } else if (err.request) {
        setError(
          "Cannot connect to Ministry backend at http://localhost:5002. " +
            "Make sure the server is running."
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // ASSIGNED MINISTRY
  // ======================================================

  const assignedMinistryId =
    user?.ministries?.length > 0 ? String(user.ministries[0]) : null;

  const assignedMinistry = useMemo(() => {
    if (!assignedMinistryId) return null;
    return ministries.find(
      (ministry) => String(ministry._id) === assignedMinistryId
    );
  }, [ministries, assignedMinistryId]);

  // ======================================================
  // CHECK OWN MINISTRY
  // ======================================================

  const isOwnMinistry = (ministryId) => {
    if (!assignedMinistryId || !ministryId) return false;
    return String(ministryId) === String(assignedMinistryId);
  };

  // ======================================================
  // OWN DEPARTMENTS
  // ======================================================

  const ownDepartments = useMemo(() => {
    return departments.filter((department) => {
      const ministryId =
        department.ministry?._id || department.ministry;
      return isOwnMinistry(ministryId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, assignedMinistryId]);

  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = COMMON_PORTAL;
  };

  // ======================================================
  // ADD DEPARTMENT
  // ======================================================

  const openAddDepartment = () => {
    if (!assignedMinistryId) {
      alert("No ministry has been assigned to your account.");
      return;
    }

    setEditingDepartment(null);
    setDepartmentName("");
    setShowDepartmentModal(true);
  };

  // ======================================================
  // EDIT DEPARTMENT
  // ======================================================

  const openEditDepartment = (department) => {
    const ministryId =
      department.ministry?._id || department.ministry;

    if (!isOwnMinistry(ministryId)) {
      alert("You can only edit departments under your ministry.");
      return;
    }

    setEditingDepartment(department);
    setDepartmentName(department.name || "");
    setShowDepartmentModal(true);
  };

  // ======================================================
  // SAVE DEPARTMENT
  // ======================================================

  const handleSaveDepartment = async (event) => {
    event.preventDefault();

    const trimmedName = departmentName.trim();

    if (!trimmedName) {
      alert("Please enter a department name.");
      return;
    }

    if (!editingDepartment && !assignedMinistryId) {
      alert("No ministry has been assigned to your account.");
      return;
    }

    try {
      setSavingDepartment(true);

      // EDIT
      if (editingDepartment) {
        const ministryId =
          editingDepartment.ministry?._id ||
          editingDepartment.ministry;

        if (!isOwnMinistry(ministryId)) {
          alert("You can only edit departments under your ministry.");
          return;
        }

        const response = await api.patch(
          `/departments/${editingDepartment._id}`,
          { name: trimmedName }
        );

        setDepartments((current) =>
          current.map((department) =>
            department._id === editingDepartment._id
              ? response.data
              : department
          )
        );
      }

      // ADD
      else {
        const response = await api.post("/departments", {
          name: trimmedName,
        });

        setDepartments((current) => [...current, response.data]);
      }

      closeDepartmentModal();
    } catch (err) {
      console.error("Failed to save department:", err);
      alert(
        err.response?.data?.message || "Failed to save department."
      );
    } finally {
      setSavingDepartment(false);
    }
  };

  // ======================================================
  // DELETE DEPARTMENT
  // ======================================================

  const handleDeleteDepartment = async (department) => {
    const ministryId =
      department.ministry?._id || department.ministry;

    if (!isOwnMinistry(ministryId)) {
      alert("You can only delete departments under your ministry.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/departments/${department._id}`);
      setDepartments((current) =>
        current.filter((item) => item._id !== department._id)
      );
    } catch (err) {
      console.error("Failed to delete department:", err);
      alert(
        err.response?.data?.message || "Failed to delete department."
      );
    }
  };

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  const closeDepartmentModal = () => {
    setShowDepartmentModal(false);
    setEditingDepartment(null);
    setDepartmentName("");
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (!user || loading) {
    return (
      <div className="app-loading">
        <div>
          <h2>Ministry Management System</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Ministry Management</h2>
        </div>

        <nav className="sidebar-nav">
          <button
            className={
              activePage === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={
              activePage === "ministries"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("ministries")}
          >
            Ministries
          </button>

          <button
            className={
              activePage === "departments"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("departments")}
          >
            My Departments
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-info">
            <strong>{user.name}</strong>
            {user.email && <span>{user.email}</span>}
            <small>{user.role}</small>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>
              {activePage === "dashboard" && "Dashboard"}
              {activePage === "ministries" && "Ministries"}
              {activePage === "departments" && "My Departments"}
            </h1>
            <p>Ministry &amp; Department Management System</p>
          </div>
        </header>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={loadData}>Retry</button>
          </div>
        )}

        {/* DASHBOARD */}
        {activePage === "dashboard" && (
          <section className="page-content">
            <div className="welcome-card">
              <h2>Welcome, {user.name}</h2>
              <p>
                Manage departments belonging to your assigned
                ministry.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Ministries</h3>
                <strong>{ministries.length}</strong>
              </div>

              <div className="stat-card">
                <h3>Total Departments</h3>
                <strong>{departments.length}</strong>
              </div>

              <div className="stat-card">
                <h3>My Departments</h3>
                <strong>{ownDepartments.length}</strong>
              </div>
            </div>

            <div className="info-card">
              <h3>Assigned Ministry</h3>
              {assignedMinistry ? (
                <p>{assignedMinistry.name}</p>
              ) : (
                <p>No ministry has been assigned to your account.</p>
              )}
            </div>
          </section>
        )}

        {/* MINISTRIES */}
        {activePage === "ministries" && (
          <section className="page-content">
            <div className="section-header">
              <div>
                <h2>All Ministries</h2>
                <p>View all ministries and their departments.</p>
              </div>
            </div>

            <div className="ministry-list">
              {ministries.length === 0 ? (
                <div className="empty-state">
                  No ministries found.
                </div>
              ) : (
                ministries.map((ministry) => {
                  const ministryDepartments =
                    departments.filter((department) => {
                      const departmentMinistryId =
                        department.ministry?._id ||
                        department.ministry;
                      return (
                        String(departmentMinistryId) ===
                        String(ministry._id)
                      );
                    });

                  const canManage = isOwnMinistry(ministry._id);

                  return (
                    <div
                      className="ministry-card"
                      key={ministry._id}
                    >
                      <div className="ministry-card-header">
                        <div>
                          <h3>{ministry.name}</h3>
                          {canManage && (
                            <span className="assigned-label">
                              Your Ministry
                            </span>
                          )}
                        </div>
                        <span>
                          {ministryDepartments.length} department
                          {ministryDepartments.length !== 1
                            ? "s"
                            : ""}
                        </span>
                      </div>

                      <div className="department-list">
                        {ministryDepartments.length === 0 ? (
                          <p className="empty-text">
                            No departments.
                          </p>
                        ) : (
                          ministryDepartments.map((department) => (
                            <div
                              className="department-row"
                              key={department._id}
                            >
                              <span>{department.name}</span>

                              {canManage && (
                                <div className="row-actions">
                                  <button
                                    onClick={() =>
                                      openEditDepartment(
                                        department
                                      )
                                    }
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="delete-button"
                                    onClick={() =>
                                      handleDeleteDepartment(
                                        department
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* MY DEPARTMENTS */}
        {activePage === "departments" && (
          <section className="page-content">
            <div className="section-header">
              <div>
                <h2>My Departments</h2>
                <p>
                  {assignedMinistry
                    ? `Departments under ${assignedMinistry.name}`
                    : "No ministry assigned"}
                </p>
              </div>

              <button
                className="primary-button"
                onClick={openAddDepartment}
                disabled={!assignedMinistryId}
              >
                + Add Department
              </button>
            </div>

            {!assignedMinistry ? (
              <div className="empty-state">
                <h3>No Ministry Assigned</h3>
                <p>
                  Your account has not been assigned to a ministry.
                  Please contact the administrator.
                </p>
              </div>
            ) : ownDepartments.length === 0 ? (
              <div className="empty-state">
                <h3>No Departments</h3>
                <p>
                  There are currently no departments under your
                  assigned ministry.
                </p>
              </div>
            ) : (
              <div className="department-table">
                <div className="table-header">
                  <span>Department Name</span>
                  <span>Actions</span>
                </div>

                {ownDepartments.map((department) => (
                  <div
                    className="table-row"
                    key={department._id}
                  >
                    <span>{department.name}</span>
                    <div className="row-actions">
                      <button
                        onClick={() =>
                          openEditDepartment(department)
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDeleteDepartment(department)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* MODAL */}
      {showDepartmentModal && (
        <div
          className="modal-overlay"
          onClick={closeDepartmentModal}
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingDepartment
                  ? "Edit Department"
                  : "Add Department"}
              </h2>
              <button
                className="close-button"
                onClick={closeDepartmentModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveDepartment}>
              <div className="form-group">
                <label>Ministry</label>
                <input
                  type="text"
                  value={assignedMinistry?.name || ""}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(event) =>
                    setDepartmentName(event.target.value)
                  }
                  placeholder="Enter department name"
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeDepartmentModal}
                  disabled={savingDepartment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingDepartment}
                >
                  {savingDepartment
                    ? "Saving..."
                    : editingDepartment
                    ? "Update Department"
                    : "Add Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;