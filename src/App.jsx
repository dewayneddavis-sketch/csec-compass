import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SubjectPage from "./pages/SubjectPage";
import LessonView from "./pages/LessonView";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import PricingPage from "./pages/PricingPage";
import AdminPage from "./pages/AdminPage";
import TeacherPage from "./pages/TeacherPage";
import SchoolConsolePage from "./pages/SchoolConsolePage";
import PlannerPage from "./pages/PlannerPage";
import TermsPage from "./pages/TermsPage";
import { TRADEMARK_DISCLAIMER } from "./data/legal";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/subject/:subjectId" element={<SubjectPage />} />
              <Route path="/lesson/:subjectId/:lessonId" element={<LessonView />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              {/* Public. The terms and trademark disclaimer the owner's legal
                  review asked for (2026-09-22). */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/auth" element={<AuthPage mode="signin" />} />
              <Route path="/auth/signup" element={<AuthPage mode="signup" />} />
              <Route path="/auth/reset-password" element={<AuthPage mode="reset" />} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="/teacher" element={<TeacherPage />} />
              <Route path="/school" element={<SchoolConsolePage />} />
            </Routes>
          </main>
          <footer className="app-footer">
            <p>CSEC Compass — Your self-paced CSEC exam prep platform</p>
            {/* Trademark + independence disclaimer, on EVERY page (owner legal
                review 2026-09-22). One shared string so the footer and the Terms
                page can never disagree. */}
            <p className="app-footer-legal">{TRADEMARK_DISCLAIMER}</p>
            <p className="app-footer-links">
              <Link to="/terms">Terms of Service</Link>
            </p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
