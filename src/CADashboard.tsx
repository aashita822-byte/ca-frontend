import React, { useEffect, useState } from "react";
import api from "./api";
import "./App.css";

type Level = "Foundation" | "Intermediate" | "Final" | "Others";

const CADashboard: React.FC = () => {
  const [selected, setSelected] = useState<Level | null>(null);
  const [tree, setTree] = useState<any>({});
  const [viewer, setViewer] = useState<any>(null);
  const [openModules, setOpenModules] = useState<any>({});

  useEffect(() => {
    api
      .get("/dashboard/tree")
      .then((res) => setTree(res.data))
      .catch((err) => console.error(err));
  }, []);

  const toggleModule = (key: string) => {
    setOpenModules((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="ca-dashboard">

      {/* HEADER */}
      <div className="ca-header">
        <h1>CA Study Dashboard</h1>
        <p>Explore modules, PDFs & videos</p>
      </div>

      {/* CIRCLE SELECTOR */}
      {!selected && (
        <div className="level-circle">
          <button className="level-btn pos-top" onClick={() => setSelected("Foundation")}>
            Foundation
          </button>
          <button className="level-btn pos-left" onClick={() => setSelected("Intermediate")}>
            Inter
          </button>
          <button className="level-btn pos-right" onClick={() => setSelected("Final")}>
            Final
          </button>
          <button className="level-btn pos-center" onClick={() => setSelected("Others")}>
            Others
          </button>
        </div>
      )}

      {/* CONTENT */}
      {selected && (
        <div className="level-content">

          <button className="back-btn" onClick={() => setSelected(null)}>
            ← Back
          </button>

          <h2>{selected}</h2>

          {!tree[selected] ? (
            <p>No content available.</p>
          ) : (
            <div className="premium-tree">

              {Object.keys(tree[selected]).map((subject) => (
                <div key={subject} className="subject-card">

                  <h3>{subject}</h3>

                  {Object.keys(tree[selected][subject]).map((module) => {
                    const moduleKey = `${subject}-${module}`;
                    const isOpen = openModules[moduleKey];

                    return (
                      <div key={module} className="module-block">

                        <button
                          className="module-toggle"
                          onClick={() => toggleModule(moduleKey)}
                        >
                          {isOpen ? "▼" : "▶"} {module}
                        </button>

                        {isOpen &&
                          Object.keys(tree[selected][subject][module])
                            .sort((a, b) => {
                                const getNum = (s: string) => {
                                const m = s.match(/\d+/);
                                return m ? parseInt(m[0]) : 999;
                                };
                                return getNum(a) - getNum(b);
                            })
                            .map((chapter) => (
                              <div key={chapter} className="chapter-block">
                                <h4>{chapter}</h4>

                                <div className="resource-list">
                                  {tree[selected][subject][module][chapter].map(
                                    (item: any) => (
                                      <button
                                        key={item._id}
                                        className="pdf-btn"
                                        onClick={() => setViewer(item)}
                                      >
                                        📄 {item.title}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            )
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

      {/* PDF MODAL */}
      {viewer && (
        <div className="pdf-modal">
          <div className="pdf-container">

            <div className="pdf-header">
              <h3>{viewer.title}</h3>
              <button className="back-btn" onClick={() => setViewer(null)}>
                ✕ Close
              </button>
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
