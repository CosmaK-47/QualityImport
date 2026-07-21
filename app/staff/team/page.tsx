import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { getStaffRole, listStaffAccounts } from "@/db/orders";
import TeamManager from "./team-manager";
import styles from "./team.module.css";

export const dynamic = "force-dynamic";

export default async function StaffTeamPage() {
  const user = await requireChatGPTUser("/staff/team");
  const role = await getStaffRole(user.email);
  if (role !== "admin") {
    return <main className={styles.denied}><b>QI</b><p>ADMIN ACCESS</p><h1>This area is restricted to administrators.</h1><a href="/staff/orders">Return to orders</a></main>;
  }
  const accounts = await listStaffAccounts();
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href="/staff/orders"><span>QI</span><div><b>Quality Imports</b><small>Team access</small></div></a>
        <nav><a href="/staff/orders">Orders</a><a className={styles.active} href="/staff/team">Team</a></nav>
        <div className={styles.account}><div>{user.displayName}<small>{user.email}</small></div><a href={chatGPTSignOutPath("/")}>Sign out</a></div>
      </header>
      <section className={styles.intro}><p>STAFF / TEAM</p><h1>Control who can access operations.</h1><span>Invite staff by their ChatGPT account email, assign the minimum role they need, and disable access instantly.</span></section>
      <TeamManager initialAccounts={accounts} currentEmail={user.email} />
    </main>
  );
}
