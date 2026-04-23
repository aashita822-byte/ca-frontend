import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import api from "./api";
import "./App.css";

type Level = "Foundation" | "Intermediate" | "Final" | "Self Paced" | "Others";

const DEFAULT_VIDEO_URL = "https://youtu.be/76UUB7Vv8s8?si=7NlDSfqlON-SVpIi";

// External video service base URL — set VITE_VIDEO_API_URL in your .env
const VIDEO_API_BASE = (import.meta as any).env?.VITE_VIDEO_API_URL ?? "http://127.0.0.1:8081";

// How often to poll for job completion (ms)
const POLL_INTERVAL_MS = 20000;

// Max polling time before giving up (ms) — 15 minutes
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

const LEVEL_META: Record<Level, { icon: string; desc: string; color: string }> = {
  Foundation:   { icon: "🌱", desc: "Core concepts & basics",  color: "#0d7a4e" },
  Intermediate: { icon: "📊", desc: "In-depth applied study",  color: "#b45309" },
  Final:        { icon: "🏆", desc: "Advanced & strategic",    color: "#1a2744" },
  "Self Paced": { icon: "🎯", desc: "Learn at your own pace",  color: "#0e7490" },
  Others:       { icon: "📁", desc: "Reference & extras",      color: "#6b46c1" }
};
// ============================================================
// TYPES
// ============================================================

interface PDFItem {
  _id: string;
  title: string;
  pdf_url: string;
  chapter?: string;
  unit?: string;
  video_url?: string;
  audio_url?: string;
  simplified_pdf_url?: string;          // ← NEW: Smart PDF S3 URL from MongoDB
  video_created_at?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

type ViewerType = "pdf" | "video" | "audio" | "smart_pdf"; // ← NEW: smart_pdf viewer type

interface Viewer {
  type: ViewerType;
  item: PDFItem;
}

interface VideoJob {
  jobId: string;
  dashboardId: string;
  startedAt: number;
  status: "polling" | "completed" | "failed" | "timeout";
  message?: string;
}

// ============================================================
// HELPERS
// ============================================================

function getNum(s: string): number {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0]) : 999;
}

function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const diff = getNum(a) - getNum(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}


// ============================================================
// PDF BLOB HOOK
// ============================================================

/**
 * Fetches a PDF via the authenticated `api` instance (so the JWT token is
 * included automatically), converts it to a blob: URL, and returns it.
 * The blob URL is revoked when the component using it unmounts or the
 * source URL changes — no memory leaks.
 *
 * Why blob: instead of a proxy iframe src?
 *   iframes cannot send custom headers (like Authorization). If we point the
 *   iframe directly at the proxy endpoint, the request arrives unauthenticated,
 *   FastAPI raises 401, and the SPA intercepts it and redirects to the dashboard.
 *   Fetching via JS lets us attach the token, then hand a plain blob: URL to
 *   the iframe — no auth issues, no redirect, renders inline every time.
 */
function usePdfBlobUrl(url: string | undefined): { blobUrl: string | null; loading: boolean; error: string | null } {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setBlobUrl(null); return; }

    let revoked = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    (async () => {
      try {
        // Use the existing `api` axios instance — it already carries the JWT token
        const res = await api.get("/dashboard/pdf-proxy", {
          params:       { url },
          responseType: "blob",
        });
        if (revoked) return;
        const blob    = new Blob([res.data], { type: "application/pdf" });
        const objUrl  = URL.createObjectURL(blob);
        setBlobUrl(objUrl);
      } catch (err: any) {
        if (!revoked) setError(err?.message ?? "Failed to load PDF");
      } finally {
        if (!revoked) setLoading(false);
      }
    })();

    return () => {
      revoked = true;
      // Revoke the old blob URL to free memory
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [url]);

  return { blobUrl, loading, error };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

// ============================================================
// PDF VIEWER COMPONENT  (uses blob hook internally)
// ============================================================

interface PdfViewerProps {
  url: string;
  title: string;
  className?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, title, className = "multimedia-frame pdf-frame" }) => {
  const { blobUrl, loading, error } = usePdfBlobUrl(url);

  if (loading) return (
    <div className="pdf-loading-state">
      <div className="loader" />
      <span className="loader-text">Loading PDF…</span>
    </div>
  );

  if (error) return (
    <div className="pdf-error-state">
      <span>⚠️ Could not load PDF: {error}</span>
    </div>
  );

  if (!blobUrl) return null;

  return (
    <iframe
      src={blobUrl}
      title={title}
      className={className}
      allowFullScreen
    />
  );
};

const CADashboard: React.FC = () => {
  const [selected, setSelected]       = useState<Level | null>(null);
  const [tree, setTree]               = useState<any>({});
  const [viewer, setViewer]           = useState<Viewer | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [treeLoading, setTreeLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  // Maps dashboardId → active VideoJob
  const [videoJobs, setVideoJobs] = useState<Record<string, VideoJob>>({});

  // Keep a ref so polling callbacks always see latest jobs map
  const videoJobsRef = useRef<Record<string, VideoJob>>({});
  videoJobsRef.current = videoJobs;

  // Polling interval handles keyed by dashboardId
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // ============================================================
  // CLEANUP on unmount
  // ============================================================
  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(clearInterval);
    };
  }, []);

  // ============================================================
  // LOAD
  // ============================================================
  useEffect(() => {
    checkAdminStatus();
    loadDashboardTree();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const res = await api.get("/auth/me");
      setIsAdmin(res.data.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  };

  const loadDashboardTree = () => {
    api
      .get("/dashboard/tree")
      .then((res) => setTree(res.data))
      .catch((err) => console.error(err))
      .finally(() => setTreeLoading(false));
  };

  // ============================================================
  // TREE PATCH HELPER
  // ============================================================
  const patchTreeItem = useCallback(
    (dashboardId: string, patch: Partial<PDFItem>) => {
      setTree((prev: any) => {
        const next = JSON.parse(JSON.stringify(prev));
        for (const level in next) {
          for (const subject in next[level]) {
            for (const mod in next[level][subject]) {
              for (const chapter in next[level][subject][mod]) {
                const items: PDFItem[] = next[level][subject][mod][chapter];
                const idx = items.findIndex((it) => it._id === dashboardId);
                if (idx !== -1) {
                  items[idx] = { ...items[idx], ...patch };
                  return next;
                }
              }
            }
          }
        }
        return prev;
      });

      // Also patch open viewer if it matches
      setViewer((v) =>
        v && v.item._id === dashboardId ? { ...v, item: { ...v.item, ...patch } } : v
      );
    },
    []
  );

  // ============================================================
  // POLLING — checks our own backend for updated video_url
  // ============================================================
  const startPolling = useCallback(
    (dashboardId: string, jobId: string) => {
      // Clear any existing timer for this id
      if (pollTimers.current[dashboardId]) {
        clearInterval(pollTimers.current[dashboardId]);
      }

      const startedAt = Date.now();

      const timer = setInterval(async () => {
        const elapsed = Date.now() - startedAt;

        // Timeout guard
        if (elapsed > POLL_TIMEOUT_MS) {
          clearInterval(pollTimers.current[dashboardId]);
          delete pollTimers.current[dashboardId];
          setVideoJobs((prev) => ({
            ...prev,
            [dashboardId]: { ...prev[dashboardId], status: "timeout", message: "Timed out after 15 min." },
          }));
          patchTreeItem(dashboardId, { status: "failed" });
          return;
        }

        try {
          // Poll our FastAPI backend which has the updated Mongo doc
          const res = await api.get(`/dashboard/item/${dashboardId}`);
          const item: PDFItem = res.data;

          // Accept completion if video_url is present — status field lives on the
          // job document and may or may not be written back to the dashboard doc.
          if (item.video_url && (item.status === "completed" || !item.status)) {
            // 🎉 Video ready
            clearInterval(pollTimers.current[dashboardId]);
            delete pollTimers.current[dashboardId];

            // Patch tree FIRST so item.status is "completed" before
            // videoJobs triggers a re-render — prevents the "processing" flicker
            patchTreeItem(dashboardId, {
              video_url:     item.video_url,
              audio_url:     item.audio_url,
              simplified_pdf_url: item.simplified_pdf_url,
              status:     "completed",
              video_created_at: item.video_created_at,
            });

            // Update job status AFTER tree is patched
            setVideoJobs((prev) => ({
              ...prev,
              [dashboardId]: {
                ...prev[dashboardId],
                status: "completed",
                message: "Video ready!",
              },
            }));
          } else if (item.status === "failed") {
            clearInterval(pollTimers.current[dashboardId]);
            delete pollTimers.current[dashboardId];
            setVideoJobs((prev) => ({
              ...prev,
              [dashboardId]: { ...prev[dashboardId], status: "failed", message: "Video generation failed." },
            }));
            patchTreeItem(dashboardId, { status: "failed" });
          }
          // else still processing — keep polling
        } catch (err) {
          console.warn("[poll] Error fetching dashboard item:", err);
          // Don't stop polling on transient errors
        }
      }, POLL_INTERVAL_MS);

      pollTimers.current[dashboardId] = timer;
    },
    [patchTreeItem]
  );

  // ============================================================
  // CREATE / RECREATE VIDEO — calls external API, then starts polling
  // ============================================================
  const handleCreateVideo = async (item: PDFItem) => {
    const dashboardId = item._id;

    // Prevent duplicate jobs (allow re-creation even if completed)
    if (videoJobs[dashboardId]?.status === "polling") return;

    // Optimistically mark as processing in tree
    patchTreeItem(dashboardId, { status: "processing" });

    setVideoJobs((prev) => ({
      ...prev,
      [dashboardId]: {
        jobId:     "",
        dashboardId,
        startedAt: Date.now(),
        status:    "polling",
        message:   "Submitting job…",
      },
    }));

    try {
      const payload = {
        pdf_s3_url:   item.pdf_url,
        dashboard_id: dashboardId,
        use_gemini:   true,
        use_openai:   true,
      };

      const res = await fetch(`${VIDEO_API_BASE}/api/process`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Video API returned ${res.status}: ${errText}`);
      }

      const data: { job_id: string; dashboard_id: string; status: string; message: string } =
        await res.json();

      console.log("[video] Job submitted:", data);

      setVideoJobs((prev) => ({
        ...prev,
        [dashboardId]: {
          jobId:     data.job_id,
          dashboardId,
          startedAt: Date.now(),
          status:    "polling",
          message:   data.message || "Processing…",
        },
      }));

      // Begin polling FastAPI backend for completion
      startPolling(dashboardId, data.job_id);
    } catch (err: any) {
      console.error("[video] Job submission failed:", err);
      setVideoJobs((prev) => ({
        ...prev,
        [dashboardId]: {
          ...(prev[dashboardId] ?? { jobId: "", dashboardId, startedAt: Date.now() }),
          status:  "failed",
          message: err?.message ?? "Submission failed. Try again.",
        },
      }));
      patchTreeItem(dashboardId, { status: "failed" });

      // Auto-clear failed status after 5 s so button resets
      setTimeout(() => {
        setVideoJobs((prev) => {
          const next = { ...prev };
          delete next[dashboardId];
          return next;
        });
        patchTreeItem(dashboardId, { status: undefined });
      }, 5000);
    }
  };

  // ============================================================
  // TREE NAVIGATION HANDLERS
  // ============================================================
  const toggleModule = (key: string) =>
    setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));

  const expandAll = () => {
    if (!selected || !tree[selected]) return;
    const keys: Record<string, boolean> = {};
    Object.keys(tree[selected]).forEach((subject) => {
      Object.keys(tree[selected][subject]).forEach((mod) => {
        keys[`${subject}-${mod}`] = true;
      });
    });
    setOpenModules(keys);
  };

  const collapseAll = () => setOpenModules({});

  const goBack = () => {
    setSelected(null);
    setSearchQuery("");
    setOpenModules({});
  };

  const openViewer = (item: PDFItem, type: ViewerType = "pdf") =>
    setViewer({ type, item });

  const closeViewer = () => setViewer(null);

  // ── Download audio as a file via authenticated fetch ──
  const handleDownloadAudio = async (item: PDFItem) => {
    if (!item.audio_url) return;
    try {
      const res = await api.get("/dashboard/audio-proxy", {
        params:       { url: item.audio_url },
        responseType: "blob",
      });
      const blob     = new Blob([res.data], { type: "audio/mpeg" });
      const objUrl   = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      const filename = item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_audio.mp3";
      anchor.href     = objUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objUrl);
    } catch (err: any) {
      console.error("[download audio]", err);
      alert("Could not download audio. Please try again.");
    }
  };

  const getFilteredChapters = (subject: string, module: string) => {
    const chapters = tree[selected!]?.[subject]?.[module] ?? {};
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    const filtered: Record<string, any[]> = {};
    Object.entries(chapters).forEach(([ch, items]: [string, any]) => {
      const matched = items.filter(
        (it: any) =>
          it.title?.toLowerCase().includes(q) ||
          ch.toLowerCase().includes(q) ||
          it.unit?.toLowerCase().includes(q)
      );
      if (matched.length > 0) filtered[ch] = matched;
    });
    return filtered;
  };

  const countLevelPdfs = (lvl: string) => {
    if (!tree[lvl]) return 0;
    let count = 0;
    Object.values(tree[lvl]).forEach((subjects: any) =>
      Object.values(subjects).forEach((modules: any) =>
        Object.values(modules).forEach((items: any) => { count += items.length; })
      )
    );
    return count;
  };

  // ============================================================
  // VIDEO BUTTON RENDERER
  // ============================================================
  const renderVideoButton = (item: PDFItem) => {
    const dashboardId = item._id;
    const job         = videoJobs[dashboardId];

    // "has video" = video_url is populated in DB (job is done) OR the in-flight
    // job just completed. We do NOT check item.status here because on initial tree
    // load the dashboard doc may not carry the job's status field — only video_url
    // is reliably written back to the dashboard collection by the backend.
    const hasVideo = !!item.video_url || job?.status === "completed";

    // ── 1. Video exists (completed) — highest priority check ──
    // Must come BEFORE the processing check so a completed job never
    // renders the spinner due to stale item.status in the tree.
    if (hasVideo) {
      return (
        <>
          <button
            className="resource-action-btn resource-action-video resource-action-watch"
            onClick={() => openViewer(item, "video")}
            title="Watch generated video lecture"
          >
            ▶ Watch Video
          </button>

          {/* Admin can regenerate even after completion */}
          {isAdmin && (
            <button
              className="resource-action-btn resource-action-recreate-video"
              onClick={() => handleCreateVideo(item)}
              title="Regenerate AI video lecture (Admin only)"
            >
              🔄 Recreate Video
            </button>
          )}
        </>
      );
    }

    // ── 2. Actively polling / processing ──
    if (job?.status === "polling" || item.status === "processing") {
      return (
        <button
          className="resource-action-btn resource-action-create-video loading"
          disabled
          title={job?.message ?? "Generating video…"}
        >
          <span className="spinner-mini" />
          {job?.message ?? "Processing…"}
        </button>
      );
    }

    // ── 3. Failed / timeout ──
    if (job?.status === "failed" || job?.status === "timeout") {
      return (
        <button
          className="resource-action-btn resource-action-create-video resource-action-failed"
          onClick={() => handleCreateVideo(item)}
          title={job?.message ?? "Failed — click to retry"}
        >
          ⚠ Retry Video
        </button>
      );
    }

    // ── 4. Admin only: no video yet → Create button ──
    if (isAdmin && !item.video_url) {
      return (
        <button
          className="resource-action-btn resource-action-create-video"
          onClick={() => handleCreateVideo(item)}
          title="Generate AI video lecture (Admin only)"
        >
          🤖 Create Video
        </button>
      );
    }

    return null;
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="ca-dashboard">

      {/* ── HEADER ── */}
      <div className="ca-header">
        <div className="ca-header-inner">
          <div>
            <h1>CA Study Dashboard</h1>
            <p>Explore curated modules, ICAI PDFs &amp; video lectures</p>
          </div>
          {selected && (
            <div className="ca-search-wrap">
              <span className="ca-search-icon">🔍</span>
              <input
                className="ca-search-input"
                type="search"
                placeholder="Search chapters, units or topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── LEVEL SELECTOR ── */}
      {!selected && (
        <div className="level-selector-section">
          <p className="level-selector-hint">Select your CA level to begin</p>

          {treeLoading ? (
            <div className="app-full-center" style={{ marginTop: 60 }}>
              <div className="loader" />
              <span className="loader-text">Loading study materials…</span>
            </div>
          ) : (
            <div className="level-cards-grid">
              {(["Foundation", "Intermediate", "Final", "Self Paced", "Others"] as Level[]).map((lvl) => {
                const meta         = LEVEL_META[lvl];
                const subjectCount = tree[lvl] ? Object.keys(tree[lvl]).length : 0;
                const pdfCount     = countLevelPdfs(lvl);
                return (
                  <button
                    key={lvl}
                    className="level-card"
                    onClick={() => setSelected(lvl)}
                    aria-label={`Select ${lvl} level`}
                  >
                    <span className="level-card-icon">{meta.icon}</span>
                    <span className="level-card-name">{lvl}</span>
                    <span className="level-card-desc">{meta.desc}</span>
                    {subjectCount > 0 ? (
                      <div className="level-card-stats">
                        <span className="level-card-badge">{subjectCount} subjects</span>
                        <span className="level-card-badge level-card-badge-pdf">{pdfCount} PDFs</span>
                      </div>
                    ) : (
                      <span className="level-card-empty">No content yet</span>
                    )}
                    <span className="level-card-arrow">→</span>
                  </button>
                );
              })}
            </div>
          )}

          {!treeLoading && (
            <div className="dashboard-stats">
              {(["Foundation", "Intermediate", "Final", "Self Paced", "Others"] as Level[]).map((lvl) => {
                const pdfCount = countLevelPdfs(lvl);
                if (!pdfCount) return null;
                return (
                  <div className="dash-stat" key={lvl}>
                    <span className="dash-stat-num">{pdfCount}</span>
                    <span className="dash-stat-label">{lvl} PDFs</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── LEVEL CONTENT ── */}
      {selected && (
        <div className="level-content">

          {/* Toolbar */}
          <div className="level-toolbar">
            <button className="back-btn" onClick={goBack}>← All Levels</button>
            <div className="level-toolbar-meta">
              <span className="level-toolbar-icon">{LEVEL_META[selected].icon}</span>
              <h2 className="level-toolbar-title">{selected}</h2>
            </div>
            <div className="level-toolbar-actions">
              <button className="toolbar-btn" onClick={expandAll}>Expand All</button>
              <button className="toolbar-btn" onClick={collapseAll}>Collapse</button>
            </div>
          </div>

          {!tree[selected] || Object.keys(tree[selected]).length === 0 ? (
            <div className="ca-empty-state">
              <span className="ca-empty-icon">📭</span>
              <p>No content available for <strong>{selected}</strong> yet.</p>
              <p className="ca-empty-hint">Ask your admin to upload PDFs for this level.</p>
            </div>
          ) : (
            <div className="premium-tree">
              {sortKeys(Object.keys(tree[selected])).map((subject) => (
                <div key={subject} className="subject-card">

                  <div className="subject-card-header">
                    <h3>{subject}</h3>
                    <span className="subject-module-count">
                      {Object.keys(tree[selected][subject]).length} modules
                    </span>
                  </div>

                  {sortKeys(Object.keys(tree[selected][subject])).map((module) => {
                    const moduleKey        = `${subject}-${module}`;
                    const isOpen           = openModules[moduleKey];
                    const filteredChapters = getFilteredChapters(subject, module);
                    const chapterKeys      = sortKeys(Object.keys(filteredChapters));

                    if (searchQuery && chapterKeys.length === 0) return null;

                    return (
                      <div key={module} className="module-block">
                        <button
                          className="module-toggle"
                          onClick={() => toggleModule(moduleKey)}
                          aria-expanded={isOpen}
                        >
                          <span className="module-toggle-text">
                            <span className="module-toggle-arrow">{isOpen ? "▾" : "▸"}</span>
                            {module}
                          </span>
                          <span className="module-toggle-count">{chapterKeys.length} ch.</span>
                        </button>

                        {isOpen && (
                          <div className="module-chapters">
                            {chapterKeys.map((chapter) => (
                              <div key={chapter} className="chapter-block">
                                <div className="chapter-header">
                                  <span className="chapter-dot" />
                                  <h4>{chapter}</h4>
                                </div>

                                <div className="resource-list">
                                  {filteredChapters[chapter].map((item: PDFItem) => (
                                    <div key={item._id} className="resource-item">
                                      {item.unit && (
                                        <div className="resource-unit-label">📎 {item.unit}</div>
                                      )}

                                      <button
                                        className="pdf-btn"
                                        onClick={() => openViewer(item, "pdf")}
                                        title={`Open: ${item.title}`}
                                      >
                                        <span className="pdf-btn-icon">📄</span>
                                        <span className="pdf-btn-text">{item.title}</span>
                                      </button>

                                      <div className="resource-actions">

                                        {/* ── Read PDF ── */}
                                        <button
                                          className="resource-action-btn resource-action-read"
                                          onClick={() => openViewer(item, "pdf")}
                                          title="Read PDF"
                                        >
                                          📖 Read
                                        </button>

                                        {/* ── Smart PDF (from MongoDB simplified_pdf_url) ── */}
                                        {item.simplified_pdf_url && (
                                          <button
                                            className="resource-action-btn resource-action-smart-pdf"
                                            onClick={() => openViewer(item, "smart_pdf")}
                                            title="View AI-enhanced Smart PDF"
                                          >
                                            🧠 Smart PDF
                                          </button>
                                        )}

                                        {/* ── Video button (all states via renderVideoButton) ── */}
                                        {renderVideoButton(item)}

                                        {/* ── Audio (from MongoDB audio_url) ── */}
                                        {item.audio_url && (
                                          <button
                                            className="resource-action-btn resource-action-audio"
                                            onClick={() => openViewer(item, "audio")}
                                            title="Listen to audio explanation"
                                          >
                                            🎵 Audio
                                          </button>
                                        )}

                                        {/* ── Ask AI ── */}
                                        <button
                                          className="resource-action-btn resource-action-chat"
                                          onClick={() => (window as any).goChat?.()}
                                          title="Ask AI about this topic"
                                        >
                                          💬 Ask AI
                                        </button>

                                      </div>

                                      {/* ── Inline job status message ── */}
                                      {videoJobs[item._id]?.status === "polling" && (
                                        <div className="video-job-status">
                                          <span className="spinner-mini" />
                                          <span>{videoJobs[item._id].message ?? "Generating video…"}</span>
                                          <span className="video-job-elapsed">
                                            {Math.floor((Date.now() - videoJobs[item._id].startedAt) / 1000)}s
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEWER MODAL ── */}
      {viewer && (
        <div
          className="multimedia-modal"
          role="dialog"
          aria-modal="true"
          aria-label={viewer.item.title}
          onClick={(e) => { if (e.target === e.currentTarget) closeViewer(); }}
        >
          <div className="multimedia-container">
            <div className="multimedia-header">
              <div className="multimedia-header-info">
                <button className="multimedia-back-btn" onClick={closeViewer} aria-label="Go back">
                  ← Back
                </button>
                <span className="multimedia-header-icon">
                  {viewer.type === "pdf"       && "📄"}
                  {viewer.type === "smart_pdf" && "🧠"}
                  {viewer.type === "video"     && "🎬"}
                  {viewer.type === "audio"     && "🎵"}
                </span>
                <div>
                  <h3 className="multimedia-header-title">{viewer.item.title}</h3>
                  {viewer.item.chapter && (
                    <span className="multimedia-header-sub">{viewer.item.chapter}</span>
                  )}
                  {viewer.item.unit && (
                    <span className="multimedia-header-unit">📎 {viewer.item.unit}</span>
                  )}
                </div>
              </div>

              <div className="multimedia-header-actions">
                {/* Switch to PDF */}
                {viewer.item.pdf_url && viewer.type !== "pdf" && (
                  <button
                    className="resource-action-btn resource-action-read"
                    onClick={() => setViewer((v) => v ? { ...v, type: "pdf" } : null)}
                  >
                    📖 Read PDF
                  </button>
                )}

                {/* Switch to Smart PDF */}
                {viewer.item.simplified_pdf_url && viewer.type !== "smart_pdf" && (
                  <button
                    className="resource-action-btn resource-action-smart-pdf"
                    onClick={() => setViewer((v) => v ? { ...v, type: "smart_pdf" } : null)}
                  >
                    🧠 Smart PDF
                  </button>
                )}

                {/* Switch to Video */}
                {viewer.item.video_url && viewer.type !== "video" && (
                  <button
                    className="resource-action-btn resource-action-video"
                    onClick={() => setViewer((v) => v ? { ...v, type: "video" } : null)}
                  >
                    🎬 Watch Video
                  </button>
                )}

                {/* Switch to Audio */}
                {viewer.item.audio_url && viewer.type !== "audio" && (
                  <button
                    className="resource-action-btn resource-action-audio"
                    onClick={() => setViewer((v) => v ? { ...v, type: "audio" } : null)}
                  >
                    🎵 Audio
                  </button>
                )}

                <button
                  className="resource-action-btn resource-action-chat"
                  onClick={() => { closeViewer(); (window as any).goChat?.(); }}
                >
                  💬 Chat
                </button>
                <button className="multimedia-close-btn" onClick={closeViewer} aria-label="Close">
                  ✕
                </button>
              </div>
            </div>

            <div className="multimedia-content">
              {/* ── PDF Viewer — fetched with auth token, rendered as blob URL ── */}
              {viewer.type === "pdf" && (
                <PdfViewer
                  url={viewer.item.pdf_url}
                  title={viewer.item.title}
                />
              )}

              {/* ── Smart PDF Viewer — fetched with auth token, rendered as blob URL ── */}
              {viewer.type === "smart_pdf" && viewer.item.simplified_pdf_url && (
                <PdfViewer
                  url={viewer.item.simplified_pdf_url}
                  title={`Smart PDF – ${viewer.item.title}`}
                />
              )}

              {/* ── Video Viewer ── */}
              {viewer.type === "video" && viewer.item.video_url && (
                <video
                  controls
                  autoPlay
                  className="multimedia-frame video-frame"
                  controlsList="nodownload"
                  key={viewer.item.video_url}
                >
                  <source src={viewer.item.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}

              {/* ── Audio Viewer (S3 URL from MongoDB) ── */}
              {viewer.type === "audio" && viewer.item.audio_url && (
                <div className="audio-player-container">
                  <audio
                    controls
                    autoPlay
                    className="audio-player"
                    controlsList="nodownload"
                    key={viewer.item.audio_url}
                  >
                    <source src={viewer.item.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="audio-player-info">
                    <h4>{viewer.item.title}</h4>
                    <p>Now listening to audio lecture</p>
                  </div>
                  <button
                    className="resource-action-btn resource-action-download-audio"
                    onClick={() => handleDownloadAudio(viewer.item)}
                    title="Download audio as MP3"
                  >
                    ⬇ Download MP3
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CADashboard;
