import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function AccessDeniedPage() {
  const location = useLocation();
  const { currentUser } = useAuth();

  const attemptedStationId = location.state?.attemptedStationId || "an unauthorized station";
  const assignedStationId = currentUser?.assignedStationId;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            403 • Access Restricted
          </span>
          <h1 className="text-2xl font-bold text-zinc-900 mt-3">Station Boundary Isolation</h1>
          <p className="text-xs text-zinc-600 font-mono mt-2 leading-relaxed">
            Role-Based Access Control (RBAC) policy enforced. As an assigned field operator, your credentials are authorized strictly for your designated station boundary.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-left font-mono text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-500">Active User:</span>
            <span className="font-bold text-zinc-800">{currentUser?.name || "Field Operator"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Your Station:</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {assignedStationId || "Unassigned"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Attempted Target:</span>
            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              {attemptedStationId}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {assignedStationId ? (
            <Link
              to={`/station/${assignedStationId}`}
              className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-semibold shadow-sm transition-all"
            >
              <span>Return to Assigned Station ({assignedStationId})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-semibold shadow-sm transition-all"
            >
              <span>Return to Central Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-mono text-xs transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Switch Role / Login as Administrator</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AccessDeniedPage;
