import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = `${import.meta.env.VITE_API_URL || ""}/api/user`;
const COMMON_PORTAL = "/apps/portal/";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
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
          "Cannot connect to the Ministry backend. Make sure the server is running."
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
    user?.ministries?.length > 0
      ? String(user.ministries[0])
      : null;

  const assignedMinistry = useMemo(() => {
    if (!assignedMinistryId) return null;

    return ministries.find(
      (ministry) =>
        String(ministry._id) === assignedMinistryId
    );
  }, [ministries, assignedMinistryId]);

  // ======================================================
  // CHECK OWN MINISTRY
  // ======================================================

  const isOwnMinistry = (ministryId) => {
    if (!assignedMinistryId || !ministryId) return false;

    return (
      String(ministryId) === String(assignedMinistryId)
    );
  };

  // ======================================================
  // OWN DEPARTMENTS
  // ======================================================

  const ownDepartments = useMemo(() => {
    return departments.filter((department) => {
      const ministryId =
        department.ministry?._id ||
        department.ministry;

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
      alert(
        "No ministry has been assigned to your account."
      );
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
      department.ministry?._id ||
      department.ministry;

    if (!isOwnMinistry(ministryId)) {
      alert(
        "You can only edit departments under your ministry."
      );
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
      alert(
        "No ministry has been assigned to your account."
      );
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
          alert(
            "You can only edit departments under your ministry."
          );
          return;
        }

        const response = await api.patch(
          `/departments/${editingDepartment._id}`,
          {
            name: trimmedName,
          }
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

        setDepartments((current) => [
          ...current,
          response.data,
        ]);
      }

      closeDepartmentModal();
    } catch (err) {
      console.error("Failed to save department:", err);

      alert(
        err.response?.data?.message ||
          "Failed to save department."
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
      department.ministry?._id ||
      department.ministry;

    if (!isOwnMinistry(ministryId)) {
      alert(
        "You can only delete departments under your ministry."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/departments/${department._id}`
      );

      setDepartments((current) =>
        current.filter(
          (item) => item._id !== department._id
        )
      );
    } catch (err) {
      console.error(
        "Failed to delete department:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to delete department."
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
        <img
          src="/gov-logo.jpg"
          alt="Government of Sri Lanka"
        />

        <h2>Ministry & Department Management System</h2>
        <p>Loading your portal...</p>
      </div>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <div className="portal-app">

      {/* ==================================================
          GOVERNMENT HEADER
      ================================================== */}

      <header className="top-header">
        <div className="brand">
          <img
            src="/gov-logo.jpg"
            alt="Government of Sri Lanka"
          />

          <div>
            <strong>Government of Sri Lanka</strong>
            <span>
              Ministry & Department Management System
            </span>
          </div>
        </div>

        <div className="user-area">
          <div className="user-details">
            <strong>{user.name}</strong>

            {user.email && (
              <span>{user.email}</span>
            )}

            <small>{user.role}</small>
          </div>

          <button onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* ==================================================
          MAIN LAYOUT
      ================================================== */}

      <div className="main-layout">

        {/* ==================================================
            SIDEBAR
        ================================================== */}

        <aside className="sidebar">

          <div className="portal-label">
            MINISTRY USER PORTAL
          </div>

          <button
            className={
              activePage === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            <span className="nav-icon">⌂</span>
            Dashboard
          </button>

          <button
            className={
              activePage === "ministries"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("ministries")
            }
          >
            <span className="nav-icon">▦</span>
            Ministries
          </button>

          <button
            className={
              activePage === "departments"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("departments")
            }
          >
            <span className="nav-icon">☷</span>
            My Departments
          </button>

          <div className="sidebar-divider" />

          <div className="sidebar-ministry">
            <span>ASSIGNED MINISTRY</span>

            <strong>
              {assignedMinistry
                ? assignedMinistry.name
                : "Not Assigned"}
            </strong>
          </div>

          <div className="sidebar-footer">
            <span>Authorized Government User</span>
          </div>
        </aside>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <main className="content">

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="error-message">
              <div>
                <strong>Error</strong>
                <span>{error}</span>
              </div>

              <button onClick={loadData}>
                Retry
              </button>
            </div>
          )}

          {/* ==================================================
              DASHBOARD
          ================================================== */}

          {activePage === "dashboard" && (
            <section>

              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    MINISTRY USER PORTAL
                  </p>

                  <h1>Dashboard</h1>

                  <p>
                    Overview of ministries and departments
                    available in the system.
                  </p>
                </div>
              </div>

              <div className="welcome-box">
                <div className="welcome-content">
                  <div className="welcome-mark">
                    SL
                  </div>

                  <div>
                    <h2>
                      Welcome, {user.name}
                    </h2>

                    <p>
                      You can view all ministries and
                      departments. Department management
                      is available only for your assigned
                      ministry.
                    </p>
                  </div>
                </div>
              </div>

              <div className="stats-grid">

                <div className="stat-card">
                  <div className="stat-icon">
                    M
                  </div>

                  <div>
                    <span>Total Ministries</span>
                    <strong>
                      {ministries.length}
                    </strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    D
                  </div>

                  <div>
                    <span>Total Departments</span>
                    <strong>
                      {departments.length}
                    </strong>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    ✓
                  </div>

                  <div>
                    <span>My Departments</span>
                    <strong>
                      {ownDepartments.length}
                    </strong>
                  </div>
                </div>

              </div>

              <div className="content-card assigned-card">
                <div className="card-heading">
                  <div>
                    <p className="card-eyebrow">
                      YOUR ACCESS
                    </p>

                    <h2>Assigned Ministry</h2>
                  </div>
                </div>

                {assignedMinistry ? (
                  <div className="assigned-ministry">
                    <div className="ministry-symbol">
                      M
                    </div>

                    <div>
                      <strong>
                        {assignedMinistry.name}
                      </strong>

                      <span>
                        {ownDepartments.length} department
                        {ownDepartments.length !== 1
                          ? "s"
                          : ""}{" "}
                        under your management
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No Ministry Assigned</h3>

                    <p>
                      Your account has not been assigned
                      to a ministry. Please contact the
                      administrator.
                    </p>
                  </div>
                )}
              </div>

            </section>
          )}

          {/* ==================================================
              MINISTRIES
          ================================================== */}

          {activePage === "ministries" && (
            <section>

              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    DIRECTORY
                  </p>

                  <h1>Ministries</h1>

                  <p>
                    View all ministries and their
                    departments.
                  </p>
                </div>
              </div>

              {assignedMinistry && (
                <div className="own-ministry-banner">
                  <div className="banner-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Your Assigned Ministry
                    </strong>

                    <span>
                      {assignedMinistry.name}
                    </span>
                  </div>
                </div>
              )}

              <div className="ministry-grid">

                {ministries.length === 0 ? (
                  <div className="empty-state">
                    No ministries found.
                  </div>
                ) : (
                  ministries.map((ministry) => {

                    const ministryDepartments =
                      departments.filter(
                        (department) => {
                          const departmentMinistryId =
                            department.ministry?._id ||
                            department.ministry;

                          return (
                            String(
                              departmentMinistryId
                            ) === String(ministry._id)
                          );
                        }
                      );

                    const canManage =
                      isOwnMinistry(
                        ministry._id
                      );

                    return (
                      <div
                        className={
                          canManage
                            ? "ministry-card own"
                            : "ministry-card"
                        }
                        key={ministry._id}
                      >

                        <div className="ministry-card-header">

                          <div className="ministry-title">
                            <div className="ministry-icon">
                              M
                            </div>

                            <div>
                              <h3>
                                {ministry.name}
                              </h3>

                              {canManage && (
                                <span className="assigned-label">
                                  Your Ministry
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="department-count">
                            {ministryDepartments.length}
                          </span>

                        </div>

                        <div className="department-heading">
                          <span>
                            Departments
                          </span>

                          <span>
                            {ministryDepartments.length}
                          </span>
                        </div>

                        <div className="department-list">

                          {ministryDepartments.length ===
                          0 ? (
                            <p className="empty-text">
                              No departments registered.
                            </p>
                          ) : (
                            ministryDepartments.map(
                              (department) => (
                                <div
                                  className="department-row"
                                  key={department._id}
                                >
                                  <div className="department-name">
                                    <span className="department-dot" />
                                    <span>
                                      {department.name}
                                    </span>
                                  </div>

                                  {canManage && (
                                    <div className="row-actions">
                                      <button
                                        className="edit-button"
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
                              )
                            )
                          )}

                        </div>

                        {canManage && (
                          <button
                            className="manage-department-button"
                            onClick={() => {
                              setActivePage(
                                "departments"
                              );
                            }}
                          >
                            Manage My Departments →
                          </button>
                        )}

                      </div>
                    );
                  })
                )}

              </div>
            </section>
          )}

          {/* ==================================================
              MY DEPARTMENTS
          ================================================== */}

          {activePage === "departments" && (
            <section>

              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    DEPARTMENT MANAGEMENT
                  </p>

                  <h1>My Departments</h1>

                  <p>
                    Manage departments under your assigned
                    ministry.
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
                <div className="empty-state large">
                  <div className="empty-icon">
                    !
                  </div>

                  <h3>No Ministry Assigned</h3>

                  <p>
                    Your account has not been assigned to
                    a ministry. Please contact the
                    administrator.
                  </p>
                </div>
              ) : (
                <>
                  <div className="own-ministry-banner">
                    <div className="banner-icon">
                      M
                    </div>

                    <div>
                      <strong>
                        {assignedMinistry.name}
                      </strong>

                      <span>
                        You have permission to add, edit
                        and delete departments under this
                        ministry.
                      </span>
                    </div>
                  </div>

                  {ownDepartments.length === 0 ? (
                    <div className="empty-state large">
                      <div className="empty-icon">
                        D
                      </div>

                      <h3>No Departments</h3>

                      <p>
                        There are currently no departments
                        under your assigned ministry.
                      </p>

                      <button
                        className="primary-button"
                        onClick={
                          openAddDepartment
                        }
                      >
                        + Add First Department
                      </button>
                    </div>
                  ) : (
                    <div className="content-card department-card">

                      <div className="card-heading">
                        <div>
                          <p className="card-eyebrow">
                            REGISTERED DEPARTMENTS
                          </p>

                          <h2>
                            {assignedMinistry.name}
                          </h2>
                        </div>

                        <span className="count-badge">
                          {ownDepartments.length}{" "}
                          department
                          {ownDepartments.length !==
                          1
                            ? "s"
                            : ""}
                        </span>
                      </div>

                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>
                                Department Name
                              </th>

                              <th>
                                Status
                              </th>

                              <th className="actions-column">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {ownDepartments.map(
                              (department) => (
                                <tr
                                  key={
                                    department._id
                                  }
                                >
                                  <td>
                                    <div className="table-department">
                                      <span className="department-dot" />

                                      <strong>
                                        {
                                          department.name
                                        }
                                      </strong>
                                    </div>
                                  </td>

                                  <td>
                                    <span className="status-badge">
                                      Active
                                    </span>
                                  </td>

                                  <td>
                                    <div className="row-actions table-actions">
                                      <button
                                        className="edit-button"
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
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}
                </>
              )}

            </section>
          )}

        </main>
      </div>

      {/* ==================================================
          DEPARTMENT MODAL
      ================================================== */}

      {showDepartmentModal && (
        <div
          className="modal-overlay"
          onClick={closeDepartmentModal}
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <p className="card-eyebrow">
                  DEPARTMENT MANAGEMENT
                </p>

                <h2>
                  {editingDepartment
                    ? "Edit Department"
                    : "Add Department"}
                </h2>

                <p>
                  {editingDepartment
                    ? "Update the department information."
                    : "Register a new department under your ministry."}
                </p>
              </div>

              <button
                className="close-button"
                onClick={
                  closeDepartmentModal
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSaveDepartment}
            >

              <div className="form-group">
                <label>Assigned Ministry</label>

                <div className="readonly-field">
                  <span className="ministry-icon small">
                    M
                  </span>

                  <span>
                    {assignedMinistry?.name ||
                      "No ministry assigned"}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="departmentName">
                  Department Name
                </label>

                <input
                  id="departmentName"
                  type="text"
                  value={departmentName}
                  onChange={(event) =>
                    setDepartmentName(
                      event.target.value
                    )
                  }
                  placeholder="Enter department name"
                  autoFocus
                />
              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeDepartmentModal
                  }
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

