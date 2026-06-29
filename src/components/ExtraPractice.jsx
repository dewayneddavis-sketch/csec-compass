import "./ExtraPractice.css";

const resources = {
  mathematics: [
    { title: "CXC Official Past Papers", url: "https://www.cxc.org/students-and-parents/past-papers/", type: "Official", desc: "Download past papers directly from CXC" },
    { title: "PascoBZ Mathematics", url: "https://pascobz.com/csec-mathematics-past-papers/", type: "Practice", desc: "Free past papers with answers" },
    { title: "CSEC Math Tutor", url: "https://www.csecmathtutor.com/", type: "Tutorial", desc: "Video tutorials and practice questions" },
    { title: "Khan Academy Math", url: "https://www.khanacademy.org/math", type: "Tutorial", desc: "Free math lessons at your pace" },
  ],
  "english-a": [
    { title: "CXC Official Past Papers", url: "https://www.cxc.org/students-and-parents/past-papers/", type: "Official", desc: "Download past papers directly from CXC" },
    { title: "PascoBZ English A", url: "https://pascobz.com/csec-english-a-past-papers/", type: "Practice", desc: "Free past papers with answers" },
  ],
  biology: [
    { title: "CXC Official Past Papers", url: "https://www.cxc.org/students-and-parents/past-papers/", type: "Official", desc: "Download past papers directly from CXC" },
    { title: "PascoBZ Biology", url: "https://pascobz.com/csec-biology-past-papers/", type: "Practice", desc: "Free past papers with answers" },
  ],
  chemistry: [
    { title: "CXC Official Past Papers", url: "https://www.cxc.org/students-and-parents/past-papers/", type: "Official" },
    { title: "PascoBZ Chemistry", url: "https://pascobz.com/csec-chemistry-past-papers/", type: "Practice" },
  ],
  physics: [
    { title: "CXC Official Past Papers", url: "https://www.cxc.org/students-and-parents/past-papers/", type: "Official" },
    { title: "PascoBZ Physics", url: "https://pascobz.com/csec-physics-past-papers/", type: "Practice" },
  ],
};

const defaultResources = [
  { title: "CXC Official Past Papers", url: "https://www.cxc.org/students-and-parents/past-papers/", type: "Official", desc: "Download past papers directly from CXC" },
  { title: "PascoBZ All Subjects", url: "https://pascobz.com/", type: "Practice", desc: "Free past papers and answers for all CSEC subjects" },
  { title: "CSEC Study Guide", url: "https://www.csecstudyguide.com/", type: "Review", desc: "Study guides and revision materials" },
];

export default function ExtraPractice({ subjectId }) {
  const subjectResources = resources[subjectId] || defaultResources;

  return (
    <div className="ep-container">
      <div className="ep-header">
        <h3>Extra Practice &amp; Past Papers</h3>
        <p>Practice with real CXC past papers and external resources to reinforce your learning.</p>
      </div>

      <div className="ep-resources">
        {subjectResources.map((r, i) => (
          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="ep-card">
            <div className={"ep-badge " + r.type.toLowerCase()}>{r.type}</div>
            <h4>{r.title}</h4>
            {r.desc && <p>{r.desc}</p>}
            <span className="ep-link">Open resource →</span>
          </a>
        ))}
      </div>

      <div className="ep-tip">
        <strong>Tip:</strong> Past papers are one of the best ways to prepare. Try timing yourself and practice under exam conditions!
      </div>
    </div>
  );
}
