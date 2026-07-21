"use client";

import { FormEvent, useState } from "react";
import styles from "./team.module.css";

type Role = "admin" | "moderator" | "worker";
type Account = { email: string; role: Role; active: boolean; createdAt: string; managedByEnvironment: boolean };

const roleDescriptions: Record<Role, string> = {
  admin: "Full orders, team and settings access",
  moderator: "Review, confirm and cancel orders",
  worker: "Prepare, ready and deliver orders",
};

export default function TeamManager({ initialAccounts, currentEmail }: { initialAccounts: Account[]; currentEmail: string }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("worker");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function refresh() {
    const response = await fetch("/api/staff/team");
    const result = await response.json();
    if (response.ok) setAccounts(result.accounts);
  }

  async function invite(event: FormEvent) {
    event.preventDefault(); setBusy("invite"); setMessage("");
    const response = await fetch("/api/staff/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
    const result = await response.json();
    if (response.ok) { setEmail(""); setMessage("Staff access added."); await refresh(); }
    else setMessage(result.error ?? "Could not add staff access.");
    setBusy("");
  }

  async function update(account: Account, changes: Partial<Pick<Account, "role" | "active">>) {
    setBusy(account.email); setMessage("");
    const response = await fetch("/api/staff/team", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: account.email, ...changes }) });
    const result = await response.json();
    if (response.ok) { setMessage("Staff access updated."); await refresh(); }
    else setMessage(result.error ?? "Could not update staff access.");
    setBusy("");
  }

  return <section className={styles.workspace}>
    <form className={styles.invite} onSubmit={invite}>
      <div><p>INVITE STAFF</p><h2>Add an authorized account</h2><span>The email must match the person’s ChatGPT sign-in email.</span></div>
      <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@example.com" /></label>
      <label>Role<select value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="worker">Worker</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select><small>{roleDescriptions[role]}</small></label>
      <button disabled={busy === "invite"}>{busy === "invite" ? "Adding…" : "Add staff access"}</button>
    </form>
    {message && <p className={styles.message} role="status">{message}</p>}
    <div className={styles.listHead}><h2>Authorized staff</h2><span>{accounts.filter((account) => account.active).length} active</span></div>
    <div className={styles.list}>{accounts.map((account) => {
      const locked = account.managedByEnvironment || account.email === currentEmail.toLowerCase();
      return <article key={account.email} className={!account.active ? styles.disabled : ""}>
        <div className={styles.identity}><span>{account.email.slice(0, 1).toUpperCase()}</span><div><b>{account.email}</b><small>{account.managedByEnvironment ? "Protected owner" : account.active ? "Active staff account" : "Access disabled"}</small></div></div>
        <label>Role<select aria-label={`Role for ${account.email}`} value={account.role} disabled={locked || busy === account.email} onChange={(event) => update(account, { role: event.target.value as Role })}><option value="admin">Admin</option><option value="moderator">Moderator</option><option value="worker">Worker</option></select></label>
        <button className={account.active ? styles.disable : styles.enable} disabled={locked || busy === account.email} onClick={() => update(account, { active: !account.active })}>{account.active ? "Disable" : "Enable"}</button>
      </article>;
    })}</div>
  </section>;
}
