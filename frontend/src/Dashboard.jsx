import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  // Auth guard — redirect if no token
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    // Fetch user info
    fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else navigate("/");
      })
      .catch(() => navigate("/"));

    // Fetch review history
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch(`${API}/review/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setHistory(data.reviews);
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
        body: JSON.stringify({ repoUrl, filePath }),
      });

      const data = await res.json();

      if (data.success) {
        setReview(data.review);
        fetchHistory(); // refresh history after new review
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
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ margin: 0 }}>🤖 AI Code Reviewer</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user && <span>👋 {user.username}</span>}
          <button onClick={handleLogout} style={{ padding: "8px 16px", cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {/* Review Form */}
      <div style={{ background: "#f5f5f5", padding: "24px", borderRadius: "8px", marginBottom: "32px" }}>
        <h2 style={{ marginTop: 0 }}>Review a File</h2>
        <input
          type="text"
          placeholder="GitHub Repo URL (e.g. https://github.com/user/repo)"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "12px", boxSizing: "border-box" }}
        />
        <input
          type="text"
          placeholder="File path (e.g. src/index.js)"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "12px", boxSizing: "border-box" }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button
          onClick={handleReview}
          disabled={loading}
          style={{ padding: "10px 24px", cursor: "pointer", background: "#2da44e", color: "white", border: "none", borderRadius: "6px" }}
        >
          {loading ? "Reviewing..." : "Review Code"}
        </button>
      </div>

      {/* Review Output */}
      {review && (
        <div style={{ marginBottom: "32px" }}>
          <h2>Review Result</h2>
          <div style={{ background: "#1e1e1e", color: "#d4d4d4", padding: "20px", borderRadius: "8px", overflowX: "auto" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{review}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Review History */}
      <div>
        <h2>Review History</h2>
        {history.length === 0 ? (
          <p style={{ color: "#888" }}>No reviews yet. Review a file above to get started.</p>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", marginBottom: "16px", cursor: "pointer" }}
              onClick={() => setReview(item.review)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>📄 {item.filePath}</strong>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: "6px 0 0", color: "#555", fontSize: "14px" }}>{item.repoUrl}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}