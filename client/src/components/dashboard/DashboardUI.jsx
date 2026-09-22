import { Link } from "react-router-dom";
import { CheckCircleIcon, ShieldIcon, InfoIcon, ChevronRightIcon } from "../Icons.jsx";

export function DashboardHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="dash-header">
      <div className="dash-header-text">
        {eyebrow && <p className="dash-eyebrow">{eyebrow}</p>}
        <h1 className="dash-title">{title}</h1>
        {subtitle && <p className="dash-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="dash-header-actions">{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, description, aside }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {aside && <div className="section-aside">{aside}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, hint, tone = "blue" }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function QuickAction({ to, icon, title, description, featured = false }) {
  return (
    <Link
      to={to}
      className={`quick-action${featured ? " featured" : ""}`}
    >
      {icon && <span className="quick-action-icon">{icon}</span>}
      <span className="quick-action-body">
        <span className="quick-action-title">{title}</span>
        {description && (
          <span className="quick-action-description">{description}</span>
        )}
      </span>
      <span className="quick-action-chevron" aria-hidden="true">
        <ChevronRightIcon />
      </span>
    </Link>
  );
}

const STATUS_TONES = {
  active: "success",
  confirmed: "info",
  completed: "success",
  pending: "amber",
  cancelled: "danger",
  inactive: "neutral"
};

export function StatusBadge({ status }) {
  if (!status) return null;
  const tone = STATUS_TONES[String(status).toLowerCase()] || "neutral";
  return <span className={`badge badge-${tone}`}>{status}</span>;
}

export function EmptyState({ icon, title, hint }) {
  return (
    <div className="empty-state">
      {icon && (
        <span className="empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
    </div>
  );
}

const SUCCESS_PATTERN = /success|created|updated|deleted|booked|recorded|saved|added|welcome|rescheduled|cancelled successfully|deleted successfully/i;
const ERROR_PATTERN = /fail|error|not authorized|cannot|can only|could not|must|already|invalid|required|no longer|unavailable|denied|wrong|missing|exist/i;

export function alertTone(message) {
  if (!message) return "info";
  if (ERROR_PATTERN.test(message)) return "error";
  if (SUCCESS_PATTERN.test(message)) return "success";
  return "info";
}

export function Alert({ tone, message, children }) {
  const text = message !== undefined ? message : children;
  if (text === null || text === undefined || text === "") return null;
  const resolved = tone || alertTone(String(text));

  return (
    <div className={`alert alert-${resolved}`} role="status">
      <span className="alert-icon" aria-hidden="true">
        {resolved === "success" ? (
          <CheckCircleIcon />
        ) : resolved === "error" ? (
          <ShieldIcon />
        ) : (
          <InfoIcon />
        )}
      </span>
      <span className="alert-text">{text}</span>
    </div>
  );
}

export function ChartCard({ title, description, children, className = "" }) {
  return (
    <section className={`chart-card ${className}`.trim()}>
      <div className="chart-card-head">
        <h2>{title}</h2>
        {description && <p className="chart-card-description">{description}</p>}
      </div>
      {children}
    </section>
  );
}