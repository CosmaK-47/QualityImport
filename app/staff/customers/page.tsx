import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { getStaffRole, listCustomers } from "@/db/orders";
import styles from "../orders/staff-orders.module.css";

export const dynamic = "force-dynamic";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ro-MD", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Chisinau" }).format(new Date(value));
}

export default async function StaffCustomersPage() {
  const user = await requireChatGPTUser("/staff/customers");
  const role = await getStaffRole(user.email);
  if (role !== "admin" && role !== "moderator") {
    return <main className={styles.denied}><span className={styles.monogram}>QI</span><p>PRIVATE CUSTOMER DATA</p><h1>Administrator or moderator access is required.</h1><a href="/staff/orders">Return to orders</a></main>;
  }
  const customers = await listCustomers();
  const marketingCount = customers.filter((customer) => Boolean(customer.marketing_consent)).length;
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}><span>QI</span><div><b>Quality Imports</b><small>Customer directory</small></div></div>
        <div className={styles.account}><span>{role}</span><a href="/staff/orders">Orders</a><a href="/staff/resellers">Resellers</a>{role === "admin" && <a href="/staff/team">Team</a>}<a href={chatGPTSignOutPath("/")}>Sign out</a></div>
      </header>
      <section className={styles.intro}>
        <div><p>STAFF / CUSTOMERS</p><h1>Order contacts, kept responsibly.</h1><span>Email and telephone details come from completed checkout forms. Marketing permission is shown separately and must never be assumed from placing an order.</span></div>
        <dl><div><dt>Customers</dt><dd>{customers.length}</dd></div><div><dt>Marketing opt-in</dt><dd>{marketingCount}</dd></div></dl>
      </section>
      <section className={styles.orders}>
        <div className={styles.toolbar}><h2>Customer directory</h2></div>
        {customers.length === 0 ? <div className={styles.empty}><span>00</span><h3>No customer contacts yet</h3><p>New website orders will create customer records automatically.</p></div> : (
          <div className={styles.tableWrap}><table><thead><tr><th>Customer</th><th>Email</th><th>Telephone</th><th>Orders</th><th>Marketing</th><th>Last order</th></tr></thead>
            <tbody>{customers.map((customer) => <tr key={String(customer.id)}>
              <td><b>{String(customer.name)}</b></td>
              <td><a href={`mailto:${String(customer.email)}`}>{String(customer.email)}</a></td>
              <td><a href={`tel:${String(customer.phone)}`}>{String(customer.phone)}</a></td>
              <td><b>{String(customer.order_count)}</b><small>First: {dateTime(String(customer.first_order_at))}</small></td>
              <td><span className={`${styles.payment} ${customer.marketing_consent ? styles.payment_paid : ""}`}>{customer.marketing_consent ? "Consented" : "Order contact only"}</span></td>
              <td>{dateTime(String(customer.last_order_at))}</td>
            </tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}
