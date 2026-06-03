const starterTransactions = [
  {
    id: crypto.randomUUID(),
    name: "Paycheck",
    type: "income",
    category: "Income",
    amount: 3005,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Rent",
    type: "bill",
    category: "Housing",
    amount: 600,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Electricity",
    type: "bill",
    category: "Housing",
    amount: 85,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Water",
    type: "bill",
    category: "Housing",
    amount: 120,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Internet",
    type: "bill",
    category: "Housing",
    amount: 80,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Groceries",
    type: "expense",
    category: "Food",
    amount: 260,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Gas",
    type: "expense",
    category: "Transportation",
    amount: 150,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Personal Care",
    type: "expense",
    category: "Personal",
    amount: 97,
    paid: true
  },
  {
    id: crypto.randomUUID(),
    name: "Savings",
    type: "expense",
    category: "Savings",
    amount: 300,
    paid: true
  }
];

const starterBudgetTargets = {
  Housing: 900,
  Food: 350,
  Transportation: 250,
  Personal: 150,
  Healthcare: 150,
  Entertainment: 100,
  Savings: 400,
  Other: 100
};

const STORAGE_KEYS = {
  transactions: "ghostBudgetDashboardTransactions",
  budgetTargets: "ghostBudgetDashboardTargets",
  selectedMonth: "ghostBudgetDashboardMonth"
};

let transactions = loadTransactions();
let budgetTargets = loadBudgetTargets();

let cashflowChart;
let expenseChart;
let allocationChart;
let budgetChart;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpensesEl = document.getElementById("totalExpenses");
const billsDueEl = document.getElementById("billsDue");
const currentBalanceEl = document.getElementById("currentBalance");

const billListEl = document.getElementById("billList");
const topExpensesEl = document.getElementById("topExpenses");
const transactionRowsEl = document.getElementById("transactionRows");

const transactionForm = document.getElementById("transactionForm");
const itemName = document.getElementById("itemName");
const itemType = document.getElementById("itemType");
const itemCategory = document.getElementById("itemCategory");
const itemAmount = document.getElementById("itemAmount");

const monthSelect = document.getElementById("monthSelect");

const printDashboardBtn = document.getElementById("printDashboardBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const resetDemoBtn = document.getElementById("resetDemoBtn");

const budgetTargetForm = document.getElementById("budgetTargetForm");

const budgetInputs = {
  Housing: document.getElementById("budgetHousing"),
  Food: document.getElementById("budgetFood"),
  Transportation: document.getElementById("budgetTransportation"),
  Personal: document.getElementById("budgetPersonal"),
  Healthcare: document.getElementById("budgetHealthcare"),
  Entertainment: document.getElementById("budgetEntertainment"),
  Savings: document.getElementById("budgetSavings"),
  Other: document.getElementById("budgetOther")
};

function loadTransactions() {
  const savedTransactions = localStorage.getItem(STORAGE_KEYS.transactions);

  if (!savedTransactions) {
    return starterTransactions;
  }

  try {
    return JSON.parse(savedTransactions);
  } catch {
    return starterTransactions;
  }
}

function loadBudgetTargets() {
  const savedTargets = localStorage.getItem(STORAGE_KEYS.budgetTargets);

  if (!savedTargets) {
    return starterBudgetTargets;
  }

  try {
    return JSON.parse(savedTargets);
  } catch {
    return starterBudgetTargets;
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
}

function saveBudgetTargets() {
  localStorage.setItem(STORAGE_KEYS.budgetTargets, JSON.stringify(budgetTargets));
}

function saveSelectedMonth() {
  if (!monthSelect) return;
  localStorage.setItem(STORAGE_KEYS.selectedMonth, monthSelect.value);
}

function loadSelectedMonth() {
  if (!monthSelect) return;

  const savedMonth = localStorage.getItem(STORAGE_KEYS.selectedMonth);

  if (savedMonth) {
    monthSelect.value = savedMonth;
  }
}

function getTotals() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const bills = transactions
    .filter(item => item.type === "bill")
    .reduce((sum, item) => sum + item.amount, 0);

  const balance = income - expenses - bills;

  return { income, expenses, bills, balance };
}

function getCategoryTotals() {
  const categoryTotals = {};

  transactions
    .filter(item => item.type === "expense" || item.type === "bill")
    .forEach(item => {
      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = 0;
      }

      categoryTotals[item.category] += item.amount;
    });

  return categoryTotals;
}

function updateSummaryCards() {
  const totals = getTotals();

  totalIncomeEl.textContent = money.format(totals.income);
  totalExpensesEl.textContent = money.format(totals.expenses);
  billsDueEl.textContent = money.format(totals.bills);
  currentBalanceEl.textContent = money.format(totals.balance);
}

function renderBills() {
  const bills = transactions.filter(item => item.type === "bill");

  if (bills.length === 0) {
    billListEl.innerHTML = `<p class="empty-message">No bill ghosts yet.</p>`;
    return;
  }

  billListEl.innerHTML = bills
    .map(bill => {
      const statusClass = bill.paid ? "paid" : "unpaid";
      const statusText = bill.paid ? "Paid" : "Unpaid";

      return `
        <div class="bill-item">
          <div>
            <div class="bill-name">${escapeHTML(bill.name)}</div>
            <div>${money.format(bill.amount)}</div>
          </div>
          <span class="bill-status ${statusClass}">${statusText}</span>
        </div>
      `;
    })
    .join("");
}

function renderTopExpenses() {
  const categoryTotals = getCategoryTotals();

  const sortedExpenses = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sortedExpenses.length === 0) {
    topExpensesEl.innerHTML = `<p class="empty-message">No expense haunts yet.</p>`;
    return;
  }

  topExpensesEl.innerHTML = sortedExpenses
    .map(([category, amount]) => {
      return `
        <div class="expense-item">
          <span class="expense-name">${escapeHTML(category)}</span>
          <strong>${money.format(amount)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderTransactionRows() {
  if (transactions.length === 0) {
    transactionRowsEl.innerHTML = `<p class="empty-message">No items added yet.</p>`;
    return;
  }

  transactionRowsEl.innerHTML = transactions
    .map(item => {
      return `
        <div class="table-row">
          <span>${escapeHTML(item.name)}</span>
          <span>
            <span class="type-badge type-${item.type}">
              ${escapeHTML(item.type)}
            </span>
          </span>
          <span>${escapeHTML(item.category)}</span>
          <span>${money.format(item.amount)}</span>
          <button class="delete-btn" onclick="deleteTransaction('${item.id}')">Remove</button>
        </div>
      `;
    })
    .join("");
}

function fillBudgetInputs() {
  Object.entries(budgetInputs).forEach(([category, input]) => {
    if (input) {
      input.value = budgetTargets[category] || 0;
    }
  });
}

function createOrUpdateCharts() {
  const totals = getTotals();
  const categoryTotals = getCategoryTotals();

  const categoryLabels = Object.keys(budgetTargets);
  const actualValues = categoryLabels.map(category => categoryTotals[category] || 0);
  const budgetValues = categoryLabels.map(category => budgetTargets[category] || 0);

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

  const cashflowData = {
    labels: ["Income", "Bills", "Expenses", "Balance"],
    datasets: [
      {
        label: "Amount",
        data: [totals.income, totals.bills, totals.expenses, totals.balance],
        backgroundColor: ["#7465a8", "#b8a8e8", "#ffd7ef", "#dff8ef"],
        borderRadius: 12
      }
    ]
  };

  const expenseData = {
    labels: expenseLabels.length ? expenseLabels : ["No expenses"],
    datasets: [
      {
        data: expenseValues.length ? expenseValues : [1],
        backgroundColor: chartColors,
        borderWidth: 0
      }
    ]
  };

  const allocationData = {
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
  };

  const budgetData = {
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
        data: budgetValues,
        borderColor: "#b8a8e8",
        backgroundColor: "rgba(184, 168, 232, 0.12)",
        tension: 0.35,
        fill: true
      }
    ]
  };

  if (cashflowChart) cashflowChart.destroy();
  if (expenseChart) expenseChart.destroy();
  if (allocationChart) allocationChart.destroy();
  if (budgetChart) budgetChart.destroy();

  cashflowChart = new Chart(document.getElementById("cashflowChart"), {
    type: "bar",
    data: cashflowData,
    options: chartOptions()
  });

  expenseChart = new Chart(document.getElementById("expenseChart"), {
    type: "doughnut",
    data: expenseData,
    options: doughnutOptions()
  });

  allocationChart = new Chart(document.getElementById("allocationChart"), {
    type: "doughnut",
    data: allocationData,
    options: doughnutOptions()
  });

  budgetChart = new Chart(document.getElementById("budgetChart"), {
    type: "line",
    data: budgetData,
    options: chartOptions()
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
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

function deleteTransaction(id) {
  const index = transactions.findIndex(item => item.id === id);

  if (index !== -1) {
    transactions.splice(index, 1);
    saveTransactions();
    updateDashboard();
  }
}

function exportTransactionsToCSV() {
  const headers = ["Name", "Type", "Category", "Amount", "Paid"];
  const rows = transactions.map(item => [
    item.name,
    item.type,
    item.category,
    item.amount,
    item.paid ? "Yes" : "No"
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.download = "ghost-budget-dashboard.csv";
  downloadLink.click();

  URL.revokeObjectURL(url);
}

function resetDemoData() {
  const confirmed = confirm("Reset this dashboard back to the demo data? This will erase saved entries.");

  if (!confirmed) return;

  transactions = starterTransactions.map(item => ({
    ...item,
    id: crypto.randomUUID()
  }));

  budgetTargets = { ...starterBudgetTargets };

  saveTransactions();
  saveBudgetTargets();
  fillBudgetInputs();
  updateDashboard();
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

transactionForm.addEventListener("submit", event => {
  event.preventDefault();

  const newItem = {
    id: crypto.randomUUID(),
    name: itemName.value.trim(),
    type: itemType.value,
    category: itemCategory.value,
    amount: Number(itemAmount.value),
    paid: true
  };

  transactions.push(newItem);

  saveTransactions();
  transactionForm.reset();
  updateDashboard();
});

if (budgetTargetForm) {
  budgetTargetForm.addEventListener("submit", event => {
    event.preventDefault();

    Object.entries(budgetInputs).forEach(([category, input]) => {
      if (input) {
        budgetTargets[category] = Number(input.value) || 0;
      }
    });

    saveBudgetTargets();
    updateDashboard();
  });
}

if (monthSelect) {
  monthSelect.addEventListener("change", saveSelectedMonth);
}

if (printDashboardBtn) {
  printDashboardBtn.addEventListener("click", () => {
    window.print();
  });
}

if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", exportTransactionsToCSV);
}

if (resetDemoBtn) {
  resetDemoBtn.addEventListener("click", resetDemoData);
}

function updateDashboard() {
  updateSummaryCards();
  renderBills();
  renderTopExpenses();
  renderTransactionRows();
  createOrUpdateCharts();
}

loadSelectedMonth();
fillBudgetInputs();
updateDashboard();
