import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const OWNER_CODE = "HOWARD-PLATFORM-2026";

export default function PlatformUnlock() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleUnlock = (e) => {
    e.preventDefault();

    if ((code || "").trim() !== OWNER_CODE) {
      setError("Wrong owner code");
      return;
    }

    try {
      localStorage.setItem("platform_owner_access", "true");
      localStorage.setItem("owner_portal_session", "true");
      localStorage.setItem("platform_owner_email", "hello@churvox.com");
    } catch (e) {}

    navigate("/platform-dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold mb-2">Platform Unlock</h1>
        <p className="text-slate-400 mb-6">
          Enter your owner code to open the platform dashboard
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            placeholder="Enter owner code"
            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 outline-none"
          />

          {error ? (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 transition px-4 py-3 font-medium"
          >
            Unlock Platform Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
