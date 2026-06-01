import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SubjectPage from "./pages/SubjectPage";
import LessonView from "./pages/LessonView";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
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
              <Route path="/auth" element={<AuthPage mode="signin" />} />
              <Route path="/auth/signup" element={<AuthPage mode="signup" />} />
              <Route path="/auth/reset-password" element={<AuthPage mode="reset" />} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <footer className="app-footer">
            <p>CSEC Compass — Your self-paced CSEC exam prep platform</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}