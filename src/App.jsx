import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SubjectPage from "./pages/SubjectPage";
import LessonView from "./pages/LessonView";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/subject/:subjectId" element={<SubjectPage />} />
            <Route path="/lesson/:subjectId/:lessonId" element={<LessonView />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>🧭 CSEC Compass — Your self-paced CSEC exam prep platform</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
