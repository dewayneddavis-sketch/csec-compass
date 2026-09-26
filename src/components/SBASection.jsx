import { useState, useEffect } from "react";
import "./SBASection.css";
import { isOralExamSubject, sbaGuideLabel, sbaTabNoun } from "../data/sbaTabs";

// CSEC SBA (School-Based Assessment) guide, with a subject-aware name:
// French and Spanish have no SBA portfolio -- their Paper 03 IS the oral
// examination -- so those two subjects see "Oral Exam / Paper 03".
// Loads public/content/<subject>/sba.json and renders the subject's sample
// SBA: introduction, the task breakdown (with marks), an example sample
// (title + sections with body/tips), a marking note, and a checklist.
// Shows a friendly "coming soon" state when the file isn't present yet.
export default function SBASection({ subjectId }) {
  const isOral = isOralExamSubject(subjectId);
  const guide = sbaGuideLabel(subjectId);
  const noun = sbaTabNoun(subjectId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/content/${subjectId}/sba.json`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((d) => {
        if (!cancelled && d && d.introduction) setData(d);
        else if (!cancelled) setData(null);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subjectId]);

  if (loading) {
    return (
      <div className="sba-container">
        <div className="sba-empty"><p>Loading {guide}...</p></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sba-container">
        <div className="sba-empty">
          <div className="sba-empty-icon">📋</div>
          <h3>{guide} Coming Soon</h3>
          <p>{isOral ? "A step-by-step guide to the Paper 03 oral examination for this subject is being prepared." : "A step-by-step School-Based Assessment guide for this subject is being prepared."}</p>
          <p className="sba-note">Check back soon to see the task breakdown, a worked sample, marking notes, and a checklist.</p>
        </div>
      </div>
    );
  }

  const totalMarks = (data.tasks || []).reduce((sum, t) => sum + (parseInt(t.marks, 10) || 0), 0);
  const sample = data.sample || [];
  const tasks = data.tasks || [];
  const checklist = data.checklist || [];
  const completed = data.completedSample || null;
  const blockCopy = (e) => e.preventDefault();

  return (
    <div className="sba-container">
      <div className="sba-intro">
        <div className="sba-intro-icon">📋</div>
        <div>
          <h3>{isOral ? "CSEC Paper 03 — Oral Examination" : "CSEC School-Based Assessment"}</h3>
          <p>{data.introduction}</p>
        </div>
      </div>

      {tasks.length > 0 && (
        <section className="sba-card">
          <div className="sba-section-head">
            <h4>Task Breakdown</h4>
            {totalMarks > 0 && <span className="sba-badge">{totalMarks} marks total</span>}
          </div>
          <div className="sba-task-list">
            {tasks.map((t, i) => (
              <div key={t.section + i} className="sba-task">
                <div className="sba-task-head">
                  <span className="sba-task-title">{t.title || t.section}</span>
                  {t.marks && <span className="sba-task-marks">{t.marks} marks</span>}
                </div>
                <p className="sba-task-explain">{t.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {sample.length > 0 && (
        <section className="sba-card">
          <div className="sba-section-head">
            <h4>Sample {noun}</h4>
          </div>
          <p className="sba-sample-title">{data.sampleTitle}</p>
          {sample.map((s, i) => (
            <div key={s.section + i} className="sba-sample-section">
              <h5>{s.section}</h5>
              <p>{s.body}</p>
              {s.tips && <div className="sba-tip"><strong>Tip:</strong> {s.tips}</div>}
            </div>
          ))}
        </section>
      )}

      {data.marking && (
        <section className="sba-card">
          <div className="sba-section-head"><h4>Marking Notes</h4></div>
          <p className="sba-marking">{data.marking}</p>
        </section>
      )}

      {checklist.length > 0 && (
        <section className="sba-card">
          <div className="sba-section-head"><h4>Checklist</h4></div>
          <ul className="sba-checklist">
            {checklist.map((item, i) => (
              <li key={i}><span className="sba-check">☐</span>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {completed && (
        <section className="sba-card sba-completed-card">
          <div className="sba-section-head">
            <h4>Completed Sample {noun}</h4>
            <span className="sba-badge">View only</span>
          </div>
          <p className="sba-viewonly">{completed.viewOnlyNote || "For viewing and learning only. This is an original worked example written for CSEC Compass -- read it, study how each category is earned, then write your own submission in your own words."}</p>
          <div
            className="sba-protected"
            style={{ userSelect: "none", WebkitUserSelect: "none", msUserSelect: "none" }}
            onCopy={blockCopy}
            onCut={blockCopy}
            onContextMenu={blockCopy}
            onDragStart={blockCopy}
          >
            {completed.title && <p className="sba-sample-title">{completed.title}</p>}
            {Array.isArray(completed.profile) && completed.profile.length > 0 && (
              <div className="sba-profile">
                {completed.profile.map((p, i) => (
                  <span key={i} className="sba-profile-chip"><strong>{p.label}:</strong> {p.value}</span>
                ))}
              </div>
            )}
            {Array.isArray(completed.categories) && completed.categories.length > 0 && (
              <div className="sba-cat-wrap">
                <h5 className="sba-subhead">How this sample earns each SBA category</h5>
                <div className="sba-table-wrap">
                  <table className="sba-cat-table">
                    <thead>
                      <tr><th>Category</th><th>Marks</th><th>Awarded</th><th>What the examiner sees</th></tr>
                    </thead>
                    <tbody>
                      {completed.categories.map((c, i) => (
                        <tr key={i}>
                          <td>{c.section}</td>
                          <td>{c.marks}</td>
                          <td className="sba-awarded">{c.awarded}</td>
                          <td>{c.comment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {(completed.pages || []).map((pg, i) => (
              <div key={i} className="sba-page">
                <h5>{pg.heading}</h5>
                {pg.body && String(pg.body).split("\n\n").map((para, j) => (<p key={j}>{para}</p>))}
                {pg.table && (
                  <div className="sba-table-wrap">
                    {pg.table.caption && <p className="sba-table-caption">{pg.table.caption}</p>}
                    <table className="sba-sample-table">
                      <thead>
                        <tr>{(pg.table.columns || []).map((c, k) => (<th key={k}>{c}</th>))}</tr>
                      </thead>
                      <tbody>
                        {(pg.table.rows || []).map((r, k) => (
                          <tr key={k}>{r.map((cell, m) => (<td key={m}>{cell}</td>))}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {Array.isArray(pg.bullets) && pg.bullets.length > 0 && (
                  <ul className="sba-sample-list">
                    {pg.bullets.map((b, j) => (<li key={j}>{b}</li>))}
                  </ul>
                )}
              </div>
            ))}
            {Array.isArray(completed.examinerNotes) && completed.examinerNotes.length > 0 && (
              <div className="sba-examiner">
                <h5 className="sba-subhead">Why this sample scores full marks</h5>
                <ul className="sba-sample-list">
                  {completed.examinerNotes.map((n, i) => (<li key={i}>{n}</li>))}
                </ul>
              </div>
            )}
            <p className="sba-protect-note">Selection and copying are switched off on this sample.</p>
          </div>
        </section>
      )}

    </div>
  );
}
