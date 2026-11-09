import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { notificationLink, timeAgo } from "../../lib/notifications";
import type { NotificationRow } from "../../types/database";
import "./NotificationBell.css";

type NotificationBellProps = {
  userId: string;
};

// Number of recent notifications shown in the dropdown.
const RECENT_LIMIT = 15;

// Check for new notifications every 30 seconds.
const REFRESH_INTERVAL_MS = 30000;

const DROPDOWN_WIDTH = 360;

// Bell in the navigation bar with a red badge for unread
// notifications and a dropdown of recent notifications.
export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Changing this reloads the notifications (used when opening the dropdown).
  const [refreshKey, setRefreshKey] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  // Load recent notifications and the unread count.
  useEffect(() => {
    let active = true;

    async function load() {
      // Creates reminders that are due (interview in the next
      // 24 hours, deadline in the next 3 days). Each one only once.
      const { error: reminderError } = await supabase.rpc(
        "create_due_reminders",
      );

      if (reminderError) {
        console.error("Reminders:", reminderError.message);
      }

      const [listResult, countResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(RECENT_LIMIT),

        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false),
      ]);

      if (!active) return;

      const loadError = listResult.error ?? countResult.error;

      if (loadError) {
        setError(`Unable to load notifications. ${loadError.message}`);
      } else {
        setError("");
        setNotifications(listResult.data ?? []);
        setUnreadCount(countResult.count ?? 0);
      }

      setLoading(false);
    }

    void load();

    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [userId, refreshKey]);

  // Close the dropdown when clicking outside of it, pressing Escape,
  // or resizing the window.
  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  function toggleDropdown() {
    if (open) {
      setOpen(false);
      return;
    }

    // Place the dropdown under the bell and keep it on screen.
    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      const width = Math.min(DROPDOWN_WIDTH, window.innerWidth - 24);

      setPosition({
        top: rect.bottom + 8,
        left: Math.max(
          12,
          Math.min(rect.left, window.innerWidth - width - 12),
        ),
      });
    }

    setOpen(true);
    setRefreshKey((key) => key + 1);
  }

  // Clicking a notification marks it as read and opens
  // the related job or application.
  async function openNotification(notification: NotificationRow) {
    setOpen(false);

    const link = notificationLink(notification);
    if (link) navigate(link);

    if (notification.is_read) return;

    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    if (updateError) {
      setError(`Unable to update notification. ${updateError.message}`);
    }
  }

  async function markAllAsRead() {
    setError("");

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (updateError) {
      setError(`Unable to update notifications. ${updateError.message}`);
      return;
    }

    setNotifications((previous) =>
      previous.map((item) => ({ ...item, is_read: true })),
    );
    setUnreadCount(0);
  }

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell__button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={toggleDropdown}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-dropdown"
          style={{ top: position.top, left: position.left }}
          role="dialog"
          aria-label="Recent notifications"
        >
          <div className="notification-dropdown__header">
            <strong>Notifications</strong>

            <button
              type="button"
              className="notification-dropdown__mark-all"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>

          {error && (
            <p className="notification-dropdown__error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="notification-dropdown__empty">
              Loading notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="notification-dropdown__empty">
              No notifications yet.
            </p>
          ) : (
            <ul className="notification-dropdown__list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={
                      notification.is_read
                        ? "notification-item"
                        : "notification-item notification-item--unread"
                    }
                    onClick={() => void openNotification(notification)}
                  >
                    <span className="notification-item__title">
                      {notification.title}
                    </span>
                    <span className="notification-item__message">
                      {notification.message}
                    </span>
                    <span className="notification-item__time">
                      {timeAgo(notification.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
