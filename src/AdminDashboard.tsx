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

  if (loading) return <div className="admin-loading">Loading dashboard...</div>;

  return (
    <div className="admin-dashboard">

      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Student Approval Management</p>
      </div>

      {/* Stats */}
      <div className="admin-stats">

        <div className="stat-card total">
          <div className="stat-number">{students.length}</div>
          <div className="stat-label"><strong>Total Students</strong></div>
        </div>

        <div className="stat-card pending">
          <div className="stat-number">{pending.length}</div>
          <div className="stat-label"><strong>Pending Approval</strong></div>
        </div>

        <div className="stat-card approved">
          <div className="stat-number">{approved.length}</div>
          <div className="stat-label"><strong>Approved Students</strong></div>
        </div>

      </div>

      {/* Pending Section */}
      <section>
        <h2 className="section-title strong-title">
          Pending Students ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="empty-box">No students awaiting approval</div>
        ) : (
          <div className="student-grid">
            {pending.map((student) => (
              <div key={student._id} className="student-card">

                <div className="student-header">
                  <h3>{student.name || "Unnamed Student"}</h3>
                  <span className="badge pending-badge">Pending</span>
                </div>

                <p className="student-email">{student.email}</p>

                <div className="student-meta">
                  {student.ca_level} • Attempt {student.ca_attempt}
                </div>

                <div className="student-actions">
                  <button
                    className="btn-approve"
                    disabled={actionLoading === student._id}
                    onClick={() => approveStudent(student._id)}
                  >
                    Approve
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved Section */}
      <section style={{ marginTop: 50 }}>
        <h2 className="section-title strong-title">
          Approved Students ({approved.length})
        </h2>

        {approved.length === 0 ? (
          <div className="empty-box">No approved students yet</div>
        ) : (
          <div className="student-grid">
            {approved.map((student) => (
              <div key={student._id} className="student-card approved-card">

                <div className="student-header">
                  <h3>{student.name || "Unnamed Student"}</h3>
                  <span className="badge approved-badge">Approved</span>
                </div>

                <p className="student-email">{student.email}</p>

                <div className="student-meta">
                  {student.ca_level} • Attempt {student.ca_attempt}
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
