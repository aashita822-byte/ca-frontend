// src/App.tsx
import React, { useEffect, useState } from "react";
import Auth from "./Auth";
import Chat from "./Chat";
import AdminPanel from "./AdminPanel";
import api from "./api";
import "./App.css";

type Role = "student" | "admin" | null;

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [checking, setChecking] = useState(true);

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
      {/* Top navigation */}
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">CA RAG Tutor</div>
          <div className="app-subtitle">
            Smart Q&amp;A assistant for CA students
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

      {/* Main content */}
      <div className="app-main-layout">
        {role === "admin" && (
          <aside className="app-sidebar">
            <AdminPanel />
          </aside>
        )}
        <main className="app-main">
          <Chat />
        </main>
      </div>
    </div>
  );
};

export default App;
