import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("loggedInUser"));
    console.log("🟡 LocalStorage User:", stored); // Debug: Show role
    if (!stored) {
      navigate("/login");
    } else {
      setUser(stored);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    navigate("/login");
  };

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isManager = user.role === "manager";

  return (
    <div style={{ textAlign: "center", padding: '2rem', maxWidth: 600, margin: 'auto' }}>
      <h1>Welcome, {user.name}!</h1>
      <p>You are logged in as: <strong>{user.role}</strong></p>
      <button onClick={handleLogout} style={{ margin: '1rem' }}>
        Logout
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
        <button onClick={() => navigate("/kms-form")}>KMS Form</button>
        <button onClick={() => navigate("/activity-form")}>Activity Form</button>

        {/* ✅ Show View Tables for admin and manager */}
        {(isAdmin || isManager) && (
          <button onClick={() => navigate("/view-tables")}>View Tables</button>
        )}

        {/* ✅ Show Add User for admin only */}
        {(isAdmin || isManager) && (
          <button onClick={() => navigate("/add-table")}>Add Table</button>
        )}
        {(isAdmin || isManager) && (
          <button onClick={() => navigate("/delete-entry")}>Delete Table</button>
        )}
      </div>
    </div>
  );
};

export default HomePage;
