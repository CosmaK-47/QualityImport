import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { getStaffRole, listOrders } from "@/db/orders";
import styles from "./staff-orders.module.css";
import OrderActions from "./order-actions";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const paymentLabels: Record<string, string> = {
  setup_required: "Payment instructions needed",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  expired: "Expired",
  refunded: "Refunded",
};

function money(value: number, currency: string) {
  return `${new Intl.NumberFormat("ro-MD").format(value)} ${currency}`;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ro-MD", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Chisinau" }).format(new Date(value));
}

export default async function StaffOrdersPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const user = await requireChatGPTUser("/staff/orders");
  const role = await getStaffRole(user.email);
  const requestedSource = (await searchParams).source;
  const activeSource = requestedSource === "telegram" || requestedSource === "website" ? requestedSource : "all";

  if (!role) {
    return (
      <main className={styles.denied}>
        <span className={styles.monogram}>QI</span>
        <p>STAFF ACCESS</p>
        <h1>This account is not authorized.</h1>
        <p>Ask an administrator to add {user.email} to the Quality Imports staff list.</p>
        <a href={chatGPTSignOutPath("/")}>Sign out</a>
      </main>
    );
  }

  const allOrders = await listOrders();
  const orders = activeSource === "all" ? allOrders : allOrders.filter((order) => order.source === activeSource);
  const telegramCount = allOrders.filter((order) => order.source === "telegram").length;
  const paidCount = allOrders.filter((order) => order.payment_status === "paid").length;
  const awaitingCount = allOrders.filter((order) => order.payment_status === "awaiting_payment").length;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}><span>QI</span><div><b>Quality Imports</b><small>Order operations</small></div></div>
        <div className={styles.account}><span>{role}</span><div>{user.displayName}<small>{user.email}</small></div>{role !== "worker" && <a href="/staff/customers">Customers</a>}{role !== "worker" && <a href="/staff/resellers">Resellers</a>}{role === "admin" && <a href="/staff/team">Team</a>}<a href={chatGPTSignOutPath("/")}>Sign out</a></div>
      </header>

      <section className={styles.intro}>
        <div><p>STAFF / ORDERS</p><h1>One view of every order.</h1><span>Website and Telegram orders are labeled at creation and stored in the same protected system.</span></div>
        <dl>
          <div><dt>Paid</dt><dd>{paidCount}</dd></div>
          <div><dt>Awaiting</dt><dd>{awaitingCount}</dd></div>
          <div><dt>Telegram</dt><dd>{telegramCount}</dd></div>
        </dl>
      </section>

      <section className={styles.orders}>
        <div className={styles.toolbar}>
          <h2>Recent orders</h2>
          <nav aria-label="Filter orders by source">
            <a className={activeSource === "all" ? styles.active : ""} href="/staff/orders">All</a>
            <a className={activeSource === "telegram" ? styles.active : ""} href="/staff/orders?source=telegram">Telegram</a>
            <a className={activeSource === "website" ? styles.active : ""} href="/staff/orders?source=website">Website</a>
          </nav>
        </div>
        {orders.length === 0 ? (
          <div className={styles.empty}><span>00</span><h3>No {activeSource === "all" ? "" : `${activeSource} `}orders found</h3><p>{activeSource === "all" ? "Telegram and website orders will appear here automatically." : "Choose another filter to review the remaining orders."}</p></div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Order</th><th>Source</th><th>Customer</th><th>Product</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Placed</th><th>Next action</th></tr></thead>
              <tbody>{orders.map((order) => (
                <tr key={String(order.id)}>
                  <td><b>{String(order.order_number)}</b><small>{String(order.sku)}</small></td>
                  <td><span className={`${styles.source} ${order.source === "telegram" ? styles.telegram : styles.website}`}>{order.source === "telegram" ? "Telegram order" : "Website order"}</span></td>
                  <td><b>{String(order.customer_name)}</b><small>{order.customer_username ? `@${String(order.customer_username)}` : order.customer_email ? String(order.customer_email) : String(order.customer_reference)}</small>{order.customer_phone && <small>{String(order.customer_phone)}</small>}</td>
                  <td><b>{String(order.item_name)}</b><small>Quantity {String(order.quantity)}</small></td>
                  <td><b>{money(Number(order.total), String(order.currency))}</b></td>
                  <td><span className={`${styles.payment} ${styles[`payment_${String(order.payment_status)}`]}`}>{paymentLabels[String(order.payment_status)] ?? String(order.payment_status)}</span><small>{order.payment_method ? String(order.payment_method) : order.payment_provider ? String(order.payment_provider) : "Not connected"}</small><small>Email: {String(order.confirmation_email_status)}</small></td>
                  <td><span className={`${styles.status} ${styles[`status_${String(order.status)}`]}`}>{statusLabels[String(order.status)] ?? String(order.status)}</span></td>
                  <td><span>{dateTime(String(order.created_at))}</span></td>
                  <td><OrderActions orderId={String(order.id)} orderNumber={String(order.order_number)} status={String(order.status)} paymentStatus={String(order.payment_status)} canManagePayment={role === "admin" || role === "moderator"} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
