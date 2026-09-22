import { useState, useEffect, useRef } from "react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../services/api.js";
import { Alert, EmptyState, StatusBadge } from "../../components/dashboard/DashboardUI.jsx";
import { UsersIcon } from "../../components/Icons.jsx";
import { ShieldIcon } from "../../components/Icons.jsx";

const roleLabels = {
  resident: "Resident",
  bhw: "Barangay Health Worker",
  staff: "Health Center Staff",
  admin: "Administrator"
};

const creatableRoles = [
  { value: "bhw", label: "Barangay Health Worker" },
  { value: "staff", label: "Health Center Staff" },
  { value: "admin", label: "Administrator" }
];

function signedInAccountId() {
  try {
    const stored = JSON.parse(localStorage.getItem("user"));
    return stored?.id ? String(stored.id) : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Users() {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("bhw");
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const cancelDeleteRef = useRef(null);
  const signedInId = signedInAccountId();

  const loadAccounts = async () => {
    try {
      const response = await api.get("/users");
      setAccounts(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load accounts.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    api
      .get("/users")
      .then((response) => {
        if (!cancelled) setAccounts(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error.response?.data?.message || "Failed to load accounts.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingDelete) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setPendingDelete(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    cancelDeleteRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingDelete]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/users", { name, email, password, role });

      setMessage(`${roleLabels[role]} account created for ${email}.`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("bhw");
      loadAccounts();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create account.");
    }
  };

  const toggleDetails = (account) => {
    setExpandedId((current) => (current === account._id ? null : account._id));
  };

  const isSignedInAccount = (account) =>
    Boolean(signedInId) && String(account._id) === signedInId;

  const isStaticAccount = (account) => Boolean(account.isStatic);

  const canDelete = (account) =>
    !isSignedInAccount(account) && !isStaticAccount(account);

  const protectionNote = (account) => {
    if (isStaticAccount(account)) {
      return "Static administrator account — email and password are fixed by the system, so it cannot be deleted.";
    }

    if (isSignedInAccount(account)) {
      return "You are signed in with this account, so you cannot delete it.";
    }

    return "";
  };

  const openDeleteDialog = (account) => {
    setMessage("");
    setPendingDelete(account);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    const account = pendingDelete;

    if (!account) return;

    setDeletingId(account._id);

    try {
      const response = await api.delete(`/users/${account._id}`);

      setMessage(
        response.data.message || `${account.name} account deleted successfully.`
      );
      if (expandedId === account._id) setExpandedId(null);
      setPendingDelete(null);
      await loadAccounts();
    } catch (error) {
      setPendingDelete(null);
      setMessage(error.response?.data?.message || "Failed to delete account.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Manage Accounts</h1>
        <p style={{ marginBottom: "1.5rem" }}>
          Residents create their own account from the register page. Barangay Health
          Worker, Health Center Staff, and Administrator accounts are created here.
        </p>

        {message && <Alert message={message} />}

        <div className="card">
          <h2>Create an Account</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {creatableRoles.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit">Create Account</button>
          </form>
        </div>

        <div className="account-list-head">
          <h2>Accounts</h2>
          {accounts.length > 0 && (
            <span className="account-count">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </span>
          )}
        </div>

        {accounts.length === 0 && (
          <EmptyState
            icon={<UsersIcon />}
            title="No accounts yet."
            hint="Created accounts will appear here."
          />
        )}

        <ul>
          {accounts.map((account) => (
            <li
              key={account._id}
              className={account.isStatic ? "static-account" : undefined}
            >
              <div className="account-head">
                <div className="account-identity">
                  <h3>{account.name}</h3>
                  {isSignedInAccount(account) && (
                    <span className="account-you">You</span>
                  )}
                </div>
                <span className={`role-badge ${account.role}`}>
                  {roleLabels[account.role] || account.role}
                </span>
              </div>

              <dl className="account-facts">
                <div>
                  <dt>Email Address</dt>
                  <dd>{account.email}</dd>
                </div>
                <div>
                  <dt>Account Status</dt>
                  <dd>
                    <StatusBadge
                      status={isStaticAccount(account) ? "Protected" : "Active"}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Date Created</dt>
                  <dd>{formatDate(account.createdAt)}</dd>
                </div>
              </dl>

              {expandedId === account._id && (
                <div className="account-details">
                  <p className="account-details-title">Account details</p>

                  <dl className="account-details-grid">
                    <div>
                      <dt>Full Name</dt>
                      <dd>{account.name}</dd>
                    </div>
                    <div>
                      <dt>Email Address</dt>
                      <dd>{account.email}</dd>
                    </div>
                    <div>
                      <dt>Account Role</dt>
                      <dd>{roleLabels[account.role] || account.role}</dd>
                    </div>
                    <div>
                      <dt>Account Status</dt>
                      <dd>{isStaticAccount(account) ? "Protected" : "Active"}</dd>
                    </div>
                    <div>
                      <dt>Date Created</dt>
                      <dd>{formatDateTime(account.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Account ID</dt>
                      <dd>{account._id}</dd>
                    </div>
                  </dl>

                  {protectionNote(account) && (
                    <p
                      className={
                        isStaticAccount(account)
                          ? "account-meta account-static"
                          : "account-meta"
                      }
                    >
                      {isStaticAccount(account) && (
                        <span aria-hidden="true">
                          <ShieldIcon />
                        </span>
                      )}
                      {protectionNote(account)}
                    </p>
                  )}
                </div>
              )}

              <div className="record-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => toggleDetails(account)}
                >
                  {expandedId === account._id ? "Hide details" : "View"}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => openDeleteDialog(account)}
                  disabled={!canDelete(account)}
                  title={
                    canDelete(account)
                      ? `Delete the account of ${account.name}`
                      : protectionNote(account)
                  }
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pendingDelete && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={closeDeleteDialog}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-delete-title">Delete this account?</h2>
            <p className="confirm-lead">
              This permanently removes the account from the database. The person
              will no longer be able to sign in.
            </p>

            <dl className="confirm-account">
              <div>
                <dt>Full Name</dt>
                <dd>{pendingDelete.name}</dd>
              </div>
              <div>
                <dt>Email Address</dt>
                <dd>{pendingDelete.email}</dd>
              </div>
              <div>
                <dt>Account Role</dt>
                <dd>{roleLabels[pendingDelete.role] || pendingDelete.role}</dd>
              </div>
            </dl>

            <div className="confirm-actions">
              <button
                type="button"
                className="secondary"
                ref={cancelDeleteRef}
                onClick={closeDeleteDialog}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
