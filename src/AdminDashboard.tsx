import React, { useEffect, useState } from "react";
import api from "./api";

type Student = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  ca_level?: string;
  ca_attempt?: number;
  status?: string;
};

const AdminDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await api.get("/admin/students");
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const approveStudent = async (id: string) => {
    try {
      setActionLoading(id);
      await api.post(`/admin/approve/${id}`);
      fetchStudents();
    } catch {
      alert("Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const pending = students.filter((s) => s.status === "pending");
  const approved = students.filter((s) => s.status === "approved");

  if (loading)
    return (
      <div className="admin-loading">
        <div className="loader" />
        <p>Loading dashboard...</p>
      </div>
    );

  return (
    <div className="admin-dashboard-container">

      {/* HEADER */}
      <div className="admin-dashboard-header">
        <div>
          <h1 className="admin-dashboard-title">Admin Control Center</h1>
          <p className="admin-dashboard-subtitle">
            Manage student approvals and monitor platform access
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="admin-stats-modern">
        <div className="stat-card-modern total">
          <div className="stat-number">{students.length}</div>
          <div className="stat-label">Total Students</div>
        </div>

        <div className="stat-card-modern pending">
          <div className="stat-number">{pending.length}</div>
          <div className="stat-label">Pending Approval</div>
        </div>

        <div className="stat-card-modern approved">
          <div className="stat-number">{approved.length}</div>
          <div className="stat-label">Approved Students</div>
        </div>
      </div>

      {/* PENDING SECTION */}
      <section className="admin-section">
        <div className="section-header">
          <h2>Pending Students</h2>
          <span className="section-count">{pending.length}</span>
        </div>

        {pending.length === 0 ? (
          <div className="empty-state">
            🎉 No students awaiting approval
          </div>
        ) : (
          <div className="student-grid-modern">
            {pending.map((student) => (
              <div key={student._id} className="student-card-modern">

                <div className="student-card-header">
                  <div>
                    <h3>{student.name || "Unnamed Student"}</h3>
                    <p className="student-email">{student.email}</p>
                  </div>
                  <span className="badge-modern pending">Pending</span>
                </div>

                <div className="student-details">
                  <div>
                    <strong>Level:</strong> {student.ca_level}
                  </div>
                  <div>
                    <strong>Attempt:</strong> {student.ca_attempt}
                  </div>
                </div>

                <div className="student-actions-modern">
                  <button
                    className="btn-modern approve"
                    disabled={actionLoading === student._id}
                    onClick={() => approveStudent(student._id)}
                  >
                    {actionLoading === student._id
                      ? "Approving..."
                      : "Approve Student"}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* APPROVED SECTION */}
      <section className="admin-section">
        <div className="section-header">
          <h2>Approved Students</h2>
          <span className="section-count">{approved.length}</span>
        </div>

        {approved.length === 0 ? (
          <div className="empty-state">
            No approved students yet
          </div>
        ) : (
          <div className="student-grid-modern">
            {approved.map((student) => (
              <div
                key={student._id}
                className="student-card-modern approved-card"
              >
                <div className="student-card-header">
                  <div>
                    <h3>{student.name || "Unnamed Student"}</h3>
                    <p className="student-email">{student.email}</p>
                  </div>
                  <span className="badge-modern approved">Approved</span>
                </div>

                <div className="student-details">
                  <div>
                    <strong>Level:</strong> {student.ca_level}
                  </div>
                  <div>
                    <strong>Attempt:</strong> {student.ca_attempt}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};

export default AdminDashboard;
