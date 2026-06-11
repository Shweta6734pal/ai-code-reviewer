import { useEffect, useState } from "react";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [filePath, setFilePath] = useState("");
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setUser(data));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleReview = async () => {
    const token = localStorage.getItem("token");

    setLoading(true);
    setReview("");
    setError("");

    try {
      const response = await fetch("http://localhost:5000/review", {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Review failed");
      }

      setReview(data.review);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "60px auto", padding: "0 24px" }}>
      <h1>AI Code Reviewer</h1>

      {user ? (
        <>
          <p>Welcome: {user.username}</p>

          <div style={{ display: "grid", gap: "16px", marginTop: "32px" }}>
            <input
              type="text"
              placeholder="GitHub Repo URL, example: https://github.com/facebook/react"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              style={{ padding: "12px", fontSize: "16px" }}
            />

            <input
              type="text"
              placeholder="File Path, example: README.md"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              style={{ padding: "12px", fontSize: "16px" }}
            />

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleReview} disabled={loading}>
                {loading ? "Reviewing..." : "Review Code"}
              </button>
              <button onClick={logout}>Logout</button>
            </div>
          </div>

          {error && (
            <p style={{ color: "crimson", marginTop: "24px" }}>{error}</p>
          )}

          {review && (
            <pre
              style={{
                marginTop: "24px",
                padding: "20px",
                background: "#111827",
                color: "#f9fafb",
                whiteSpace: "pre-wrap",
                textAlign: "left",
                borderRadius: "8px",
              }}
            >
              {review}
            </pre>
          )}
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default Dashboard;
