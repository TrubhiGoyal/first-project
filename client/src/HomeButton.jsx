// src/components/HomeButton.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const HomeButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide button on home, login, and register pages
  const hideOnPaths = ["/", "/login", "/register","/home"];
  if (hideOnPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <button
      style={{
        padding: "8px 16px",
        backgroundColor: "#4CAF50",
        color: "#fff",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        marginBottom: "10px"
      }}
      onClick={() => navigate("/home")}
    >
      🏠 Home
    </button>
  );
};

export default HomeButton;
