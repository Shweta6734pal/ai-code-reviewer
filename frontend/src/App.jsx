import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Dashboard from "./Dashboard";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (token) {
      localStorage.setItem("token", token);
      navigate("/dashboard");
    }
  }, [navigate]);

  const login = () => {
    window.location.href = "http://localhost:5000/auth/github";
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ textAlign: "center", marginTop: "100px" }}>
            <h1>AI Code Reviewer</h1>
            <button onClick={login}>Login with GitHub</button>
          </div>
        }
      />

      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;