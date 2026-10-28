import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchDemoCredentials } from "../services/api";
import { Shield, Key, Mail, Lock, ArrowRight, UserCheck, CheckCircle2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoRoles, setDemoRoles] = useState([]);

  useEffect(() => {
    fetchDemoCredentials()
      .then((data) => {
        if (data.roles) setDemoRoles(data.roles);
      })
      .catch((err) => console.warn("Failed to load demo credentials:", err.message));
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await login(email, password);
      if (data.success && data.user) {
        if (data.user.role === "operator" && data.user.assignedStationId) {
          navigate(`/station/${data.user.assignedStationId}`);
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleObj) => {
    setEmail(roleObj.email);
    setPassword(roleObj.password);
    setLoading(true);
    setError(null);

    try {
      const data = await login(roleObj.email, roleObj.password);
      if (data.success && data.user) {
        if (data.user.role === "operator" && data.user.assignedStationId) {
          navigate(`/station/${data.user.assignedStationId}`);
        } else {
          navigate("/");
        }
      }
    } catch (err) {
      setError(err.message || "Quick login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <Shield className="w-6 h-6 text-rose-500" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 font-sans">
          AERO-SENSE ACCESS GATEWAY
        </h2>
        <p className="mt-1 text-xs text-zinc-500 font-mono">
          Spatial-Temporal Weather Sensor Anomaly Detection System • SIH 2026
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-3xl border border-zinc-200 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-700">Official Email</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@aerosense.gov.in"
                  className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-300 text-sm font-mono placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-zinc-700">Access Key / Password</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-300 text-sm font-mono placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-semibold shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <span>{loading ? "Authenticating Session..." : "Authorize Access"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-6 border-t border-zinc-200">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center justify-between">
              <span>Quick Demo Role Logins</span>
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Pre-configured
              </span>
            </div>

            <div className="space-y-2">
              {demoRoles.map((roleObj, idx) => {
                const isAdmin = roleObj.role === "admin";
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickLogin(roleObj)}
                    className="w-full p-2.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-left transition-all flex items-center justify-between group font-mono text-xs"
                  >
                    <div>
                      <div className="font-bold text-zinc-900 flex items-center space-x-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAdmin ? "bg-purple-600" : "bg-emerald-500"
                          }`}
                        />
                        <span>{roleObj.title}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {roleObj.email} • Key: {roleObj.password}
                      </div>
                    </div>
                    <span className="text-zinc-400 group-hover:text-zinc-900 font-bold text-xs pl-2">
                      Select →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
