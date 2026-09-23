import { useState } from "react";
import "./App.css";

const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api`;
const ADMIN_API = API_BASE;
const MINISTRY_API = `${API_BASE}/user`;

const ADMIN_PORTAL = "/apps/admin/";
const MINISTRY_PORTAL = "/apps/user/";

function App() {
  const [showLogin, setShowLogin] = useState(false);

  const [credentials, setCredentials] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ======================================================
  // LOGIN
  // ======================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    const identifier = credentials.identifier.trim();
    const password = credentials.password;

    if (!password) {
      setError("Please enter your password.");
      setLoading(false);
      return;
    }

    const isAdminLogin = !identifier;
    const targetName = isAdminLogin ? "Admin" : "Ministry";

    try {
      // ==================================================
      // ADMIN LOGIN (no username provided)
      // ==================================================

      if (isAdminLogin) {
        const adminResponse = await fetch(
          `${ADMIN_API}/auth/admin-login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          }
        );

        const adminData = await adminResponse.json();

        if (!adminResponse.ok) {
          throw new Error(
            adminData.message || "Invalid administrator password."
          );
        }

        sessionStorage.setItem("adminAuthenticated", "true");
        sessionStorage.setItem(
          "adminUser",
          JSON.stringify({ name: "Admin", role: "Admin" })
        );

        window.location.href = ADMIN_PORTAL;
        return;
      }

      // ==================================================
      // MINISTRY USER LOGIN (username/email provided)
      // ==================================================

      const ministryResponse = await fetch(
        `${MINISTRY_API}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        }
      );

      let ministryData = {};
      try {
        ministryData = await ministryResponse.json();
      } catch {
        ministryData = {};
      }

      if (!ministryResponse.ok) {
        throw new Error(
          ministryData.message ||
            `Login failed (${ministryResponse.status}).`
        );
      }

      if (!ministryData.token) {
        throw new Error(
          "Login succeeded, but no authentication token was returned."
        );
      }

      localStorage.setItem("token", ministryData.token);
      localStorage.setItem(
        "user",
        JSON.stringify(ministryData.user)
      );

      window.location.href = MINISTRY_PORTAL;
    } catch (err) {
      console.error("Login error:", err);

      if (
        err instanceof TypeError &&
        err.message === "Failed to fetch"
      ) {
        // Network error — but on which backend?
        setError(
            `Unable to connect to the ${targetName} backend. Make sure the server is running.`
        );
      } else {
        setError(err.message || "Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // NAVIGATION
  // ======================================================

  const goToLogin = () => {
    setShowLogin(true);
    setError("");
  };

  const goToHome = () => {
    setShowLogin(false);
    setCredentials({ identifier: "", password: "" });
    setError("");
  };

  // ======================================================
  // LOGIN PAGE
  // ======================================================

  if (showLogin) {
    return (
      <div className="portal-shell">
        <header className="gov-header">
          <img src="/gov-logo.jpg" alt="Government of Sri Lanka" />
          <div>
            <span>Government of Sri Lanka</span>
            <h1>Ministry &amp; Department Management System</h1>
          </div>
        </header>

        <main className="login-area">
          <button
            type="button"
            className="back-link"
            onClick={goToHome}
          >
            ← Back to Home
          </button>

          <section className="login-card">
            <div className="login-icon">SL</div>
            <p className="eyebrow">SYSTEM ACCESS</p>
            <h2>Sign In</h2>
            <p className="login-description">
              Enter your authorized username or email address and
              password to continue.
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin}>
              <label htmlFor="identifier">
                Username or Email Address
              </label>
              <input
                id="identifier"
                type="text"
                value={credentials.identifier}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    identifier: e.target.value,
                  })
                }
                placeholder="Username or email"
                autoComplete="username"
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    password: e.target.value,
                  })
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <small>Authorized Government users only</small>
          </section>
        </main>

        <footer>
          © Government of Sri Lanka • Ministry &amp; Department
          Management System
        </footer>
      </div>
    );
  }

  // ======================================================
  // HOME PAGE
  // ======================================================

  return (
    <div className="portal-shell home">
      <header className="gov-header">
        <img src="/gov-logo.jpg" alt="Government of Sri Lanka" />
        <div>
          <span>Government of Sri Lanka</span>
          <h1>Ministry &amp; Department Management System</h1>
        </div>
      </header>

      <main className="home-content">
        <div className="welcome">
          <p className="eyebrow">OFFICIAL GOVERNMENT PORTAL</p>
          <h2>Welcome</h2>
          <p>
            Access the Ministry &amp; Department Management System
            using your authorized credentials.
          </p>
          <button
            type="button"
            className="login-button home-login-button"
            onClick={goToLogin}
          >
            Continue to Sign In →
          </button>
        </div>

        <div className="notice">
          <strong>Access Notice</strong>
          <span>
            This system is intended for authorized Government of Sri
            Lanka users only.
          </span>
        </div>
      </main>

      <footer>
        © Government of Sri Lanka • Ministry &amp; Department
        Management System
      </footer>
    </div>
  );
}

export default App;