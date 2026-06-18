import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./Dashboard.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [filePath, setFilePath] = useState("");
  const [review, setReview] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    fetch(`${API}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else navigate("/");
      })
      .catch(() => navigate("/"));

    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch(`${API}/review/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setHistory(data.reviews);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  }

  async function handleReview() {
    if (!repoUrl || !filePath) {
      setError("Please enter both repo URL and file path");
      return;
    }

    setLoading(true);
    setError("");
    setReview("");

    try {
      const res = await fetch(`${API}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoUrl,
          filePath,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setReview(data.review);
        fetchHistory();
      } else {
        setError(data.message || "Review failed");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <h1 className="logo">🤖 AI Code Reviewer</h1>

        <div className="user-section">
          {user && <span>👋 {user.username}</span>}

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Review Form */}
      <div className="card">
        <h2>Review a File</h2>

        <input
          className="input"
          type="text"
          placeholder="GitHub Repo URL (e.g. https://github.com/user/repo)"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />

        <input
          className="input"
          type="text"
          placeholder="File path (e.g. src/index.js)"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
        />

        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <button
  className="review-btn"
  onClick={handleReview}
  disabled={loading}
>
  {loading ? "🔄 Analyzing with Gemini..." : "🚀 Review Code"}
</button>
      </div>

      {/* Review Output */}
      {review && (
        <div className="card">
          <h2>📋 AI Review Report</h2>

          <div className="review-output">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {review}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Review History */}
      <div className="card">
        <h2>Review History</h2>

        {history.length === 0 ? (
          <div className="empty-state">
  <h3>No Reviews Yet</h3>
  <p>
    Submit your first file above to generate an AI code review.
  </p>
</div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="history-item"
              onClick={() => setReview(item.review)}
            >
              <div className="history-header">
                <div className="file-name">
  📄 {item.filePath}
</div>

                <span className="history-date">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="repo-url">
  🔗 {item.repoUrl}
</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}