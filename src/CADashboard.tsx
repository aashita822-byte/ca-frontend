// import React, { useEffect, useState } from "react";
// import api from "./api";
// import "./App.css";

// type Level = "Foundation" | "Intermediate" | "Final" | "Others";

// const DEFAULT_VIDEO_URL = "https://youtu.be/76UUB7Vv8s8?si=7NlDSfqlON-SVpIi";

// const LEVEL_META: Record<Level, { icon: string; desc: string; color: string }> = {
//   Foundation:   { icon: "🌱", desc: "Core concepts & basics",     color: "#0d7a4e" },
//   Intermediate: { icon: "📊", desc: "In-depth applied study",     color: "#b45309" },
//   Final:        { icon: "🏆", desc: "Advanced & strategic",       color: "#1a2744" },
//   Others:       { icon: "📁", desc: "Reference & extras",         color: "#6b46c1" },
// };

// const CADashboard: React.FC = () => {
//   const [selected, setSelected]     = useState<Level | null>(null);
//   const [tree, setTree]             = useState<any>({});
//   const [viewer, setViewer]         = useState<any>(null);
//   const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
//   const [treeLoading, setTreeLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");

//   useEffect(() => {
//     api
//       .get("/dashboard/tree")
//       .then((res) => setTree(res.data))
//       .catch((err) => console.error(err))
//       .finally(() => setTreeLoading(false));
//   }, []);

//   const toggleModule = (key: string) =>
//     setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));

//   const expandAll = () => {
//     if (!selected || !tree[selected]) return;
//     const keys: Record<string, boolean> = {};
//     Object.keys(tree[selected]).forEach((subject) => {
//       Object.keys(tree[selected][subject]).forEach((mod) => {
//         keys[`${subject}-${mod}`] = true;
//       });
//     });
//     setOpenModules(keys);
//   };

//   const collapseAll = () => setOpenModules({});

//   const goBack = () => {
//     setSelected(null);
//     setSearchQuery("");
//     setOpenModules({});
//   };

//   /** Filter chapters within a module by the search query */
//   const getFilteredChapters = (subject: string, module: string) => {
//     const chapters = tree[selected!]?.[subject]?.[module] ?? {};
//     if (!searchQuery.trim()) return chapters;
//     const q = searchQuery.toLowerCase();
//     const filtered: Record<string, any[]> = {};
//     Object.entries(chapters).forEach(([ch, items]: [string, any]) => {
//       const matchedItems = items.filter(
//         (it: any) =>
//           it.title?.toLowerCase().includes(q) ||
//           ch.toLowerCase().includes(q) ||
//           it.unit?.toLowerCase().includes(q)
//       );
//       if (matchedItems.length > 0) filtered[ch] = matchedItems;
//     });
//     return filtered;
//   };

//   /** Count total PDFs for a given level */
//   const countLevelPdfs = (lvl: string) => {
//     if (!tree[lvl]) return 0;
//     let count = 0;
//     Object.values(tree[lvl]).forEach((subjects: any) => {
//       Object.values(subjects).forEach((modules: any) => {
//         Object.values(modules).forEach((items: any) => {
//           count += items.length;
//         });
//       });
//     });
//     return count;
//   };

//   return (
//     <div className="ca-dashboard">

//       {/* ── HEADER ── */}
//       <div className="ca-header">
//         <div className="ca-header-inner">
//           <div>
//             <h1>CA Study Dashboard</h1>
//             <p>Explore curated modules, ICAI PDFs &amp; video lectures</p>
//           </div>
//           {selected && (
//             <div className="ca-search-wrap">
//               <span className="ca-search-icon">🔍</span>
//               <input
//                 className="ca-search-input"
//                 type="search"
//                 placeholder="Search chapters, units or topics…"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── LEVEL SELECTOR ── */}
//       {!selected && (
//         <div className="level-selector-section">
//           <p className="level-selector-hint">Select your CA level to begin</p>

//           {treeLoading ? (
//             <div className="app-full-center" style={{ marginTop: 60 }}>
//               <div className="loader" />
//               <span className="loader-text">Loading study materials…</span>
//             </div>
//           ) : (
//             <div className="level-cards-grid">
//               {(["Foundation", "Intermediate", "Final", "Others"] as Level[]).map((lvl) => {
//                 const meta        = LEVEL_META[lvl];
//                 const subjectCount = tree[lvl] ? Object.keys(tree[lvl]).length : 0;
//                 const pdfCount    = countLevelPdfs(lvl);
//                 return (
//                   <button
//                     key={lvl}
//                     className="level-card"
//                     onClick={() => setSelected(lvl)}
//                     aria-label={`Select ${lvl} level`}
//                   >
//                     <span className="level-card-icon">{meta.icon}</span>
//                     <span className="level-card-name">{lvl}</span>
//                     <span className="level-card-desc">{meta.desc}</span>
//                     {subjectCount > 0 ? (
//                       <div className="level-card-stats">
//                         <span className="level-card-badge">{subjectCount} subjects</span>
//                         <span className="level-card-badge level-card-badge-pdf">
//                           {pdfCount} PDFs
//                         </span>
//                       </div>
//                     ) : (
//                       <span className="level-card-empty">No content yet</span>
//                     )}
//                     <span className="level-card-arrow">→</span>
//                   </button>
//                 );
//               })}
//             </div>
//           )}

//           {/* Stats bar */}
//           {!treeLoading && (
//             <div className="dashboard-stats">
//               {(["Foundation", "Intermediate", "Final", "Others"] as Level[]).map((lvl) => {
//                 const pdfCount = countLevelPdfs(lvl);
//                 if (!pdfCount) return null;
//                 return (
//                   <div className="dash-stat" key={lvl}>
//                     <span className="dash-stat-num">{pdfCount}</span>
//                     <span className="dash-stat-label">{lvl} PDFs</span>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── LEVEL CONTENT ── */}
//       {selected && (
//         <div className="level-content">

//           {/* Toolbar */}
//           <div className="level-toolbar">
//             <button className="back-btn" onClick={goBack}>
//               ← All Levels
//             </button>
//             <div className="level-toolbar-meta">
//               <span className="level-toolbar-icon">{LEVEL_META[selected].icon}</span>
//               <h2 className="level-toolbar-title">{selected}</h2>
//             </div>
//             <div className="level-toolbar-actions">
//               <button className="toolbar-btn" onClick={expandAll}>Expand All</button>
//               <button className="toolbar-btn" onClick={collapseAll}>Collapse</button>
//             </div>
//           </div>

//           {!tree[selected] || Object.keys(tree[selected]).length === 0 ? (
//             <div className="ca-empty-state">
//               <span className="ca-empty-icon">📭</span>
//               <p>No content available for <strong>{selected}</strong> yet.</p>
//               <p className="ca-empty-hint">
//                 Ask your admin to upload PDFs for this level.
//               </p>
//             </div>
//           ) : (
//             <div className="premium-tree">
//               {Object.keys(tree[selected]).map((subject) => (
//                 <div key={subject} className="subject-card">

//                   <div className="subject-card-header">
//                     <h3>{subject}</h3>
//                     <span className="subject-module-count">
//                       {Object.keys(tree[selected][subject]).length} modules
//                     </span>
//                   </div>

//                   {Object.keys(tree[selected][subject]).map((module) => {
//                     const moduleKey       = `${subject}-${module}`;
//                     const isOpen          = openModules[moduleKey];
//                     const filteredChapters = getFilteredChapters(subject, module);
//                     const chapterKeys     = Object.keys(filteredChapters).sort((a, b) => {
//                       const getNum = (s: string) => {
//                         const m = s.match(/\d+/);
//                         return m ? parseInt(m[0]) : 999;
//                       };
//                       return getNum(a) - getNum(b);
//                     });

//                     if (searchQuery && chapterKeys.length === 0) return null;

//                     return (
//                       <div key={module} className="module-block">
//                         <button
//                           className="module-toggle"
//                           onClick={() => toggleModule(moduleKey)}
//                           aria-expanded={isOpen}
//                         >
//                           <span className="module-toggle-text">
//                             <span className="module-toggle-arrow">{isOpen ? "▾" : "▸"}</span>
//                             {module}
//                           </span>
//                           <span className="module-toggle-count">
//                             {chapterKeys.length} ch.
//                           </span>
//                         </button>

//                         {isOpen && (
//                           <div className="module-chapters">
//                             {chapterKeys.map((chapter) => (
//                               <div key={chapter} className="chapter-block">
//                                 <div className="chapter-header">
//                                   <span className="chapter-dot" />
//                                   <h4>{chapter}</h4>
//                                 </div>

//                                 <div className="resource-list">
//                                   {filteredChapters[chapter].map((item: any) => (
//                                     <div key={item._id} className="resource-item">
//                                       {/* Unit label if present */}
//                                       {item.unit && (
//                                         <div className="resource-unit-label">
//                                           📎 {item.unit}
//                                         </div>
//                                       )}

//                                       <button
//                                         className="pdf-btn"
//                                         onClick={() => setViewer(item)}
//                                         title={`Open: ${item.title}`}
//                                       >
//                                         <span className="pdf-btn-icon">📄</span>
//                                         <span className="pdf-btn-text">{item.title}</span>
//                                       </button>

//                                       <div className="resource-actions">
//                                         <button
//                                           className="resource-action-btn resource-action-chat"
//                                           onClick={() => (window as any).goChat?.()}
//                                           title="Ask AI about this topic"
//                                         >
//                                           🤖 Ask AI
//                                         </button>
//                                         <button
//                                           className="resource-action-btn resource-action-video"
//                                           onClick={() =>
//                                             window.open(
//                                               item.video_url || DEFAULT_VIDEO_URL,
//                                               "_blank"
//                                             )
//                                           }
//                                           title="Watch video lecture"
//                                         >
//                                           ▶ Video
//                                         </button>
//                                       </div>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── PDF MODAL ── */}
//       {viewer && (
//         <div
//           className="pdf-modal"
//           role="dialog"
//           aria-modal="true"
//           aria-label={viewer.title}
//           onClick={(e) => {
//             if (e.target === e.currentTarget) setViewer(null);
//           }}
//         >
//           <div className="pdf-container">
//             <div className="pdf-header">
//               <div className="pdf-header-info">
//                 <button
//                   className="pdf-back-btn"
//                   onClick={() => setViewer(null)}
//                   aria-label="Go back"
//                 >
//                   ← Back
//                 </button>
//                 <span className="pdf-header-icon">📄</span>
//                 <div>
//                   <h3 className="pdf-header-title">{viewer.title}</h3>
//                   {viewer.chapter && (
//                     <span className="pdf-header-sub">{viewer.chapter}</span>
//                   )}
//                   {viewer.unit && (
//                     <span className="pdf-header-unit">📎 {viewer.unit}</span>
//                   )}
//                 </div>
//               </div>
//               <div className="pdf-header-actions">
//                 <button
//                   className="resource-action-btn resource-action-chat"
//                   onClick={() => {
//                     setViewer(null);
//                     (window as any).goChat?.();
//                   }}
//                 >
//                   🤖 Ask AI
//                 </button>
//                 {viewer.video_url && (
//                   <button
//                     className="resource-action-btn resource-action-video"
//                     onClick={() => window.open(viewer.video_url, "_blank")}
//                   >
//                     ▶ Watch
//                   </button>
//                 )}
//                 <button
//                   className="pdf-close-btn"
//                   onClick={() => setViewer(null)}
//                   aria-label="Close PDF viewer"
//                 >
//                   ✕
//                 </button>
//               </div>
//             </div>
//             <iframe
//               src={viewer.pdf_url}
//               title={viewer.title}
//               className="pdf-frame"
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CADashboard;


import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "./api";
import "./App.css";

type Level = "Foundation" | "Intermediate" | "Final" | "Others";

const DEFAULT_VIDEO_URL = "https://youtu.be/76UUB7Vv8s8?si=7NlDSfqlON-SVpIi";

// External video service base URL — set VITE_VIDEO_API_URL in your .env
const VIDEO_API_BASE = (import.meta as any).env?.VITE_VIDEO_API_URL ?? "http://127.0.0.1:8081";

// How often to poll for job completion (ms)
const POLL_INTERVAL_MS = 20000;

// Max polling time before giving up (ms) — 10 minutes
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

const LEVEL_META: Record<Level, { icon: string; desc: string; color: string }> = {
  Foundation:   { icon: "🌱", desc: "Core concepts & basics",  color: "#0d7a4e" },
  Intermediate: { icon: "📊", desc: "In-depth applied study",  color: "#b45309" },
  Final:        { icon: "🏆", desc: "Advanced & strategic",    color: "#1a2744" },
  Others:       { icon: "📁", desc: "Reference & extras",      color: "#6b46c1" },
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
  video_s3_url?: string;
  audio_s3_url?: string;
  video_created_at?: string;
  video_status?: "pending" | "processing" | "completed" | "failed";
}

type ViewerType = "pdf" | "video" | "audio";

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
// MAIN COMPONENT
// ============================================================

const CADashboard: React.FC = () => {
  const [selected, setSelected]       = useState<Level | null>(null);
  const [tree, setTree]               = useState<any>({});
  const [viewer, setViewer]           = useState<Viewer | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [treeLoading, setTreeLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAdmin, setIsAdmin]           = useState(false);

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
  // POLLING — checks our own backend for updated video_s3_url
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
            [dashboardId]: { ...prev[dashboardId], status: "timeout", message: "Timed out after 10 min." },
          }));
          patchTreeItem(dashboardId, { video_status: "failed" });
          return;
        }

        try {
          // Poll our FastAPI backend which has the updated Mongo doc
          const res = await api.get(`/dashboard/item/${dashboardId}`);
          const item: PDFItem = res.data;

          if (item.video_s3_url && item.video_status === "completed") {
            // 🎉 Video ready
            clearInterval(pollTimers.current[dashboardId]);
            delete pollTimers.current[dashboardId];

            setVideoJobs((prev) => ({
              ...prev,
              [dashboardId]: {
                ...prev[dashboardId],
                status: "completed",
                message: "Video ready!",
              },
            }));

            patchTreeItem(dashboardId, {
              video_s3_url:     item.video_s3_url,
              audio_s3_url:     item.audio_s3_url,
              video_status:     "completed",
              video_created_at: item.video_created_at,
            });
          } else if (item.video_status === "failed") {
            clearInterval(pollTimers.current[dashboardId]);
            delete pollTimers.current[dashboardId];
            setVideoJobs((prev) => ({
              ...prev,
              [dashboardId]: { ...prev[dashboardId], status: "failed", message: "Video generation failed." },
            }));
            patchTreeItem(dashboardId, { video_status: "failed" });
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
  // CREATE VIDEO — calls external API, then starts polling
  // ============================================================
  const handleCreateVideo = async (item: PDFItem) => {
    const dashboardId = item._id;

    // Prevent duplicate jobs
    if (videoJobs[dashboardId]?.status === "polling") return;

    // Optimistically mark as processing in tree
    patchTreeItem(dashboardId, { video_status: "processing" });

    setVideoJobs((prev) => ({
      ...prev,
      [dashboardId]: {
        jobId:       "",
        dashboardId,
        startedAt:   Date.now(),
        status:      "polling",
        message:     "Submitting job…",
      },
    }));

    try {
      const payload = {
        pdf_s3_url:   item.pdf_url,   // The S3/hosted PDF URL for this item
        dashboard_id: dashboardId,    // MongoDB _id of this dashboard record
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
          jobId:       data.job_id,
          dashboardId,
          startedAt:   Date.now(),
          status:      "polling",
          message:     data.message || "Processing…",
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
      patchTreeItem(dashboardId, { video_status: "failed" });

      // Auto-clear failed status after 5 s so button resets
      setTimeout(() => {
        setVideoJobs((prev) => {
          const next = { ...prev };
          delete next[dashboardId];
          return next;
        });
        patchTreeItem(dashboardId, { video_status: undefined });
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
  // VIDEO BUTTON RENDERER — centralises all button states
  // ============================================================
  const renderVideoButton = (item: PDFItem) => {
    const dashboardId = item._id;
    const job         = videoJobs[dashboardId];

    // ── Already has a video → Watch button ──
    if (item.video_s3_url && item.video_status === "completed") {
      return (
        <button
          className="resource-action-btn resource-action-video resource-action-watch"
          onClick={() => openViewer(item, "video")}
          title="Watch generated video lecture"
        >
          ▶ Watch Video
        </button>
      );
    }

    // ── Job just completed (state transition moment) ──
    if (job?.status === "completed") {
      return (
        <button
          className="resource-action-btn resource-action-video resource-action-watch"
          onClick={() => openViewer(item, "video")}
          title="Watch generated video lecture"
        >
          ▶ Watch Video
        </button>
      );
    }

    // ── Actively polling ──
    if (job?.status === "polling" || item.video_status === "processing") {
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

    // ── Failed ──
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

    // ── Admin only: no video yet ──
    if (isAdmin && !item.video_s3_url) {
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
              {(["Foundation", "Intermediate", "Final", "Others"] as Level[]).map((lvl) => {
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
              {(["Foundation", "Intermediate", "Final", "Others"] as Level[]).map((lvl) => {
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

                                        {/* ── Unified video button (all states) ── */}
                                        {renderVideoButton(item)}

                                        {/* ── Audio (if present) ── */}
                                        {item.audio_s3_url && (
                                          <button
                                            className="resource-action-btn resource-action-audio"
                                            onClick={() => openViewer(item, "audio")}
                                            title="Listen to audio explanation"
                                          >
                                            🎵 Audio
                                          </button>
                                        )}

                                        {/* ── Read PDF ── */}
                                        <button
                                          className="resource-action-btn resource-action-read"
                                          onClick={() => openViewer(item, "pdf")}
                                          title="Read PDF"
                                        >
                                          📖 Read
                                        </button>

                                        {/* ── Ask AI ── */}
                                        <button
                                          className="resource-action-btn resource-action-chat"
                                          onClick={() => (window as any).goChat?.()}
                                          title="Ask AI about this topic"
                                        >
                                          💬 Ask AI
                                        </button>

                                        {/* ── External video link (legacy) ── */}
                                        {item.video_url && !item.video_s3_url && (
                                          <button
                                            className="resource-action-btn resource-action-video"
                                            onClick={() =>
                                              window.open(item.video_url || DEFAULT_VIDEO_URL, "_blank")
                                            }
                                            title="Watch external video lecture"
                                          >
                                            ▶ Lecture
                                          </button>
                                        )}
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
                  {viewer.type === "pdf"   && "📄"}
                  {viewer.type === "video" && "🎬"}
                  {viewer.type === "audio" && "🎵"}
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
                {viewer.item.pdf_url && viewer.type !== "pdf" && (
                  <button
                    className="resource-action-btn resource-action-read"
                    onClick={() => setViewer((v) => v ? { ...v, type: "pdf" } : null)}
                  >
                    📖 Read PDF
                  </button>
                )}
                {viewer.item.video_s3_url && viewer.type !== "video" && (
                  <button
                    className="resource-action-btn resource-action-video"
                    onClick={() => setViewer((v) => v ? { ...v, type: "video" } : null)}
                  >
                    🎬 Watch Video
                  </button>
                )}
                {viewer.item.audio_s3_url && viewer.type !== "audio" && (
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
              {viewer.type === "pdf" && (
                <iframe
                  src={viewer.item.pdf_url}
                  title={viewer.item.title}
                  className="multimedia-frame pdf-frame"
                  allowFullScreen
                />
              )}
              {viewer.type === "video" && viewer.item.video_s3_url && (
                <video
                  controls
                  autoPlay
                  className="multimedia-frame video-frame"
                  controlsList="nodownload"
                  key={viewer.item.video_s3_url}
                >
                  <source src={viewer.item.video_s3_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
              {viewer.type === "audio" && viewer.item.audio_s3_url && (
                <div className="audio-player-container">
                  <audio
                    controls
                    autoPlay
                    className="audio-player"
                    controlsList="nodownload"
                    key={viewer.item.audio_s3_url}
                  >
                    <source src={viewer.item.audio_s3_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="audio-player-info">
                    <h4>{viewer.item.title}</h4>
                    <p>Now listening to audio lecture</p>
                  </div>
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

