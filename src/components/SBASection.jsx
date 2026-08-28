import { useState, useEffect } from "react";
import "./SBASection.css";

// CSEC SBA (School-Based Assessment) guide.
// Loads public/content/<subject>/sba.json and renders the subject's sample
// SBA: introduction, the task breakdown (with marks), an example sample
// (title + sections with body/tips), a marking note, and a checklist.
// Shows a friendly "coming soon" state when the file isn't present yet.
export default function SBASection({ subjectId }) {
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
        <div className="sba-empty"><p>Loading SBA guide...</p></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sba-container">
        <div className="sba-empty">
          <div className="sba-empty-icon">📋</div>
          <h3>SBA Guide Coming Soon</h3>
          <p>A step-by-step School-Based Assessment guide for this subject is being prepared.</p>
          <p className="sba-note">Check back soon to see the task breakdown, a worked sample, marking notes, and a checklist.</p>
        </div>
      </div>
    );
  }

  const totalMarks = (data.tasks || []).reduce((sum, t) => sum + (parseInt(t.marks, 10) || 0), 0);
  const sample = data.sample || [];
  const tasks = data.tasks || [];
  const checklist = data.checklist || [];

  return (
    <div className="sba-container">
      <div className="sba-intro">
        <div className="sba-intro-icon">📋</div>
        <div>
          <h3>CSEC School-Based Assessment</h3>
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
            <h4>Sample SBA</h4>
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
    </div>
  );
}
