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

const crudApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ""}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

crudApi.interceptors.request.use(
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

const getId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    if (value._id) {
      return String(value._id);
    }

    if (value.id) {
      return String(value.id);
    }

    return null;
  }

  return String(value);
};

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

  const [message, setMessage] = useState("");
const [messageType, setMessageType] = useState("info");

const setUserMessage = (text, type = "info") => {
  setMessage(text || "Something went wrong.");
  setMessageType(type);
};
const [ministrySearch, setMinistrySearch] = useState("");

const [departmentVisibleCounts, setDepartmentVisibleCounts] =
  useState({});

const clearUserMessage = () => {
  setMessage("");
  setMessageType("info");
};

  const [showDepartmentModal, setShowDepartmentModal] =
    useState(false);

  const [editingDepartment, setEditingDepartment] =
    useState(null);

  const [departmentName, setDepartmentName] = useState("");

  const [selectedDepartmentMinistryId, setSelectedDepartmentMinistryId] =
    useState("");

  const [savingDepartment, setSavingDepartment] =
    useState(false);

   useEffect(() => {
  if (!message || messageType !== "success") {
    return;
  }

  const timer = setTimeout(() => {
    clearUserMessage();
  }, 3000);

  return () => clearTimeout(timer);
}, [message, messageType]);

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
        console.error(
          "Authentication validation failed:",
          err
        );

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

      const [
        ministriesResponse,
        departmentsResponse,
      ] = await Promise.all([
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

  const showMoreDepartments = (ministryId, total) => {
  setDepartmentVisibleCounts((current) => ({
    ...current,
    [ministryId]: Math.min(
      (current[ministryId] || 3) + 5,
      total
    ),
  }));
};

const showLessDepartments = (ministryId) => {
  setDepartmentVisibleCounts((current) => ({
    ...current,
    [ministryId]: 3,
  }));
};

  // ======================================================
  // ALL ASSIGNED MINISTRY IDS
  // ======================================================

  const assignedMinistryIds = useMemo(() => {
  return (user?.ministries || [])
    .map((ministry) => getId(ministry))
    .filter(Boolean);
}, [user]);

  // ======================================================
  // ALL ASSIGNED MINISTRIES
  // ======================================================

 const assignedMinistries = useMemo(() => {
  return ministries.filter((ministry) =>
    assignedMinistryIds.includes(
      getId(ministry)
    )
  );
}, [ministries, assignedMinistryIds]);

  // ======================================================
  // CHECK OWN MINISTRY
  // ======================================================

  const isOwnMinistry = (ministryId) => {
  const normalizedId = getId(ministryId);

  if (!normalizedId) {
    return false;
  }

  return assignedMinistryIds.includes(
    normalizedId
  );
};

  // ======================================================
  // OWN DEPARTMENTS
  // ======================================================

 const ownDepartments = useMemo(() => {
  return departments.filter((department) => {
    const ministryId = getId(
      department.ministry
    );

    return isOwnMinistry(ministryId);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [departments, assignedMinistryIds]);

const filteredMinistries = useMemo(() => {
  const search = ministrySearch.trim().toLowerCase();

  if (!search) {
    return ministries;
  }

  return ministries.filter((ministry) => {
    const ministryMatches =
      ministry.name?.toLowerCase().includes(search);

    const ministryDepartments = departments.filter(
      (department) => {
        const departmentMinistryId =
          getId(department.ministry);

        return (
          String(departmentMinistryId) ===
          String(ministry._id)
        );
      }
    );

    const departmentMatches =
      ministryDepartments.some((department) =>
        department.name?.toLowerCase().includes(search)
      );

    return ministryMatches || departmentMatches;
  });
}, [ministries, departments, ministrySearch]);
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
  if (assignedMinistries.length === 0) {
   setUserMessage(
  "No ministry has been assigned to your account.",
  "error"
);
    return;
  }

  setEditingDepartment(null);
  setDepartmentName("");

  setSelectedDepartmentMinistryId(
    getId(assignedMinistries[0])
  );

  setShowDepartmentModal(true);
};


// ======================================================
// EDIT DEPARTMENT
// ======================================================

const openEditDepartment = (department) => {
  const ministryId = getId(
    department.ministry
  );

  if (!isOwnMinistry(ministryId)) {
   setUserMessage(
  "You can only edit departments under your assigned ministries.",
  "error"
);
    return;
  }

  setEditingDepartment(department);

  setDepartmentName(
    department.name || ""
  );

  setSelectedDepartmentMinistryId(
    ministryId || ""
  );

  setShowDepartmentModal(true);
};

// ======================================================
// SAVE / UPDATE DEPARTMENT
// ======================================================

const handleSaveDepartment = async (event) => {
  event.preventDefault();

  const trimmedName = departmentName.trim();

  if (!trimmedName) {
    setUserMessage(
  "Please enter a department name.",
  "error"
);
    return;
  }

  let ministryId;

  if (editingDepartment) {
    ministryId = getId(editingDepartment.ministry);

   if (!isOwnMinistry(ministryId)) {
  setUserMessage(
    "You can only edit departments under your assigned ministries.",
    "error"
  );
  return;
}
  } else {
    ministryId = selectedDepartmentMinistryId;

    if (!ministryId) {
    setUserMessage(
  "Please select a ministry.",
  "error"
);
      return;
    }

    if (!isOwnMinistry(ministryId)) {
      setUserMessage(
  "You can only add departments to your assigned ministries.",
  "error"
);
      return;
    }
  }

  try {
    setSavingDepartment(true);

    if (editingDepartment) {
      // EDIT
      const response = await crudApi.patch(
        `/departments/${editingDepartment._id}`,
        {
          name: trimmedName,
          ministryId: ministryId,
        }
      );

      setDepartments((current) =>
        current.map((department) =>
          department._id === editingDepartment._id
            ? response.data
            : department
        )
      );
    } else {
      // ADD
      const response = await crudApi.post(
        "/departments",
        {
          name: trimmedName,
          ministryId: ministryId,
        }
      );

      setDepartments((current) => [
        ...current,
        response.data,
      ]);
    }

    setUserMessage(
  editingDepartment
    ? `Department "${trimmedName}" updated successfully.`
    : `Department "${trimmedName}" added successfully.`,
  "success"
);

closeDepartmentModal();
  } catch (err) {
    console.error(
      "Failed to save department:",
      err
    );

    setUserMessage(
  err.response?.data?.message ||
    "Failed to save department.",
  "error"
);
  } finally {
    setSavingDepartment(false);
  }
};

// ======================================================
// DELETE DEPARTMENT
// ======================================================

const handleDeleteDepartment = async (department) => {
  const ministryId = getId(
    department.ministry
  );

  if (!isOwnMinistry(ministryId)) {
    setUserMessage(
      "You can only delete departments under your assigned ministries.",
      "error"
    );
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete "${department.name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    await crudApi.delete(
      `/departments/${department._id}`
    );

    setDepartments((current) =>
      current.filter(
        (item) => item._id !== department._id
      )
    );

    setUserMessage(
      `Department "${department.name}" deleted successfully.`,
      "success"
    );
  } catch (err) {
    console.error(
      "Failed to delete department:",
      err
    );

    setUserMessage(
      err.response?.data?.message ||
        "Failed to delete department.",
      "error"
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
    setSelectedDepartmentMinistryId("");
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

        <h2>
          Ministry & Department Management System
        </h2>

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
            <strong>
              Government of Sri Lanka
            </strong>

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
            <span>ASSIGNED MINISTRIES</span>

            {assignedMinistries.length > 0 ? (
              assignedMinistries.map(
                (ministry) => (
                  <strong key={ministry._id}>
                    {ministry.name}
                  </strong>
                )
              )
            ) : (
              <strong>Not Assigned</strong>
            )}
          </div>

          <div className="sidebar-footer">
            <span>
              Authorized Government User
            </span>
          </div>
        </aside>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <main className="content">
            {message && (
  <div
    className={`admin-alert ${
      messageType === "error"
        ? "error-alert"
        : messageType === "success"
        ? "success-alert"
        : ""
    }`}
    role="alert"
  >
    <div className="alert-content">
      <strong>
        {messageType === "error"
          ? "Form error"
          : messageType === "success"
          ? "Success"
          : "Information"}
      </strong>

      <span>{message}</span>
    </div>

    <button
      type="button"
      className="alert-close"
      onClick={clearUserMessage}
      aria-label="Close alert"
    >
      ×
    </button>
  </div>
)}

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
                    Overview of ministries and
                    departments available in the
                    system.
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
                      You can view all ministries
                      and departments. Department
                      management is available for
                      all ministries assigned to
                      your account.
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
                    <span>
                      Total Ministries
                    </span>

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
                    <span>
                      Total Departments
                    </span>

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
                    <span>
                      My Departments
                    </span>

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

                    <h2>
                      Assigned Ministries
                    </h2>
                  </div>
                </div>

                {assignedMinistries.length > 0 ? (
                  <div className="assigned-ministry-list">

                    {assignedMinistries.map(
                      (ministry) => {

                        const ministryDepartmentCount =
                          departments.filter(
                            (department) => {
                              const departmentMinistryId =
                                department.ministry?._id ||
                                department.ministry;

                              return (
                                String(
                                  departmentMinistryId
                                ) ===
                                String(
                                  ministry._id
                                )
                              );
                            }
                          ).length;

                        return (
                          <div
                            className="assigned-ministry"
                            key={ministry._id}
                          >
                            <div className="ministry-symbol">
                              M
                            </div>

                            <div>
                              <strong>
                                {ministry.name}
                              </strong>

                              <span>
                                {
                                  ministryDepartmentCount
                                }{" "}
                                department
                                {ministryDepartmentCount !==
                                1
                                  ? "s"
                                  : ""}{" "}
                                under your management
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}

                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>
                      No Ministry Assigned
                    </h3>

                    <p>
                      Your account has not been
                      assigned to a ministry. Please
                      contact the administrator.
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

              {assignedMinistries.length > 0 && (
                <div className="own-ministry-banner">

                  <div className="banner-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Your Assigned Ministries
                    </strong>

                    <span>
                      {assignedMinistries
                        .map(
                          (ministry) =>
                            ministry.name
                        )
                        .join(", ")}
                    </span>
                  </div>

                </div>
              )}

              <div className="directory-search">
  <input
    type="text"
    placeholder="Search ministries or departments..."
    value={ministrySearch}
    onChange={(event) =>
      setMinistrySearch(event.target.value)
    }
  />

  {ministrySearch && (
    <button
      type="button"
      className="search-clear-button"
      onClick={() => setMinistrySearch("")}
      aria-label="Clear search"
    >
      ×
    </button>
  )}
</div>

              <div className="ministry-grid">

                {filteredMinistries.length === 0 ? (
  <div className="empty-state">
    {ministrySearch
      ? "No ministries or departments match your search."
      : "No ministries found."}
  </div>
) : (
  filteredMinistries.map((ministry) => {
    const ministryDepartments = departments.filter(
      (department) => {
        const departmentMinistryId =
          getId(department.ministry);

        return (
          String(departmentMinistryId) ===
          String(ministry._id)
        );
      }
    );

    const canManage = isOwnMinistry(ministry._id);

    const visibleCount =
      departmentVisibleCounts[ministry._id] || 3;

    const search = ministrySearch.trim().toLowerCase();

    /*
     * When searching for a department, make sure the
     * matching department is visible even if it is
     * beyond the first 3 departments.
     */
    const ministryMatchesSearch =
  search && ministry.name?.toLowerCase().includes(search);

const matchingDepartments = search
  ? ministryDepartments.filter((department) =>
      department.name?.toLowerCase().includes(search)
    )
  : [];

const visibleDepartments = search && matchingDepartments.length > 0
  ? [
      ...matchingDepartments,
      ...ministryDepartments.filter(
        (department) =>
          !matchingDepartments.some(
            (matched) => matched._id === department._id
          )
      ),
    ].slice(
      0,
      Math.max(visibleCount, matchingDepartments.length)
    )
  : ministryDepartments.slice(0, visibleCount);
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
              <h3>{ministry.name}</h3>

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
          <span>Departments</span>

          <span>
            {ministryDepartments.length}
          </span>
        </div>

        <div className="department-list">

          {ministryDepartments.length === 0 ? (
            <p className="empty-text">
              No departments registered.
            </p>
          ) : (
            <>
              {visibleDepartments.map((department) => (
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
              ))}

              {ministryDepartments.length > 3 && (
                  <div className="department-pagination">

                    {visibleCount <
                    ministryDepartments.length ? (
                      <button
                        className="show-more-button"
                        onClick={() =>
                          showMoreDepartments(
                            ministry._id,
                            ministryDepartments.length
                          )
                        }
                      >
                        Show More
                        <span>
                          +
                          {Math.min(
                            5,
                            ministryDepartments.length -
                              visibleCount
                          )}
                        </span>
                      </button>
                    ) : (
                      <button
                        className="show-more-button"
                        onClick={() =>
                          showLessDepartments(
                            ministry._id
                          )
                        }
                      >
                        Show Less
                      </button>
                    )}

                  </div>
                )}

            </>
          )}

        </div>

        {canManage && (
          <button
            className="manage-department-button"
            onClick={() => {
              setActivePage("departments");
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

                  <h1>
                    My Departments
                  </h1>

                  <p>
                    Manage departments under all
                    ministries assigned to your
                    account.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={openAddDepartment}
                  disabled={
                    assignedMinistries.length === 0
                  }
                >
                  + Add Department
                </button>

              </div>

              {assignedMinistries.length === 0 ? (

                <div className="empty-state large">

                  <div className="empty-icon">
                    !
                  </div>

                  <h3>
                    No Ministry Assigned
                  </h3>

                  <p>
                    Your account has not been
                    assigned to a ministry. Please
                    contact the administrator.
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
                        Assigned Ministries
                      </strong>

                      <span>
                        {assignedMinistries
                          .map(
                            (ministry) =>
                              ministry.name
                          )
                          .join(", ")}
                      </span>

                      <small>
                        You have permission to add,
                        edit and delete departments
                        under these ministries.
                      </small>

                    </div>

                  </div>

                  {ownDepartments.length === 0 ? (

                    <div className="empty-state large">

                      <div className="empty-icon">
                        D
                      </div>

                      <h3>
                        No Departments
                      </h3>

                      <p>
                        There are currently no
                        departments under your
                        assigned ministries.
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
                            My Assigned Ministries
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
                                Ministry
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
                              (department) => {

                                const departmentMinistryId =
                                  department.ministry?._id ||
                                  department.ministry;

                                const departmentMinistry =
                                  ministries.find(
                                    (ministry) =>
                                      String(
                                        ministry._id
                                      ) ===
                                      String(
                                        departmentMinistryId
                                      )
                                  );

                                return (
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

                                      <span>
                                        {departmentMinistry
                                          ? departmentMinistry.name
                                          : "Unknown Ministry"}
                                      </span>

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
                                );
                              }
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
                    : "Register a new department under one of your assigned ministries."}
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

              {/* ==================================================
                  MINISTRY SELECTION
              ================================================== */}

              <div className="form-group">

                <label htmlFor="departmentMinistry">
                  Ministry
                </label>

                {editingDepartment ? (

                  <div className="readonly-field">

                    <span className="ministry-icon small">
                      M
                    </span>

                    <span>
                      {
                        assignedMinistries.find(
                          (ministry) =>
                            String(
                              ministry._id
                            ) ===
                            String(
                              selectedDepartmentMinistryId
                            )
                        )?.name ||
                        "Assigned Ministry"
                      }
                    </span>

                  </div>

                ) : (

                  <select
                    id="departmentMinistry"
                    value={
                      selectedDepartmentMinistryId
                    }
                    onChange={(event) =>
                      setSelectedDepartmentMinistryId(
                        event.target.value
                      )
                    }
                    required
                  >

                    <option value="">
                      Select Ministry
                    </option>

                    {assignedMinistries.map(
                      (ministry) => (
                        <option
                          key={ministry._id}
                          value={ministry._id}
                        >
                          {ministry.name}
                        </option>
                      )
                    )}

                  </select>

                )}

              </div>

              {/* ==================================================
                  DEPARTMENT NAME
              ================================================== */}

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

              {/* ==================================================
                  MODAL ACTIONS
              ================================================== */}

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