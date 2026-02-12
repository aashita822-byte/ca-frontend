import React, { useEffect, useState } from "react";
import Auth from "./Auth";
import Chat from "./Chat";
import AdminDashboard from "./AdminDashboard";
import AdminUpload from "./AdminUpload";
import api from "./api";
import "./App.css";

type Role = "student" | "admin" | null;
type AdminView = "dashboard" | "upload" | "chat";

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [checking, setChecking] = useState(true);
  const [adminView, setAdminView] = useState<AdminView>("dashboard");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setChecking(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        setRole(res.data.role);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setRole(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setRole(null);
  };

  if (checking) {
    return (
      <div className="app-full-center app-bg">
        <div className="loader" />
        <p className="loader-text">Loading your CA assistant…</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="app-bg">
        <Auth
          onLoggedIn={(r) => {
            setRole(r);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-root app-bg">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">CA RAG Tutor</div>
          <div className="app-subtitle">
            Smart Q&A assistant for CA students
          </div>
        </div>

        <div className="app-header-right">
          <span className="pill pill-ghost">
            Role: <strong>{role.toUpperCase()}</strong>
          </span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="app-main-layout">
        {role === "admin" && (
          <aside className="app-sidebar">
            <div
              className="admin-nav"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <button
                className={`btn ${
                  adminView === "dashboard" ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setAdminView("dashboard")}
              >
                📊 Dashboard
              </button>

              <button
                className={`btn ${
                  adminView === "upload" ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setAdminView("upload")}
              >
                📚 Upload Materials
              </button>

              <button
                className={`btn ${
                  adminView === "chat" ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setAdminView("chat")}
              >
                💬 Chat
              </button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="app-main">
          {role === "admin" ? (
            adminView === "dashboard" ? (
              <AdminDashboard />
            ) : adminView === "upload" ? (
              <AdminUpload />
            ) : (
              <Chat />
            )
          ) : (
            <Chat />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
