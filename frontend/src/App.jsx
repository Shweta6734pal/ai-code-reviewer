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
              <p className="home-eyebrow">GitHub code review automation</p>

              <h1 className="home-title">AI Code Reviewer</h1>

              <p className="home-subtitle">
                Review repository files instantly and automate pull request
                feedback with AI-powered code analysis.
              </p>

              <button className="github-btn" onClick={login}>
                Continue with GitHub
              </button>

              <div className="features">
                <span>Manual file reviews</span>
                <span>Automatic pull request comments</span>
                <span>GitHub OAuth authentication</span>
                <span>Review history dashboard</span>
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