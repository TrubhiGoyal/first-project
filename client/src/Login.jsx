import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const onSubmit = (data) => {
    fetch("https://first-project-hsch.onrender.com/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
      if (response.role) {
        localStorage.setItem("loggedInUser", JSON.stringify({
          name: response.name,
          email: response.email,
          role: response.role
        }));
        navigate("/home");
      } else {
        alert(response.error || "Invalid credentials");
      }
    })
    .catch(err => {
      console.error("Login failed", err);
      alert("Login request failed");
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <div>
          <input
            type="email"
            placeholder="Email"
            autoComplete="off"
            {...register("email", { required: true })}
          />
          {errors.email && <span style={{ color: "red" }}>*Required</span>}
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            {...register("password", { required: true })}
          />
          {errors.password && <span style={{ color: "red" }}>*Required</span>}
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
