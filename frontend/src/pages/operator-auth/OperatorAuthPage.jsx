import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../shell/ChurvoxAIShell.css";
import "./OperatorAuthPage.css";

const API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cleanApiBase(value) {
  return String(value || "").replace(/\/+$/, "");
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function OperatorAuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const isSignup = mode === "signup";

  const [form, setForm] = useState({
    name: "",
    business_name: "",
    email: "",
    password: "",
  });

  const [status, setStatus] = useState({
    loading: false,
    message: "",
    error: "",
  });

  const title = isSignup ? "Start the Operator Console" : "Enter the Operator Console";
  const actionText = isSignup ? "Create account" : "Login";
  const alternateText = isSignup ? "Already have access?" : "Need an account?";
  const alternatePath = isSignup ? "/login" : "/signup";
  const alternateAction = isSignup ? "Login" : "Start Churvox";

  const endpoint = useMemo(() => {
    return `${cleanApiBase(API_BASE)}/api/auth/${isSignup ? "register" : "login"}`;
  }, [isSignup]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    setStatus({ loading: true, message: "", error: "" });

    const payload = isSignup
      ? {
          name: form.name,
          full_name: form.name,
          business_name: form.business_name,
          company_name: form.business_name,
          email: form.email,
          password: form.password,
          role: "owner",
        }
      : {
          email: form.email,
          password: form.password,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data.detail || data.message || `Request failed with ${response.status}`);
      }

      const token =
        data.access_token ||
        data.token ||
        data.auth_token ||
        data.jwt ||
        data?.user?.token ||
        "";

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("access_token", token);
        localStorage.setItem("churvox_token", token);
      }

      if (data.user) {
        localStorage.setItem("churvox_user", JSON.stringify(data.user));
      }

      setStatus({
        loading: false,
        message: isSignup ? "Account created. Opening dashboard." : "Login successful. Opening dashboard.",
        error: "",
      });

      setTimeout(() => navigate("/dashboard", { replace: true }), 350);
    } catch (error) {
      setStatus({
        loading: false,
        message: "",
        error: error.message || "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <main className="cx-auth-page">
      <section className="cx-auth-shell">
        <Link className="cx-auth-brand" to="/">
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>OPERATOR CONSOLE</small>
          </span>
        </Link>

        <div className="cx-auth-grid">
          <div className="cx-auth-copy">
            <p className="cx-kicker">SECURE OWNER ACCESS</p>
            <h1>{title}</h1>
            <p>
              Jobs, quotes, invoices, worker evidence, and admin actions come through the console.
              Churvox prepares the move. The owner clears it.
            </p>

            <div className="cx-auth-signal">
              <span>API TARGET</span>
              <strong>{cleanApiBase(API_BASE)}</strong>
            </div>
          </div>

          <form className="cx-auth-form" onSubmit={submit}>
            <div>
              <span>{isSignup ? "NEW ACCOUNT" : "LOGIN"}</span>
              <h2>{actionText}</h2>
            </div>

            {isSignup && (
              <>
                <label>
                  Your name
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    autoComplete="name"
                    placeholder="Owner name"
                    required
                  />
                </label>

                <label>
                  Business name
                  <input
                    name="business_name"
                    value={form.business_name}
                    onChange={updateField}
                    autoComplete="organization"
                    placeholder="Business name"
                    required
                  />
                </label>
              </>
            )}

            <label>
              Email
              <input
                name="email"
                value={form.email}
                onChange={updateField}
                type="email"
                autoComplete="email"
                placeholder="you@business.co.nz"
                required
              />
            </label>

            <label>
              Password
              <input
                name="password"
                value={form.password}
                onChange={updateField}
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="Password"
                minLength={6}
                required
              />
            </label>

            {status.error && <div className="cx-auth-error">{status.error}</div>}
            {status.message && <div className="cx-auth-success">{status.message}</div>}

            <button className="cx-approve-action" type="submit" disabled={status.loading}>
              {status.loading ? "Working..." : actionText}
            </button>

            <p className="cx-auth-alt">
              {alternateText} <Link to={alternatePath}>{alternateAction}</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
