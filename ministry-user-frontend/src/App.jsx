import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5002/api";

const COMMON_PORTAL =
  "http://localhost:5175/";

const api = axios.create({
  baseURL: API_URL,
});

/*
 * Add JWT token to every request
 */
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

function App() {
  /*
   * ==============================================
   * USER
   * ==============================================
   */

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  /*
   * ==============================================
   * PAGE
   * ==============================================
   */

  const [page, setPage] =
    useState("dashboard");

  /*
   * ==============================================
   * DATA
   * ==============================================
   */

  const [ministries, setMinistries] =
    useState([]);

  const [departments, setDepartments] =
    useState([]);

  /*
   * ==============================================
   * UI
   * ==============================================
   */

  const [selectedMinistry, setSelectedMinistry] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ==============================================
   * DEPARTMENT FORM
   * ==============================================
   */

  const [showDepartmentModal, setShowDepartmentModal] =
    useState(false);

  const [editingDepartment, setEditingDepartment] =
    useState(null);

  const [departmentForm, setDepartmentForm] =
    useState({
      name: "",
      description: "",
    });

  /*
   * ==============================================
   * AUTHENTICATION CHECK
   * ==============================================
   */

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user");

    const token =
      localStorage.getItem("token");

    /*
     * If user did not come through
     * the common login page,
     * send them back there.
     */

    if (!savedUser || !token) {
      window.location.href =
        COMMON_PORTAL;

      return;
    }

    try {
      setUser(
        JSON.parse(savedUser)
      );
    } catch (error) {
      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "token"
      );

      window.location.href =
        COMMON_PORTAL;

      return;
    }

    loadData();
  }, []);

  /*
   * ==============================================
   * LOAD ALL DATA
   * ==============================================
   */

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        ministriesResponse,
        departmentsResponse,
      ] = await Promise.all([
        api.get("/ministries"),
        api.get("/departments"),
      ]);

      setMinistries(
        ministriesResponse.data
      );

      setDepartments(
        departmentsResponse.data
      );
    } catch (error) {
      console.error(error);

      if (
        error.response?.status === 401
      ) {
        logout();
        return;
      }

      setError(
        error.response?.data?.message ||
          "Failed to load data."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==============================================
   * LOGOUT
   * ==============================================
   */

  const logout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    setUser(null);
    setMinistries([]);
    setDepartments([]);

    /*
     * Return to common Home page
     */
    window.location.href =
      COMMON_PORTAL;
  };

  /*
   * ==============================================
   * CHECK OWN MINISTRY
   * ==============================================
   */

  const isOwnMinistry = (
    ministryId
  ) => {
    if (!user?.ministry?._id) {
      return false;
    }

    return (
      user.ministry._id.toString() ===
      ministryId?.toString()
    );
  };

  /*
   * ==============================================
   * GET OWN DEPARTMENTS
   * ==============================================
   */

  const ownDepartments =
    departments.filter(
      (department) =>
        department.ministry?._id ===
        user?.ministry?._id ||
        department.ministryId ===
        user?.ministry?._id
    );

  /*
   * ==============================================
   * OPEN ADD DEPARTMENT
   * ==============================================
   */

  const openAddDepartment = () => {
    if (!user?.ministry?._id) {
      setError(
        "Your account is not assigned to a ministry."
      );

      return;
    }

    setEditingDepartment(null);

    setDepartmentForm({
      name: "",
      description: "",
    });

    setShowDepartmentModal(true);
  };

  /*
   * ==============================================
   * OPEN EDIT DEPARTMENT
   * ==============================================
   */

  const openEditDepartment = (
    department
  ) => {
    if (
      !isOwnMinistry(
        department.ministry?._id ||
          department.ministryId
      )
    ) {
      setError(
        "You can only edit departments within your assigned ministry."
      );

      return;
    }

    setEditingDepartment(
      department
    );

    setDepartmentForm({
      name:
        department.name || "",
      description:
        department.description ||
        "",
    });

    setShowDepartmentModal(
      true
    );
  };

  /*
   * ==============================================
   * SAVE DEPARTMENT
   * ==============================================
   */

  const saveDepartment = async (
    event
  ) => {
    event.preventDefault();

    if (!departmentForm.name.trim()) {
      setError(
        "Department name is required."
      );

      return;
    }

    if (!user?.ministry?._id) {
      setError(
        "Your account is not assigned to a ministry."
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * EDIT
       */

      if (editingDepartment) {
        await api.patch(
          `/departments/${editingDepartment._id}`,
          {
            name:
              departmentForm.name.trim(),

            description:
              departmentForm.description.trim(),
          }
        );
      }

      /*
       * CREATE
       */

      else {
        await api.post(
          "/departments",
          {
            name:
              departmentForm.name.trim(),

            description:
              departmentForm.description.trim(),

            ministryId:
              user.ministry._id,
          }
        );
      }

      setShowDepartmentModal(
        false
      );

      setEditingDepartment(
        null
      );

      setDepartmentForm({
        name: "",
        description: "",
      });

      await loadData();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Failed to save department."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==============================================
   * DELETE DEPARTMENT
   * ==============================================
   */

  const deleteDepartment = async (
    department
  ) => {
    if (
      !isOwnMinistry(
        department.ministry?._id ||
          department.ministryId
      )
    ) {
      setError(
        "You can only delete departments within your assigned ministry."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${department.name}"?`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.delete(
        `/departments/${department._id}`
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Failed to delete department."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==============================================
   * MINISTRY DETAILS
   * ==============================================
   */

  const openMinistry = (
    ministry
  ) => {
    setSelectedMinistry(
      ministry
    );

    setPage("ministry-details");
  };

  /*
   * ==============================================
   * NOT LOGGED IN
   * ==============================================
   */

  if (!user) {
    return null;
  }

  /*
   * ==============================================
   * DASHBOARD
   * ==============================================
   */

  const renderDashboard =
    () => {
      return (
        <div className="page-content">
          <div className="page-header">
            <div>
              <p className="eyebrow">
                MINISTRY PORTAL
              </p>

              <h2>
                Welcome, {user.name}
              </h2>

              <p>
                View ministries and
                departments available
                within the system.
              </p>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <span>
                Total Ministries
              </span>

              <strong>
                {ministries.length}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                Total Departments
              </span>

              <strong>
                {departments.length}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                My Departments
              </span>

              <strong>
                {ownDepartments.length}
              </strong>
            </div>
          </div>

          <section className="content-card">
            <div className="section-header">
              <div>
                <h3>
                  All Departments
                </h3>

                <p>
                  All authorized ministry
                  users can view departments.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={
                  openAddDepartment
                }
              >
                + Add Department
              </button>
            </div>

            {departments.length === 0 ? (
              <p className="empty-state">
                No departments found.
              </p>
            ) : (
              <div className="department-grid">
                {departments.map(
                  (department) => {
                    const own =
                      isOwnMinistry(
                        department
                          .ministry?._id ||
                          department.ministryId
                      );

                    return (
                      <div
                        className="department-card"
                        key={
                          department._id
                        }
                      >
                        <div>
                          <h4>
                            {
                              department.name
                            }
                          </h4>

                          <p>
                            {
                              department.description ||
                              "No description available."
                            }
                          </p>

                          <small>
                            Ministry:{" "}
                            {department
                              .ministry
                              ?.name ||
                              "Unknown"}
                          </small>
                        </div>

                        {own && (
                          <div className="card-actions">
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
                              onClick={() =>
                                deleteDepartment(
                                  department
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>
      );
    };

  /*
   * ==============================================
   * MINISTRIES
   * ==============================================
   */

  const renderMinistries =
    () => {
      return (
        <div className="page-content">
          <div className="page-header">
            <p className="eyebrow">
              MINISTRIES
            </p>

            <h2>
              All Ministries
            </h2>

            <p>
              View all ministries registered
              in the system.
            </p>
          </div>

          <div className="ministry-grid">
            {ministries.map(
              (ministry) => (
                <button
                  className="ministry-card"
                  key={ministry._id}
                  onClick={() =>
                    openMinistry(
                      ministry
                    )
                  }
                >
                  <h3>
                    {ministry.name}
                  </h3>

                  <span>
                    View Ministry →
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      );
    };

  /*
   * ==============================================
   * MINISTRY DETAILS
   * ==============================================
   */

  const renderMinistryDetails =
    () => {
      if (!selectedMinistry) {
        return null;
      }

      const ministryDepartments =
        departments.filter(
          (department) =>
            department.ministry?._id ===
              selectedMinistry._id ||
            department.ministryId ===
              selectedMinistry._id
        );

      return (
        <div className="page-content">
          <button
            className="back-link"
            onClick={() =>
              setPage(
                "ministries"
              )
            }
          >
            ← Back to Ministries
          </button>

          <div className="page-header">
            <p className="eyebrow">
              MINISTRY
            </p>

            <h2>
              {selectedMinistry.name}
            </h2>
          </div>

          <section className="content-card">
            <div className="section-header">
              <div>
                <h3>
                  Departments
                </h3>

                <p>
                  Departments belonging
                  to this ministry.
                </p>
              </div>
            </div>

            {ministryDepartments.length ===
            0 ? (
              <p className="empty-state">
                No departments found.
              </p>
            ) : (
              <div className="department-grid">
                {ministryDepartments.map(
                  (department) => (
                    <div
                      className="department-card"
                      key={
                        department._id
                      }
                    >
                      <h4>
                        {
                          department.name
                        }
                      </h4>

                      <p>
                        {
                          department.description ||
                          "No description available."
                        }
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      );
    };

  /*
   * ==============================================
   * MY DEPARTMENTS
   * ==============================================
   */

  const renderMyDepartments =
    () => {
      return (
        <div className="page-content">
          <div className="page-header">
            <p className="eyebrow">
              MY MINISTRY
            </p>

            <h2>
              My Departments
            </h2>

            <p>
              Manage departments belonging
              to your assigned ministry.
            </p>
          </div>

          <div className="section-header">
            <div>
              <h3>
                {user.ministry?.name ||
                  "Assigned Ministry"}
              </h3>
            </div>

            <button
              className="primary-button"
              onClick={
                openAddDepartment
              }
            >
              + Add Department
            </button>
          </div>

          <div className="department-grid">
            {ownDepartments.length ===
            0 ? (
              <p className="empty-state">
                No departments found for
                your ministry.
              </p>
            ) : (
              ownDepartments.map(
                (department) => (
                  <div
                    className="department-card"
                    key={
                      department._id
                    }
                  >
                    <h4>
                      {
                        department.name
                      }
                    </h4>

                    <p>
                      {
                        department.description ||
                        "No description available."
                      }
                    </p>

                    <div className="card-actions">
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
                        onClick={() =>
                          deleteDepartment(
                            department
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      );
    };

  /*
   * ==============================================
   * MAIN PORTAL
   * ==============================================
   */

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img
            src="/gov-logo.jpg"
            alt="Government of Sri Lanka"
          />

          <div>
            <strong>
              Ministry & Department
            </strong>

            <span>
              Management System
            </span>
          </div>
        </div>

        <nav>
          <button
            className={
              page === "dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={
              page === "ministries" ||
              page ===
                "ministry-details"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage("ministries")
            }
          >
            Ministries
          </button>

          <button
            className={
              page ===
              "my-departments"
                ? "active"
                : ""
            }
            onClick={() =>
              setPage(
                "my-departments"
              )
            }
          >
            My Departments
          </button>
        </nav>

        <div className="sidebar-user">
          <strong>
            {user.name}
          </strong>

          <span>
            {user.email}
          </span>

          <span>
            {user.ministry?.name ||
              "No Ministry Assigned"}
          </span>

          <button
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {loading && (
          <div className="loading-bar">
            Loading...
          </div>
        )}

        {page === "dashboard" &&
          renderDashboard()}

        {page === "ministries" &&
          renderMinistries()}

        {page ===
          "ministry-details" &&
          renderMinistryDetails()}

        {page ===
          "my-departments" &&
          renderMyDepartments()}
      </main>

      /*
       * ============================================
       * DEPARTMENT MODAL
       * ============================================
       */

      {showDepartmentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {editingDepartment
                    ? "EDIT DEPARTMENT"
                    : "NEW DEPARTMENT"}
                </p>

                <h2>
                  {editingDepartment
                    ? "Edit Department"
                    : "Add Department"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setShowDepartmentModal(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                saveDepartment
              }
            >
              <label>
                Ministry
              </label>

              <input
                value={
                  user.ministry?.name ||
                  ""
                }
                disabled
              />

              <label>
                Department Name
              </label>

              <input
                value={
                  departmentForm.name
                }
                onChange={(event) =>
                  setDepartmentForm({
                    ...departmentForm,
                    name:
                      event.target.value,
                  })
                }
                placeholder="Enter department name"
                required
              />

              <label>
                Description
              </label>

              <textarea
                value={
                  departmentForm.description
                }
                onChange={(event) =>
                  setDepartmentForm({
                    ...departmentForm,
                    description:
                      event.target.value,
                  })
                }
                placeholder="Enter department description"
                rows="4"
              />

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() =>
                    setShowDepartmentModal(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={loading}
                >
                  {loading
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