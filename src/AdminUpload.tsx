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

      const initialExpand: Record<string, boolean> = {};
      Object.keys(res.data).forEach((key) => {
        initialExpand[key] = true;
      });
      setExpanded(initialExpand);
    } catch {
      console.error("Failed to fetch grouped documents");
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("course", course);
    formData.append("chapter", chapter);
    formData.append("section", section);
    formData.append("unit", unit);
    formData.append("custom_heading", customHeading);

    try {
      setLoading(true);
      await api.post("/admin/materials/upload", formData);
      alert("Upload successful!");
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
    <div style={{ padding: 30 }}>
      {/* ---------------- Upload Card ---------------- */}
      <div
        style={{
          background: "white",
          padding: 25,
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          marginBottom: 40,
        }}
      >
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 20 }}>
          📤 Upload Study Material
        </h2>

        <div style={{ display: "grid", gap: 15 }}>
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
            style={{
              padding: "12px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 10,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {loading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </div>

      {/* ---------------- Uploaded Materials ---------------- */}
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 20 }}>
        📚 Uploaded Study Materials
      </h2>

      {Object.keys(groupedDocs).length === 0 ? (
        <div>No materials uploaded yet.</div>
      ) : (
        Object.entries(groupedDocs).map(([key, docs]) => (
          <div key={key} style={{ marginBottom: 25 }}>
            <div
              onClick={() => toggleExpand(key)}
              style={{
                cursor: "pointer",
                padding: "12px 16px",
                background: "#f3f4f6",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 600,
              }}
            >
              <span>
                {expanded[key] ? "▼" : "▶"} {key}
              </span>
              <span
                style={{
                  background: "#4f46e5",
                  color: "white",
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontSize: 12,
                }}
              >
                {docs.length}
              </span>
            </div>

            {expanded[key] && (
              <div
                style={{
                  marginTop: 12,
                  paddingLeft: 15,
                  borderLeft: "3px solid #e5e7eb",
                }}
              >
                {docs.map((doc) => (
                  <div
                    key={doc._id}
                    style={{
                      padding: 12,
                      background: "white",
                      borderRadius: 10,
                      marginBottom: 10,
                      boxShadow: "0 5px 15px rgba(0,0,0,0.03)",
                    }}
                  >
                    <strong>{doc.filename}</strong>

                    <div style={{ fontSize: 13, color: "#555" }}>
                      {doc.chapter && <>Chapter: {doc.chapter} • </>}
                      {doc.section && <>Section: {doc.section} • </>}
                      {doc.unit && <>Unit: {doc.unit}</>}
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

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 14,
};

export default AdminUpload;
