import { useState } from "react";
import axios from "axios";

function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "http://localhost:5002/api/auth/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem("token", response.data.token);

      onLogin();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Login failed"
      );
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>☁️ CloudVault</h1>

        <h2>Welcome Back</h2>

        <form onSubmit={handleLogin}>
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
            Login
          </button>
        </form>

        {message && <p>{message}</p>}

        <p>
          Don't have an account?{" "}
          <button onClick={onRegister}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;