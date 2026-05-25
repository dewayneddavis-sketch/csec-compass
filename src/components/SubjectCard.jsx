import { Link } from "react-router-dom";
import "./SubjectCard.css";

export default function SubjectCard({ subject }) {
  const count = subject.modules?.reduce((a, m) => a + (m.lessons?.length || 0), 0) || 0;
  return (
    <Link to={`/subject/${subject.id}`} className="subject-card" style={{ "--subject-color": subject.color }}>
      <div className="subject-card-icon">{subject.icon}</div>
      <h3 className="subject-card-title">{subject.name}</h3>
      <p className="subject-card-desc">{subject.description}</p>
      <div className="subject-card-meta">
        <span>{subject.modules?.length || 0} modules</span>
        <span>{count} lessons</span>
      </div>
      <div className="subject-card-arrow">→</div>
    </Link>
  );
}
