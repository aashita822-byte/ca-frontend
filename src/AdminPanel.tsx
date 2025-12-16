// src/AdminPanel.tsx
import React, { useEffect, useState, useRef } from "react";
import api from "./api";
import "./App.css";

interface Doc {
  _id: string;
  filename: string;
  uploaded_by?: string;
  uploaded_at: string;
  chunks: number;
}

const MAX_FILE_MB = 50;

const humanFileSize = (size: number) => {
  if (size === 0) return "0 B";
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const sizes = ["B", "KB", "MB", "GB"];
  return (size / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

const AdminPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await api.get("/admin/documents");
      setDocs(res.data || []);
    } catch {
      setStatus("Failed to load documents.");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const onFileChange = (f: File | null) => {
    setStatus("");

    if (!f) {
      setFile(null);
      setFileUrl(null);
      return;
    }

    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setStatus("Only PDF files are allowed.");
      return;
    }

    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setStatus(`File too large. Max allowed: ${MAX_FILE_MB} MB`);
      return;
    }

    setFile(f);
    const url = URL.createObjectURL(f);
    setFileUrl(url);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStatus("Please select a PDF first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/admin/upload_pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt: ProgressEvent) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      });

      setStatus(`Uploaded: ${res.data.filename} (${res.data.chunks} chunks)`);

      setFile(null);
      setFileUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await fetchDocs();
    } catch (err: any) {
      setStatus(err?.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setFileUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-section">
        <h3 className="admin-title">Admin Controls</h3>
        <p className="admin-subtitle">
          Upload CA study PDFs. They will be indexed and used by the chatbot.
        </p>

        <form onSubmit={handleUpload} className="admin-upload-form">
          <div className="file-row">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              disabled={uploading}
            />

            <button className="btn btn-secondary" disabled={uploading}>
              {uploading ? `Uploading ${progress ?? ""}%` : "Upload & Index"}
            </button>

            {file && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={clearSelection}
                disabled={uploading}
              >
                Remove
              </button>
            )}
          </div>

          {/* File preview */}
          {file && (
            <div className="file-preview-box">
              <div className="file-info">
                <strong>{file.name}</strong>
                <div style={{ color: "#555" }}>{humanFileSize(file.size)}</div>
              </div>

              {fileUrl && (
                <div className="file-preview-frame">
                  <embed
                    src={fileUrl}
                    type="application/pdf"
                    width="100%"
                    height="240px"
                  />
                </div>
              )}

              {progress !== null && (
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }} />
                  <span className="progress-text">{progress}%</span>
                </div>
              )}
            </div>
          )}
        </form>

        {status && <div className="admin-status">{status}</div>}
      </div>

      <div className="admin-panel-section admin-docs-section">
        <h4 className="admin-docs-title">Indexed Documents</h4>

        {loadingDocs ? (
          <div>Loading...</div>
        ) : docs.length === 0 ? (
          <div>No documents uploaded yet.</div>
        ) : (
          <div className="admin-docs-list">
            {docs.map((d) => (
              <div key={d._id} className="admin-doc-item">
                <div className="admin-doc-name">{d.filename}</div>
                <div className="admin-doc-meta">
                  <span>{d.chunks} chunks</span>
                  <span>By: {d.uploaded_by || "admin"}</span>
                  <span>
                    {new Date(d.uploaded_at).toLocaleDateString()}{" "}
                    {new Date(d.uploaded_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
