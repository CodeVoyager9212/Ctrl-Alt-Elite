import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { describeNotification } from "../lib/notifications";
import { supabase } from "../lib/supabase";
import type { NotificationRow } from "../types/database";
import "./ProfilePage.css";
import "./NotificationsPage.css";

const PAGE_SIZE = 25;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const { error: reminderError } = await supabase.rpc("refresh_deadline_reminders");
      if (!active) return;

      const start = page * PAGE_SIZE;
      const { data, error: loadError } = await supabase.from("notifications").select("*")
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(start, start + PAGE_SIZE);
      if (!active) return;

      if (loadError) {
        setNotifications([]);
        setHasMore(false);
        setError("Couldn't load notifications. Try Refresh.");
      } else {
        setNotifications(data.slice(0, PAGE_SIZE));
        setHasMore(data.length > PAGE_SIZE);
        if (reminderError) setError("Couldn't refresh deadline reminders.");
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [page, refresh]);

  async function markRead(notification: NotificationRow) {
    setBusy(notification.id);
    setError("");
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("notifications")
      .update({ read_at: readAt }).eq("id", notification.id);
    if (updateError) {
      setError("Couldn't mark the notification as read.");
    } else {
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
    }
    setBusy(null);
  }

  return (
    <main className="profile-page">
      <div className="profile-card notifications-card">
        <header className="notifications-header">
          <h1>Notifications</h1>
          <button type="button" className="button button--secondary" disabled={loading || busy !== null} onClick={() => { setPage(0); setRefresh((value) => value + 1); }}>Refresh</button>
        </header>
        {error && <p role="alert">{error}</p>}
        {loading && <p role="status">Loading notifications…</p>}
        {!loading && notifications.length === 0 && <p>No notifications on this page.</p>}
        {!loading && notifications.length > 0 && (
          <ul className="notifications-list">
            {notifications.map((notification) => {
              const { title, message, path } = describeNotification(notification);
              return (
                <li key={notification.id}>
                  <div>
                    <h2>{title}{!notification.read_at && <small>Unread</small>}</h2>
                    <p>{message}</p>
                    <time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
                  </div>
                  <div className="notifications-actions">
                    {path && <Link to={path}>View details</Link>}
                    {!notification.read_at && (
                      <button type="button" className="button button--secondary" disabled={busy !== null} onClick={() => void markRead(notification)}>Mark as read</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {(page > 0 || hasMore) && (
          <nav className="notifications-actions" aria-label="Notification pages">
            <button type="button" disabled={page === 0 || loading || busy !== null} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page + 1}</span>
            <button type="button" disabled={!hasMore || loading || busy !== null} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        )}
      </div>
    </main>
  );
}
