import { useState } from "react";
import axios from "axios";

function Register({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        "http://localhost:5002/api/auth/register",
        {
          name,
          email,
          password,
        }
      );

      setMessage("Registration successful. Please login.");

      setTimeout(() => {
        onLogin();
      }, 1000);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Registration failed"
      );
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>☁️ CloudVault</h1>

        <h2>Create Account</h2>

        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            Register
          </button>
        </form>

        {message && <p>{message}</p>}

        <button onClick={onLogin}>
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default Register;