import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Bell, CheckCheck, Clock, ExternalLink, RefreshCw, AlertCircle, Shield } from "lucide-react";

export function NotificationsPage() {
  const { currentUser, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchNotifications(filterUnread);
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.warn("Failed to load notifications:", err.message);
    } finally {
      setLoading(false);
    }
  }, [filterUnread]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 4000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Notification & Dispatch Center
            </h1>
            {unreadCount > 0 && (
              <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Targeted real-time operational notifications and telemetry alerts
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              filterUnread
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {filterUnread ? "Show All" : "Unread Only"}
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 disabled:opacity-50 flex items-center space-x-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-zinc-500 flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
            <Bell className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-zinc-900 font-mono">No Notifications</h3>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              You are all caught up! No active warnings or alerts for your station.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.notificationId}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !n.isRead
                  ? "bg-white border-zinc-300 shadow-sm ring-1 ring-zinc-200"
                  : "bg-zinc-50/60 border-zinc-200 opacity-80"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    !n.isRead ? "bg-rose-500 animate-pulse" : "bg-zinc-300"
                  }`}
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-zinc-900 font-sans">{n.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                      {n.stationId}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        n.severity === "CRITICAL"
                          ? "bg-rose-600 text-white"
                          : n.severity === "HIGH"
                          ? "bg-rose-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {n.severity}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 font-mono mt-1">{n.message}</p>
                  <div className="text-[10px] text-zinc-400 font-mono mt-1.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center font-mono text-xs">
                {n.stationId && (
                  <Link
                    to={`/station/${n.stationId}`}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 flex items-center space-x-1"
                  >
                    <span>View Station</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.notificationId)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
