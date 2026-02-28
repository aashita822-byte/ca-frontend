import React, { useEffect, useState } from "react";
import api from "./api";
import "./App.css";

type Level = "Foundation" | "Intermediate" | "Final" | "Others";

const DEFAULT_VIDEO_URL = "https://youtu.be/76UUB7Vv8s8?si=7NlDSfqlON-SVpIi";

const LEVEL_META: Record<Level, { icon: string; desc: string; color: string }> = {
  Foundation: { icon: "🌱", desc: "Core concepts & basics", color: "#0d7a4e" },
  Intermediate: { icon: "📊", desc: "In-depth applied study", color: "#b45309" },
  Final: { icon: "🏆", desc: "Advanced & strategic", color: "#1a2744" },
  Others: { icon: "📁", desc: "Reference & extras", color: "#6b46c1" },
};

const CADashboard: React.FC = () => {
  const [selected, setSelected] = useState<Level | null>(null);
  const [tree, setTree] = useState<any>({});
  const [viewer, setViewer] = useState<any>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [treeLoading, setTreeLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api.get("/dashboard/tree")
      .then((res) => setTree(res.data))
      .catch((err) => console.error(err))
      .finally(() => setTreeLoading(false));
  }, []);

  const toggleModule = (key: string) => {
    setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Flatten tree for search
  const getFilteredChapters = (subject: string, module: string) => {
    const chapters = tree[selected!]?.[subject]?.[module] ?? {};
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    const filtered: Record<string, any[]> = {};
    Object.entries(chapters).forEach(([ch, items]: [string, any]) => {
      const matchedItems = items.filter(
        (it: any) =>
          it.title?.toLowerCase().includes(q) || ch.toLowerCase().includes(q)
      );
      if (matchedItems.length > 0) filtered[ch] = matchedItems;
    });
    return filtered;
  };

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
                placeholder="Search chapters or topics…"
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
                const meta = LEVEL_META[lvl];
                const subjectCount = tree[lvl] ? Object.keys(tree[lvl]).length : 0;
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
                    {subjectCount > 0 && (
                      <span className="level-card-badge">{subjectCount} subjects</span>
                    )}
                    <span className="level-card-arrow">→</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Stats bar */}
          {!treeLoading && (
            <div className="dashboard-stats">
              {(["Foundation", "Intermediate", "Final", "Others"] as Level[]).map((lvl) => {
                if (!tree[lvl]) return null;
                const subjects = Object.keys(tree[lvl]);
                let pdfCount = 0;
                subjects.forEach((s) => {
                  Object.keys(tree[lvl][s]).forEach((m) => {
                    Object.values(tree[lvl][s][m]).forEach((items: any) => {
                      pdfCount += items.length;
                    });
                  });
                });
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
            <button className="back-btn" onClick={goBack}>
              ← All Levels
            </button>
            <div className="level-toolbar-meta">
              <span className="level-toolbar-icon">{LEVEL_META[selected].icon}</span>
              <h2 className="level-toolbar-title">{selected}</h2>
            </div>
            <div className="level-toolbar-actions">
              <button className="toolbar-btn" onClick={expandAll}>Expand All</button>
              <button className="toolbar-btn" onClick={collapseAll}>Collapse</button>
            </div>
          </div>

          {!tree[selected] ? (
            <div className="ca-empty-state">
              <span className="ca-empty-icon">📭</span>
              <p>No content available for {selected} yet.</p>
            </div>
          ) : (
            <div className="premium-tree">
              {Object.keys(tree[selected]).map((subject) => (
                <div key={subject} className="subject-card">

                  <div className="subject-card-header">
                    <h3>{subject}</h3>
                    <span className="subject-module-count">
                      {Object.keys(tree[selected][subject]).length} modules
                    </span>
                  </div>

                  {Object.keys(tree[selected][subject]).map((module) => {
                    const moduleKey = `${subject}-${module}`;
                    const isOpen = openModules[moduleKey];
                    const filteredChapters = getFilteredChapters(subject, module);
                    const chapterKeys = Object.keys(filteredChapters).sort((a, b) => {
                      const getNum = (s: string) => { const m = s.match(/\d+/); return m ? parseInt(m[0]) : 999; };
                      return getNum(a) - getNum(b);
                    });

                    // Hide module if search yields nothing
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
                          <span className="module-toggle-count">
                            {chapterKeys.length} ch.
                          </span>
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
                                  {filteredChapters[chapter].map((item: any) => (
                                    <div key={item._id} className="resource-item">
                                      <button
                                        className="pdf-btn"
                                        onClick={() => setViewer(item)}
                                        title={`Open: ${item.title}`}
                                      >
                                        <span className="pdf-btn-icon">📄</span>
                                        <span className="pdf-btn-text">{item.title}</span>
                                      </button>

                                      <div className="resource-actions">
                                        <button
                                          className="resource-action-btn resource-action-chat"
                                          onClick={() => (window as any).goChat?.()}
                                          title="Ask AI about this topic"
                                        >
                                          🤖 Ask AI
                                        </button>
                                        <button
                                          className="resource-action-btn resource-action-video"
                                          onClick={() => window.open(item.video_url || DEFAULT_VIDEO_URL, "_blank")}
                                          title="Watch video lecture"
                                        >
                                          ▶ Video
                                        </button>
                                      </div>
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

      {/* ── PDF MODAL ── */}
      {viewer && (
        <div
          className="pdf-modal"
          role="dialog"
          aria-modal="true"
          aria-label={viewer.title}
          onClick={(e) => { if (e.target === e.currentTarget) setViewer(null); }}
        >
          <div className="pdf-container">
            <div className="pdf-header">
              <div className="pdf-header-info">
                <span className="pdf-header-icon">📄</span>
                <div>
                  <h3 className="pdf-header-title">{viewer.title}</h3>
                  {viewer.chapter && (
                    <span className="pdf-header-sub">{viewer.chapter}</span>
                  )}
                </div>
              </div>
              <div className="pdf-header-actions">
                <button
                  className="resource-action-btn resource-action-chat"
                  onClick={() => { setViewer(null); (window as any).goChat?.(); }}
                >
                  🤖 Ask AI
                </button>
                {viewer.video_url && (
                  <button
                    className="resource-action-btn resource-action-video"
                    onClick={() => window.open(viewer.video_url, "_blank")}
                  >
                    ▶ Watch
                  </button>
                )}
                <button
                  className="pdf-close-btn"
                  onClick={() => setViewer(null)}
                  aria-label="Close PDF viewer"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe
              src={viewer.pdf_url}
              title={viewer.title}
              className="pdf-frame"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CADashboard;
