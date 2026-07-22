import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { getStaffRole, listResellerApplications } from "@/db/orders";
import ResellerManager from "./reseller-manager";
import styles from "./resellers.module.css";

export const dynamic = "force-dynamic";

export default async function StaffResellersPage() {
  const user = await requireChatGPTUser("/staff/resellers");
  const role = await getStaffRole(user.email);
  if (role !== "admin" && role !== "moderator") return <main className={styles.denied}><b>QI</b><p>BUSINESS ACCESS</p><h1>Administrator or moderator access is required.</h1><a href="/staff/orders">Return to orders</a></main>;
  const applications = await listResellerApplications();
  return <main className={styles.shell}>
    <header className={styles.header}><a href="/staff/orders" className={styles.brand}><span>QI</span><div><b>Quality Imports</b><small>Reseller operations</small></div></a><nav><a href="/staff/orders">Orders</a><a href="/staff/customers">Customers</a><a className={styles.active} href="/staff/resellers">Resellers</a>{role === "admin" && <a href="/staff/team">Team</a>}</nav><div className={styles.account}><small>{role}</small><b>{user.email}</b><a href={chatGPTSignOutPath("/")}>Sign out</a></div></header>
    <section className={styles.intro}><p>STAFF / RESELLERS</p><h1>Review access. Control every commercial condition.</h1><span>Approve applications, assign a package, add a controlled discount and suspend reseller access immediately.</span></section>
    <ResellerManager initialApplications={applications} />
  </main>;
}
