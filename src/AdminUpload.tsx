import React, { useEffect, useState } from "react";
import api from "./api";

interface Doc {
  _id: string;
  filename: string;
  chapter?: string;
  section?: string;
  unit?: string;
  uploaded_at: string;
}

/* ========================================
   VECTOR DATA FOLDERS (HARDCODED FOR NOW)
======================================== */
const VECTOR_DATA_FOLDERS = [
  {
    name: "CA Study Materials (All Levels)",
    url: "https://drive.google.com/drive/folders/1Yzg86vEm-7XhAaHXM7wSIhucYoEefa7u?usp=drive_link",
  },
];

const AdminUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [course, setCourse] = useState("Foundation");
  const [chapter, setChapter] = useState("");
  const [section, setSection] = useState("");
  const [unit, setUnit] = useState("");
  const [customHeading, setCustomHeading] = useState("");
  const [loading, setLoading] = useState(false);

  const [groupedDocs, setGroupedDocs] = useState<Record<string, Doc[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchGrouped();
  }, []);

  const fetchGrouped = async () => {
    try {
      const res = await api.get("/admin/documents/grouped");
      setGroupedDocs(res.data);

      const init: Record<string, boolean> = {};
      Object.keys(res.data).forEach((k) => (init[k] = false));
      setExpanded(init);
    } catch {
      console.error("Failed to fetch grouped docs");
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("course", course);
    fd.append("chapter", chapter);
    fd.append("section", section);
    fd.append("unit", unit);
    fd.append("custom_heading", customHeading);

    try {
      setLoading(true);
      await api.post("/admin/materials/upload", fd);
      alert("Upload successful");
      setFile(null);
      setChapter("");
      setSection("");
      setUnit("");
      setCustomHeading("");
      fetchGrouped();
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, maxWidth: 1150, margin: "0 auto" }}>

      {/* ================= Upload Card ================= */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Upload Study Material</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            style={inputStyle}
          >
            <option>Foundation</option>
            <option>Intermediate</option>
            <option>Final</option>
            <option>Other</option>
          </select>

          <input
            placeholder="Chapter Name"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Section Name"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Unit Name"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Additional Heading"
            value={customHeading}
            onChange={(e) => setCustomHeading(e.target.value)}
            style={inputStyle}
          />

          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            style={primaryBtn}
          >
            {loading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </div>

      {/* ================= VECTOR DATABASE DATA ================= */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>All Uploaded CA Data</h2>
        <p style={{ color: "#666", marginBottom: 16 }}>
          These folders contain CA materials currently used for vector indexing.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          {VECTOR_DATA_FOLDERS.map((folder) => (
            <div key={folder.name} style={driveRow}>
              <div>
                <strong>{folder.name}</strong>
              </div>

              <a
                href={folder.url}
                target="_blank"
                rel="noreferrer"
                style={secondaryBtn}
              >
                Open Folder →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ================= Uploaded Materials ================= */}
      <h2 style={{ ...titleStyle, marginTop: 20 }}>
        Recent Uploaded Materials
      </h2>

      {Object.keys(groupedDocs).length === 0 ? (
        <div>No materials uploaded yet.</div>
      ) : (
        Object.entries(groupedDocs).map(([key, docs]) => (
          <div key={key} style={{ marginBottom: 20 }}>
            <div onClick={() => toggleExpand(key)} style={sectionHeader}>
              <span>{expanded[key] ? "▼" : "▶"} {key}</span>
              <span style={badge}>{docs.length}</span>
            </div>

            {expanded[key] && (
              <div style={{ marginTop: 10 }}>
                {docs.map((doc) => (
                  <div key={doc._id} style={docCard}>
                    <strong>{doc.filename}</strong>

                    <div style={{ fontSize: 13, color: "#666" }}>
                      {doc.chapter} • {doc.section} • {doc.unit}
                    </div>

                    <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

/* ================= STYLES ================= */

const cardStyle: React.CSSProperties = {
  background: "#fff",
  padding: 24,
  borderRadius: 16,
  boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
  marginBottom: 25,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  marginBottom: 14,
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  padding: "12px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
  transition: "0.2s",
};

const secondaryBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: "#111",
  color: "#fff",
  borderRadius: 8,
  textDecoration: "none",
  fontSize: 13,
};

const sectionHeader: React.CSSProperties = {
  background: "#f3f4f6",
  padding: "12px 16px",
  borderRadius: 10,
  display: "flex",
  justifyContent: "space-between",
  cursor: "pointer",
  fontWeight: 600,
};

const badge: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  borderRadius: 20,
  padding: "3px 10px",
  fontSize: 12,
};

const docCard: React.CSSProperties = {
  background: "#fff",
  padding: 12,
  borderRadius: 8,
  marginBottom: 8,
  border: "1px solid #eee",
};

const driveRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  border: "1px solid #eee",
  borderRadius: 10,
};

export default AdminUpload;
