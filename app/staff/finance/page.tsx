import inventoryData from "@/content/inventory.json";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getFinanceOverview, listFinanceExpenses, listFinancePurchases } from "@/db/finance";
import { getStaffRole } from "@/db/orders";
import FinanceManager from "./finance-manager";
import styles from "./finance.module.css";

export const dynamic = "force-dynamic";

function money(value: number, currency = "MDL") {
  return `${new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

export default async function StaffFinancePage() {
  const user = await requireChatGPTUser("/staff/finance");
  const role = await getStaffRole(user.email);
  if (role !== "admin") {
    return <main className={styles.denied}><b>QI</b><p>ADMIN ACCESS</p><h1>Finance is restricted to administrators.</h1><a href="/staff/orders">Return to orders</a></main>;
  }

  const [overview, purchases, expenses] = await Promise.all([
    getFinanceOverview(),
    listFinancePurchases(50),
    listFinanceExpenses(50),
  ]);
  const products = inventoryData.products.map((product) => ({ sku: product.sku, name: product.website.name }));

  return <main className={styles.shell}>
    <header className={styles.header}>
      <a className={styles.brand} href="/staff/orders"><span>QI</span><div><b>Quality Imports</b><small>Private finance</small></div></a>
      <nav><a href="/staff/orders">Orders</a><a href="/staff/customers">Customers</a><a href="/staff/resellers">Resellers</a><a className={styles.active} href="/staff/finance">Finance</a><a href="/staff/team">Team</a></nav>
      <div className={styles.account}><span>admin</span><div>{user.displayName}<small>{user.email}</small></div></div>
    </header>

    <section className={styles.intro}>
      <div><p>STAFF / FINANCE</p><h1>Know what the business really keeps.</h1><span>Private product costs and actual expenses feed the physical, software, and principal profit views.</span></div>
      <dl><div><dt>Purchased stock</dt><dd>{money(overview.purchaseValueMdl)}</dd><small>{overview.purchasedUnits} units recorded</small></div><div><dt>Recorded expenses</dt><dd>{money(overview.expenseValueMdl)}</dd><small>Excludes imported ad spend</small></div><div><dt>Costed products</dt><dd>{overview.weightedCosts.length}</dd><small>Weighted-average method</small></div></dl>
    </section>

    <section className={styles.explanation}><b>How weighted average works</b><span>If 5 units cost 100 MDL and another 5 cost 120 MDL, the working product cost becomes 110 MDL per unit. You record purchases; the system performs the calculation.</span></section>

    <FinanceManager products={products} />

    <section className={styles.tables}>
      <article><div className={styles.tableHead}><h2>Product costs</h2><span>{overview.weightedCosts.length} products</span></div><div className={styles.tableWrap}><table><thead><tr><th>Product</th><th>Units recorded</th><th>Average cost</th></tr></thead><tbody>{overview.weightedCosts.length === 0 ? <tr><td colSpan={3}>No purchase costs recorded yet.</td></tr> : overview.weightedCosts.map((item) => <tr key={item.sku}><td><b>{item.productName}</b><small>{item.sku}</small></td><td>{item.purchasedUnits}</td><td><b>{money(item.averageUnitCostMdl)}</b></td></tr>)}</tbody></table></div></article>

      <article><div className={styles.tableHead}><h2>Recent purchases</h2><span>{purchases.length} records</span></div><div className={styles.tableWrap}><table><thead><tr><th>Date</th><th>Product</th><th>Quantity</th><th>Original cost</th><th>MDL cost</th></tr></thead><tbody>{purchases.length === 0 ? <tr><td colSpan={5}>No purchases recorded yet.</td></tr> : purchases.map((purchase) => <tr key={purchase.id}><td>{purchase.purchasedOn}</td><td><b>{purchase.productName}</b><small>{purchase.sku}</small></td><td>{purchase.quantity}</td><td>{money(purchase.unitCost, purchase.currency)}</td><td>{money(purchase.unitCostMdl)}</td></tr>)}</tbody></table></div></article>

      <article><div className={styles.tableHead}><h2>Recent expenses</h2><span>{expenses.length} records</span></div><div className={styles.tableWrap}><table><thead><tr><th>Date</th><th>Group</th><th>Expense</th><th>Original amount</th><th>MDL amount</th></tr></thead><tbody>{expenses.length === 0 ? <tr><td colSpan={5}>No expenses recorded yet.</td></tr> : expenses.map((expense) => <tr key={expense.id}><td>{expense.occurredOn}</td><td><span className={`${styles.scope} ${styles[expense.scope]}`}>{expense.scope}</span></td><td><b>{expense.description}</b><small>{expense.category}</small></td><td>{money(expense.amount, expense.currency)}</td><td>{money(expense.amountMdl)}</td></tr>)}</tbody></table></div></article>
    </section>
  </main>;
}
