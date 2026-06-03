const SUPABASE_URL = "https://lhbsgjsykcrskjgofiwf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYnNnanN5a2Nyc2tqZ29maXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTE1NTAsImV4cCI6MjA5NjA4NzU1MH0.FSa-4mDdm1EohmUSEmWsv2lJXMxV3DcpKwmgLGLBEOE";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_TARGETS = {
  Housing: 900,
  Food: 350,
  Transportation: 250,
  Personal: 150,
  Healthcare: 150,
  Entertainment: 100,
  Savings: 400,
  Other: 100
};

let transactions = [];
let targets = { ...DEFAULT_TARGETS };

let cashflowChart;
let expenseChart;
let allocationChart;
let budgetChart;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const statusBar = document.getElementById("statusBar");

const monthSelect = document.getElementById("monthSelect");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpensesEl = document.getElementById("totalExpenses");
const totalBillsEl = document.getElementById("totalBills");
const availableBalanceEl = document.getElementById("availableBalance");

const transactionForm = document.getElementById("transactionForm");
const itemName = document.getElementById("itemName");
const itemType = document.getElementById("itemType");
const itemCategory = document.getElementById("itemCategory");
const itemAmount = document.getElementById("itemAmount");
const itemPaid = document.getElementById("itemPaid");

const targetForm = document.getElementById("targetForm");

const targetInputs = {
  Housing: document.getElementById("targetHousing"),
  Food: document.getElementById("targetFood"),
  Transportation: document.getElementById("targetTransportation"),
  Personal: document.getElementById("targetPersonal"),
  Healthcare: document.getElementById("targetHealthcare"),
  Entertainment: document.getElementById("targetEntertainment"),
  Savings: document.getElementById("targetSavings"),
  Other: document.getElementById("targetOther")
};

const transactionRows = document.getElementById("transactionRows");
const topExpenses = document.getElementById("topExpenses");
const billList = document.getElementById("billList");

const printBtn = document.getElementById("printBtn");
const exportBtn = document.getElementById("exportBtn");
const refreshBtn = document.getElementById("refreshBtn");

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  const savedMonth = localStorage.getItem("ghostBudgetSelectedMonth");

  if (savedMonth) {
    monthSelect.value = savedMonth;
  }

  bindEvents();
  await loadEverything();
}

function bindEvents() {
  monthSelect.addEventListener("change", async () => {
    localStorage.setItem("ghostBudgetSelectedMonth", monthSelect.value);
    await loadEverything();
  });

  transactionForm.addEventListener("submit", addTransaction);

  targetForm.addEventListener("submit", saveTargets);

  transactionRows.addEventListener("click", async event => {
    if (event.target.classList.contains("delete-btn")) {
      const id = event.target.dataset.id;
      await deleteTransaction(id);
    }
  });

  printBtn.addEventListener("click", () => {
    window.print();
  });

  exportBtn.addEventListener("click", exportCSV);

  refreshBtn.addEventListener("click", loadEverything);

  itemType.addEventListener("change", () => {
    if (itemType.value === "income") {
      itemCategory.value = "Income";
    }
  });
}

async function loadEverything() {
  showStatus("Loading dashboard...", "success");

  await loadTargets();
  await loadTransactions();

  renderEverything();

  showStatus("Dashboard updated and connected to Supabase.", "success");

  setTimeout(() => {
    hideStatus();
  }, 2500);
}

async function loadTransactions() {
  const selectedMonth = monthSelect.value;

  const { data, error } = await db
    .from("budget_transactions")
    .select("*")
    .eq("item_month", selectedMonth)
    .order("created_at", { ascending: false });

  if (error) {
    showStatus(`Could not load transactions: ${error.message}`, "error");
    console.error(error);
    return;
  }

  transactions = data || [];
}

async function loadTargets() {
  const selectedMonth = monthSelect.value;

  const { data, error } = await db
    .from("budget_targets")
    .select("*")
    .eq("item_month", selectedMonth);

  if (error) {
    showStatus(`Could not load budget targets: ${error.message}`, "error");
    console.error(error);
    targets = { ...DEFAULT_TARGETS };
    fillTargetInputs();
    return;
  }

  targets = { ...DEFAULT_TARGETS };

  if (data && data.length > 0) {
    data.forEach(row => {
      targets[row.category] = Number(row.target_amount) || 0;
    });
  } else {
    await createDefaultTargetsForMonth(selectedMonth);
  }

  fillTargetInputs();
}

async function createDefaultTargetsForMonth(selectedMonth) {
  const rows = Object.entries(DEFAULT_TARGETS).map(([category, amount]) => ({
    category: category,
    target_amount: amount,
    item_month: selectedMonth
  }));

  const { error } = await db
    .from("budget_targets")
    .insert(rows);

  if (error) {
    console.error(error);
  }
}

async function addTransaction(event) {
  event.preventDefault();

  const selectedMonth = monthSelect.value;
  const type = itemType.value;
  const amount = Number(itemAmount.value);

  if (!itemName.value.trim()) {
    showStatus("Please enter an item name.", "error");
    return;
  }

  if (!type) {
    showStatus("Please choose a type.", "error");
    return;
  }

  if (!itemCategory.value) {
    showStatus("Please choose a category.", "error");
    return;
  }

  if (!amount || amount <= 0) {
    showStatus("Please enter an amount greater than zero.", "error");
    return;
  }

  const newItem = {
    item_name: itemName.value.trim(),
    item_type: type,
    category: type === "income" ? "Income" : itemCategory.value,
    amount: amount,
    is_paid: type === "income" ? true : itemPaid.checked,
    item_month: selectedMonth
  };

  showStatus("Saving item...", "success");

  const { data, error } = await db
    .from("budget_transactions")
    .insert([newItem])
    .select();

  if (error) {
    showStatus(`Could not save item: ${error.message}`, "error");
    console.error(error);
    return;
  }

  if (data && data.length > 0) {
    transactions.unshift(data[0]);
  }

  transactionForm.reset();
  itemPaid.checked = true;

  renderEverything();

  showStatus("Item saved and dashboard updated.", "success");

  setTimeout(() => {
    hideStatus();
  }, 2500);
}

async function deleteTransaction(id) {
  showStatus("Deleting item...", "success");

  const { error } = await db
    .from("budget_transactions")
    .delete()
    .eq("id", id);

  if (error) {
    showStatus(`Could not delete item: ${error.message}`, "error");
    console.error(error);
    return;
  }

  transactions = transactions.filter(item => item.id !== id);

  renderEverything();

  showStatus("Item deleted.", "success");

  setTimeout(() => {
    hideStatus();
  }, 2000);
}

async function saveTargets(event) {
  event.preventDefault();

  const selectedMonth = monthSelect.value;

  const rows = Object.entries(targetInputs).map(([category, input]) => ({
    category: category,
    target_amount: Number(input.value) || 0,
    item_month: selectedMonth
  }));

  showStatus("Saving budget targets...", "success");

  const { error } = await db
    .from("budget_targets")
    .upsert(rows, {
      onConflict: "category,item_month"
    });

  if (error) {
    showStatus(`Could not save targets: ${error.message}`, "error");
    console.error(error);
    return;
  }

  rows.forEach(row => {
    targets[row.category] = row.target_amount;
  });

  renderEverything();

  showStatus("Budget targets saved.", "success");

  setTimeout(() => {
    hideStatus();
  }, 2500);
}

function renderEverything() {
  renderSummary();
  renderTransactions();
  renderBills();
  renderTopExpenses();
  renderCharts();
}

function getTotals() {
  let income = 0;
  let expenses = 0;
  let bills = 0;

  transactions.forEach(item => {
    const amount = Number(item.amount) || 0;

    if (item.item_type === "income") {
      income += amount;
    }

    if (item.item_type === "expense") {
      expenses += amount;
    }

    if (item.item_type === "bill") {
      bills += amount;
    }
  });

  return {
    income,
    expenses,
    bills,
    balance: income - expenses - bills
  };
}

function getCategoryTotals() {
  const categoryTotals = {};

  transactions.forEach(item => {
    if (item.item_type === "expense" || item.item_type === "bill") {
      const category = item.category || "Other";
      const amount = Number(item.amount) || 0;

      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }

      categoryTotals[category] += amount;
    }
  });

  return categoryTotals;
}

function renderSummary() {
  const totals = getTotals();

  totalIncomeEl.textContent = money.format(totals.income);
  totalExpensesEl.textContent = money.format(totals.expenses);
  totalBillsEl.textContent = money.format(totals.bills);
  availableBalanceEl.textContent = money.format(totals.balance);
}

function renderTransactions() {
  if (!transactions.length) {
    transactionRows.innerHTML = `<p class="empty-message">No money ghosts added for this month yet.</p>`;
    return;
  }

  transactionRows.innerHTML = transactions.map(item => {
    const statusText = item.item_type === "income"
      ? "Received"
      : item.is_paid
        ? "Paid"
        : "Unpaid";

    const statusClass = item.item_type === "income" || item.is_paid
      ? "badge-paid"
      : "badge-unpaid";

    return `
      <div class="table-row">
        <span>${escapeHTML(item.item_name)}</span>
        <span><span class="badge badge-${escapeHTML(item.item_type)}">${escapeHTML(item.item_type)}</span></span>
        <span>${escapeHTML(item.category)}</span>
        <span>${money.format(Number(item.amount) || 0)}</span>
        <span><span class="badge ${statusClass}">${statusText}</span></span>
        <button class="delete-btn" type="button" data-id="${item.id}">Delete</button>
      </div>
    `;
  }).join("");
}

function renderBills() {
  const bills = transactions.filter(item => item.item_type === "bill");

  if (!bills.length) {
    billList.innerHTML = `<p class="empty-message">No bills added for this month yet.</p>`;
    return;
  }

  billList.innerHTML = bills.map(item => {
    return `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHTML(item.item_name)}</div>
          <div class="list-sub">${escapeHTML(item.category)}</div>
        </div>
        <div>
          <strong>${money.format(Number(item.amount) || 0)}</strong>
        </div>
      </div>
    `;
  }).join("");
}

function renderTopExpenses() {
  const categoryTotals = getCategoryTotals();
  const rows = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (!rows.length) {
    topExpenses.innerHTML = `<p class="empty-message">No expenses or bills added yet.</p>`;
    return;
  }

  topExpenses.innerHTML = rows.map(([category, amount]) => {
    return `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHTML(category)}</div>
          <div class="list-sub">Monthly spending</div>
        </div>
        <strong>${money.format(amount)}</strong>
      </div>
    `;
  }).join("");
}

function renderCharts() {
  const totals = getTotals();
  const categoryTotals = getCategoryTotals();

  const categoryLabels = Object.keys(targets);
  const actualValues = categoryLabels.map(category => categoryTotals[category] || 0);
  const targetValues = categoryLabels.map(category => targets[category] || 0);

  const expenseLabels = Object.keys(categoryTotals);
  const expenseValues = Object.values(categoryTotals);

  const chartColors = [
    "#40375f",
    "#7465a8",
    "#b8a8e8",
    "#ffd7ef",
    "#dce9ff",
    "#dff8ef",
    "#fff8ea",
    "#9f91d9"
  ];

  destroyCharts();

  cashflowChart = new Chart(document.getElementById("cashflowChart"), {
    type: "bar",
    data: {
      labels: ["Income", "Bills", "Expenses", "Available"],
      datasets: [
        {
          label: "Amount",
          data: [totals.income, totals.bills, totals.expenses, totals.balance],
          backgroundColor: ["#7465a8", "#b8a8e8", "#ffd7ef", "#dff8ef"],
          borderRadius: 12
        }
      ]
    },
    options: chartOptions()
  });

  expenseChart = new Chart(document.getElementById("expenseChart"), {
    type: "doughnut",
    data: {
      labels: expenseLabels.length ? expenseLabels : ["No spending"],
      datasets: [
        {
          data: expenseValues.length ? expenseValues : [1],
          backgroundColor: chartColors,
          borderWidth: 0
        }
      ]
    },
    options: doughnutOptions()
  });

  allocationChart = new Chart(document.getElementById("allocationChart"), {
    type: "doughnut",
    data: {
      labels: ["Bills", "Expenses", "Savings", "Available"],
      datasets: [
        {
          data: [
            totals.bills,
            totals.expenses,
            categoryTotals.Savings || 0,
            Math.max(totals.balance, 0)
          ],
          backgroundColor: ["#40375f", "#7465a8", "#b8a8e8", "#dff8ef"],
          borderWidth: 0
        }
      ]
    },
    options: doughnutOptions()
  });

  budgetChart = new Chart(document.getElementById("budgetChart"), {
    type: "line",
    data: {
      labels: categoryLabels,
      datasets: [
        {
          label: "Actual",
          data: actualValues,
          borderColor: "#40375f",
          backgroundColor: "rgba(64, 55, 95, 0.12)",
          tension: 0.35,
          fill: true
        },
        {
          label: "Budget",
          data: targetValues,
          borderColor: "#b8a8e8",
          backgroundColor: "rgba(184, 168, 232, 0.12)",
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: chartOptions()
  });
}

function destroyCharts() {
  if (cashflowChart) cashflowChart.destroy();
  if (expenseChart) expenseChart.destroy();
  if (allocationChart) allocationChart.destroy();
  if (budgetChart) budgetChart.destroy();
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: {
          color: "#40375f",
          font: {
            weight: "700"
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#756f86"
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          color: "#756f86"
        },
        grid: {
          color: "rgba(64, 55, 95, 0.08)"
        }
      }
    }
  };
}

function doughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#40375f",
          font: {
            weight: "700"
          },
          boxWidth: 14,
          padding: 14
        }
      }
    }
  };
}

function fillTargetInputs() {
  Object.entries(targetInputs).forEach(([category, input]) => {
    input.value = targets[category] || 0;
  });
}

function exportCSV() {
  if (!transactions.length) {
    showStatus("There is no data to export yet.", "error");
    return;
  }

  const headers = ["Name", "Type", "Category", "Amount", "Paid", "Month"];
  const rows = transactions.map(item => [
    item.item_name,
    item.item_type,
    item.category,
    item.amount,
    item.is_paid ? "Yes" : "No",
    item.item_month
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `boo-get-planner-${monthSelect.value}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function showStatus(message, type = "success") {
  statusBar.textContent = message;
  statusBar.className = `status-bar show ${type}`;
}

function hideStatus() {
  statusBar.className = "status-bar";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
