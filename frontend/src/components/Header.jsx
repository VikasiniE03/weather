import React, { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Cpu,
  Play,
  RefreshCw,
  Smartphone,
  LogIn,
  LogOut,
  Shield,
  User,
  Radio,
  Sliders,
  AlertTriangle,
  GitCompare,
  LayoutDashboard
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchUnreadNotificationCount } from "../services/api";

export const Header = ({
  isLive = true,
  onManualTick,
  onReset,
  onOpenExplainer,
  onOpenOperatorModal,
  activeAlertCount = 0,
  smsCount = 0
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const res = await fetchUnreadNotificationCount();
        if (isMounted && res.success) {
          setUnreadNotifications(res.unreadCount || 0);
        }
      } catch (err) {
        // silent fail
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
      isActive
        ? "bg-zinc-900 text-white shadow-xs font-semibold"
        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
    }`;

  return (
    <header className="border-b border-zinc-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Branding */}
        <div className="flex items-center space-x-3.5">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 shadow-xs group-hover:border-zinc-400 transition-all">
              <Activity className="w-5 h-5 text-zinc-900" />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[9px] font-bold text-white items-center justify-center">
                    {activeAlertCount}
                  </span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-zinc-900">
                  AERO-SENSE
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono">
                  SIH 2026
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 hidden sm:block">
                Spatial-Temporal Weather Sensor Anomaly Detection & SMS Dispatch Network
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Quick Telemetry Status + Auth Info */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Telemetry Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-zinc-500">SYNC:</span>
            <span className="text-zinc-900 font-bold">LIVE</span>
          </div>

          {/* User Account / Role Pill */}
          {currentUser ? (
            <div className="flex items-center space-x-2 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg text-xs">
              <div className="flex items-center space-x-1 text-zinc-800 font-medium">
                {currentUser.role === "admin" ? (
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span className="font-semibold text-zinc-900">{currentUser.name?.split(" ")[0]}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700">
                  {currentUser.role}
                </span>
                {currentUser.assignedStationId && (
                  <Link
                    to={`/station/${currentUser.assignedStationId}`}
                    className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded transition-colors"
                    title="Jump to my assigned station dashboard"
                  >
                    {currentUser.assignedStationId}
                  </Link>
                )}
              </div>
              <button
                onClick={handleLogout}
                title="Log out or switch account"
                className="text-zinc-500 hover:text-rose-600 transition-colors p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
          )}

          {/* Quick Actions (if handlers provided) */}
          {onManualTick && (
            <button
              onClick={onManualTick}
              title="Advance telemetry by 1 cycle immediately"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-xs font-medium text-white transition-all shadow-xs"
            >
              <Play className="w-3 h-3 text-zinc-200 fill-zinc-200" />
              <span className="hidden sm:inline">Step Cycle</span>
            </button>
          )}

          {onOpenExplainer && (
            <button
              onClick={onOpenExplainer}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700 shadow-xs"
              title="View Algorithm Explainer"
            >
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">AI Math</span>
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              title="Reset simulation to initial baseline"
              className="p-1 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="border-t border-zinc-100 bg-zinc-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between overflow-x-auto">
          <nav className="flex items-center space-x-1 min-w-max">
            <NavLink to="/" end className={navLinkClasses}>
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Central Dashboard</span>
            </NavLink>

            {/* Individual Station Direct Quick Links */}
            {currentUser?.assignedStationId ? (
              <NavLink to={`/station/${currentUser.assignedStationId}`} className={navLinkClasses}>
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                <span>My Station ({currentUser.assignedStationId})</span>
              </NavLink>
            ) : (
              <NavLink to="/station/STN-001" className={navLinkClasses}>
                <Radio className="w-3.5 h-3.5" />
                <span>Station Dashboard</span>
              </NavLink>
            )}

            <NavLink to="/comparison" className={navLinkClasses}>
              <GitCompare className="w-3.5 h-3.5" />
              <span>Neighbor IDW</span>
            </NavLink>

            <NavLink to="/incidents" className={navLinkClasses}>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Incidents</span>
              {activeAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white">
                  {activeAlertCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/notifications" className={navLinkClasses}>
              <Bell className="w-3.5 h-3.5" />
              <span>Notifications</span>
              {unreadNotifications > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-600 text-white">
                  {unreadNotifications}
                </span>
              )}
            </NavLink>

            <NavLink to="/simulator" className={navLinkClasses}>
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulator Studio</span>
            </NavLink>

            <NavLink to="/operators" className={navLinkClasses}>
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Operators & SMS</span>
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
};
export default Header;
