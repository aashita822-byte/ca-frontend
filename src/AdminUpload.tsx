import React, { useEffect, useRef, useState } from "react";
import api from "./api";
import "./App.css";

interface Doc {
  _id: string;
  filename: string;
  chapter?: string;
  section?: string;
  unit?: string;
  uploaded_at: string;
}

const VECTOR_DATA_FOLDERS = [
  {
    name: "CA Study Materials (All Levels)",
    url: "https://drive.google.com/drive/folders/1Yzg86vEm-7XhAaHXM7wSIhucYoEefa7u?usp=drive_link",
    desc: "Foundation, Intermediate & Final — all uploaded PDFs for vector indexing",
  },
];

const COURSES = ["Foundation", "Intermediate", "Final", "Other"] as const;

const AdminUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [course, setCourse] = useState<string>("Foundation");
  const [chapter, setChapter] = useState("");
  const [section, setSection] = useState("");
  const [unit, setUnit] = useState("");
  const [customHeading, setCustomHeading] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [groupedDocs, setGroupedDocs] = useState<Record<string, Doc[]>>({});
  const [docsLoading, setDocsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchDocs, setSearchDocs] = useState("");

  useEffect(() => { fetchGrouped(); }, []);

  const fetchGrouped = async () => {
    setDocsLoading(true);
    try {
      const res = await api.get("/admin/documents/grouped");
      setGroupedDocs(res.data);
      const init: Record<string, boolean> = {};
      Object.keys(res.data).forEach((k) => (init[k] = false));
      setExpanded(init);
    } catch { console.error("Failed to fetch grouped docs"); }
    finally { setDocsLoading(false); }
  };

  const toggleExpand = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) { setUploadError("Please select a PDF file first."); return; }
    setUploadError(""); setUploadSuccess(false);

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
      setUploadSuccess(true);
      setFile(null);
      setChapter(""); setSection(""); setUnit(""); setCustomHeading("");
      if (fileRef.current) fileRef.current.value = "";
      fetchGrouped();
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch {
      setUploadError("Upload failed. Please check the file and try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalDocs = Object.values(groupedDocs).reduce((acc, docs) => acc + docs.length, 0);

  const filteredGroups = Object.entries(groupedDocs).filter(([key, docs]) => {
    if (!searchDocs.trim()) return true;
    const q = searchDocs.toLowerCase();
    return key.toLowerCase().includes(q) || docs.some((d) =>
      d.filename.toLowerCase().includes(q) || d.chapter?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-upload-page">

      {/* ── PAGE HEADER ── */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Upload Study Materials</h1>
          <p className="admin-page-subtitle">
            Add PDFs to the CA knowledge base — they'll be indexed for AI search instantly.
          </p>
        </div>
        <div className="admin-header-stats">
          <div className="admin-header-stat">
            <span className="admin-header-stat-num">{totalDocs}</span>
            <span className="admin-header-stat-label">Total PDFs</span>
          </div>
          <div className="admin-header-stat">
            <span className="admin-header-stat-num">{Object.keys(groupedDocs).length}</span>
            <span className="admin-header-stat-label">Categories</span>
          </div>
        </div>
      </div>

      {/* ── UPLOAD CARD ── */}
      <div className="upload-section-grid">

        {/* Left: File drop zone */}
        <div className="upload-card">
          <div className="upload-card-title">
            <span className="upload-card-icon">📤</span>
            Select PDF File
          </div>

          <div
            className={`file-drop-zone${dragOver ? " file-drop-zone-active" : ""}${file ? " file-drop-zone-selected" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            aria-label="Drop PDF here or click to browse"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="file-selected-info">
                <span className="file-selected-icon">📄</span>
                <span className="file-selected-name">{file.name}</span>
                <span className="file-selected-size">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <button
                  className="file-remove-btn"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                >
                  Remove ✕
                </button>
              </div>
            ) : (
              <div className="file-drop-placeholder">
                <span className="file-drop-icon">📁</span>
                <span className="file-drop-main">Drop PDF here or click to browse</span>
                <span className="file-drop-sub">Only .pdf files accepted · Max 50MB</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata form */}
        <div className="upload-card">
          <div className="upload-card-title">
            <span className="upload-card-icon">🏷️</span>
            Metadata
          </div>

          {/* Course tabs */}
          <div className="course-tab-group" role="group" aria-label="Select course">
            {COURSES.map((c) => (
              <button
                key={c}
                type="button"
                className={`course-tab${course === c ? " course-tab-active" : ""}`}
                onClick={() => setCourse(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="upload-fields">
            <div className="upload-field">
              <label className="upload-label">Chapter Name</label>
              <input
                className="upload-input"
                placeholder="e.g. Accounting Standards"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
              />
            </div>
            <div className="upload-field">
              <label className="upload-label">Section Name</label>
              <input
                className="upload-input"
                placeholder="e.g. AS 9 – Revenue Recognition"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </div>
            <div className="upload-field">
              <label className="upload-label">Unit Name</label>
              <input
                className="upload-input"
                placeholder="e.g. Unit 1 – Overview"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="upload-field">
              <label className="upload-label">Additional Heading <span className="upload-label-opt">(optional)</span></label>
              <input
                className="upload-input"
                placeholder="Any extra tag or heading"
                value={customHeading}
                onChange={(e) => setCustomHeading(e.target.value)}
              />
            </div>
          </div>

          {uploadError && (
            <div className="upload-alert upload-alert-error">
              <span>⚠</span> {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="upload-alert upload-alert-success">
              <span>✅</span> PDF uploaded &amp; indexed successfully!
            </div>
          )}

          <button
            className="upload-submit-btn"
            onClick={handleUpload}
            disabled={loading || !file}
          >
            {loading ? (
              <><span className="auth-spinner" /> Uploading…</>
            ) : "Upload PDF →"}
          </button>
        </div>
      </div>

      {/* ── DRIVE LINK ── */}
      <div className="drive-section">
        <h2 className="drive-section-title">
          <span>☁️</span> Vector Knowledge Base
        </h2>
        <div className="drive-cards">
          {VECTOR_DATA_FOLDERS.map((folder) => (
            <div key={folder.name} className="drive-card">
              <div className="drive-card-info">
                <span className="drive-card-name">{folder.name}</span>
                <span className="drive-card-desc">{folder.desc}</span>
              </div>
              <a
                href={folder.url}
                target="_blank"
                rel="noreferrer"
                className="drive-open-btn"
              >
                Open in Drive →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ── UPLOADED DOCUMENTS ── */}
      <div className="docs-section">
        <div className="docs-section-header">
          <h2 className="docs-section-title">
            <span>📚</span> Uploaded Materials
            <span className="docs-total-badge">{totalDocs}</span>
          </h2>
          <div className="docs-search-wrap">
            <span className="docs-search-icon">🔍</span>
            <input
              className="docs-search-input"
              placeholder="Search by name or chapter…"
              value={searchDocs}
              onChange={(e) => setSearchDocs(e.target.value)}
            />
          </div>
        </div>

        {docsLoading ? (
          <div className="app-full-center" style={{ padding: "40px 0" }}>
            <div className="loader" />
            <span className="loader-text">Loading documents…</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="admin-empty-state">
            <span>📭</span>
            <p>{searchDocs ? "No documents match your search." : "No materials uploaded yet."}</p>
          </div>
        ) : (
          <div className="docs-accordion">
            {filteredGroups.map(([key, docs]) => {
              const filteredDocs = searchDocs
                ? docs.filter((d) =>
                    d.filename.toLowerCase().includes(searchDocs.toLowerCase()) ||
                    d.chapter?.toLowerCase().includes(searchDocs.toLowerCase())
                  )
                : docs;
              if (filteredDocs.length === 0) return null;

              return (
                <div key={key} className="docs-group">
                  <button
                    className="docs-group-header"
                    onClick={() => toggleExpand(key)}
                    aria-expanded={expanded[key]}
                  >
                    <div className="docs-group-left">
                      <span className="docs-group-arrow">{expanded[key] ? "▾" : "▸"}</span>
                      <span className="docs-group-name">{key}</span>
                    </div>
                    <span className="docs-group-badge">{filteredDocs.length} files</span>
                  </button>

                  {expanded[key] && (
                    <div className="docs-group-items">
                      {filteredDocs.map((doc) => (
                        <div key={doc._id} className="doc-item">
                          <div className="doc-item-left">
                            <span className="doc-item-icon">📄</span>
                            <div className="doc-item-info">
                              <span className="doc-item-name">{doc.filename}</span>
                              <div className="doc-item-meta">
                                {doc.chapter && <span>{doc.chapter}</span>}
                                {doc.section && <span>{doc.section}</span>}
                                {doc.unit && <span>{doc.unit}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="doc-item-right">
                            <span className="doc-item-date">
                              {new Date(doc.uploaded_at).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric"
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUpload;
