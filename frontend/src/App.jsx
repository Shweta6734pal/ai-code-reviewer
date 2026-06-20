import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import "./App.css";
import "./Home.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const navigate = useNavigate();

  const token = new URLSearchParams(window.location.search).get("token");

  if (token) {
    localStorage.setItem("token", token);
    window.history.replaceState({}, "", "/dashboard");
  }

  const login = () => {
    window.location.href = `${API}/auth/github`;
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="home">
            <div className="home-card">
              <h1 className="home-title">🤖 AI Code Reviewer</h1>

              <p className="home-subtitle">
                AI-powered code reviews for GitHub repositories using Gemini.
                Review files instantly and track your review history.
              </p>

              <button className="github-btn" onClick={login}>
                Login with GitHub
              </button>

              <div className="features">
                <span>⚡ Instant AI Reviews</span>
                <span>📂 Review History</span>
                <span>🔐 GitHub Authentication</span>
                <span>🤖 Gemini Powered</span>
              </div>
            </div>
          </div>
        }
      />

      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;