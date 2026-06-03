const SUPABASE_URL = "https://lhbsgjsykcrskjgofiwf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYnNnanN5a2Nyc2tqZ29maXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTE1NTAsImV4cCI6MjA5NjA4NzU1MH0.FSa-4mDdm1EohmUSEmWsv2lJXMxV3DcpKwmgLGLBEOE";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let transactions = [];
let targets = { ...DEFAULT_TARGETS };

let cashflowChart = null;
let expenseChart = null;
let allocationChart = null;
let budgetChart = null;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const statusBar = document.getElementById("statusBar");

const viewMode = document.getElementById("viewMode");
const monthControls = document.getElementById("monthControls");
const weekControls = document.getElementById("weekControls");
const yearControls = document.getElementById("yearControls");

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const weekPicker = document.getElementById("weekPicker");
const yearOnlySelect = document.getElementById("yearOnlySelect");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpensesEl = document.getElementById("totalExpenses");
const totalBillsEl = document.getElementById("totalBills");
const availableBalanceEl = document.getElementById("availableBalance");

const transactionForm = document.getElementById("transactionForm");
const itemName = document.getElementById("itemName");
const itemType = document.getElementById("itemType");
const itemCategory = document.getElementById("itemCategory");
const itemAmount = document.getElementById("itemAmount");
const itemDate = document.getElementById("itemDate");
const itemPaid = document.getElementById("itemPaid");

const targetForm = document.getElementById("targetForm");
const targetNote = document.getElementById("targetNote");
const targetChartNote = document.getElementById("targetChartNote");
const saveTargetsBtn = document.getElementById("saveTargetsBtn");

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
const transactionScopeLabel = document.getElementById("transactionScopeLabel");

const printBtn = document.getElementById("printBtn");
const exportBtn = document.getElementById("exportBtn");
const refreshBtn = document.getElementById("refreshBtn");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (!SUPABASE_URL.includes("supabase.co") || SUPABASE_ANON_KEY.includes("PASTE_")) {
    showStatus("Add your real Supabase URL and anon key in script.js.", "error");
    return;
  }

  populateYearSelects();
  setDefaultScopeValues();
  bindEvents();
  updateScopeControls();
  updateTargetFormState();
  await loadEverything();
}

function populateYearSelects() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 3;
  const endYear = currentYear + 5;

  yearSelect.innerHTML = "";
  yearOnlySelect.innerHTML = "";

  for (let year = startYear; year <= endYear; year += 1) {
    const optionA = document.createElement("option");
    optionA.value = String(year);
    optionA.textContent = String(year);
    yearSelect.appendChild(optionA);

    const optionB = document.createElement("option");
    optionB.value = String(year);
    optionB.textContent = String(year);
    yearOnlySelect.appendChild(optionB);
  }
}

function setDefaultScopeValues() {
  const now = new Date();

  monthSelect.value = String(now.getMonth() + 1);
  yearSelect.value = String(now.getFullYear());
  yearOnlySelect.value = String(now.getFullYear());
  weekPicker.value = getISOWeekInputValue(now);
  itemDate.value = toISODate(now);

  const savedView = localStorage.getItem("booGetViewMode");
  const savedMonth = localStorage.getItem("booGetMonth");
  const savedYear = localStorage.getItem("booGetYear");
  const savedYearOnly = localStorage.getItem("booGetYearOnly");
  const savedWeek = localStorage.getItem("booGetWeek");

  if (savedView) viewMode.value = savedView;
  if (savedMonth) monthSelect.value = savedMonth;
  if (savedYear) yearSelect.value = savedYear;
  if (savedYearOnly) yearOnlySelect.value = savedYearOnly;
  if (savedWeek) weekPicker.value = savedWeek;
}

function bindEvents() {
  viewMode.addEventListener("change", async () => {
    localStorage.setItem("booGetViewMode", viewMode.value);
    updateScopeControls();
    updateTargetFormState();
    await loadEverything();
  });

  monthSelect.addEventListener("change", async () => {
    localStorage.setItem("booGetMonth", monthSelect.value);
    await loadEverything();
  });

  yearSelect.addEventListener("change", async () => {
    localStorage.setItem("booGetYear", yearSelect.value);
    await loadEverything();
  });

  yearOnlySelect.addEventListener("change", async () => {
    localStorage.setItem("booGetYearOnly", yearOnlySelect.value);
    await loadEverything();
  });

  weekPicker.addEventListener("change", async () => {
    localStorage.setItem("booGetWeek", weekPicker.value);
    await loadEverything();
  });

  itemType.addEventListener("change", () => {
    if (itemType.value === "income") {
      itemCategory.value = "Income";
      itemPaid.checked = true;
    }
  });

  transactionForm.addEventListener("submit", addTransaction);
  targetForm.addEventListener("submit", saveTargets);

  transactionRows.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-btn")) {
      const id = event.target.dataset.id;
      await deleteTransaction(id);
    }
  });

  printBtn.addEventListener("click", () => {
    window.print();
  });

  exportBtn.addEventListener("click", exportCSV);

  refreshBtn.addEventListener("click", async () => {
    await loadEverything();
  });
}

function updateScopeControls() {
  monthControls.classList.add("hidden");
  weekControls.classList.add("hidden");
  yearControls.classList.add("hidden");

  if (viewMode.value === "month") {
    monthControls.classList.remove("hidden");
  } else if (viewMode.value === "week") {
    weekControls.classList.remove("hidden");
  } else {
    yearControls.classList.remove("hidden");
  }
}

function updateTargetFormState() {
  const isMonthView = viewMode.value === "month";
  const inputs = Object.values(targetInputs);

  inputs.forEach(input => {
    input.disabled = !isMonthView;
  });

  saveTargetsBtn.disabled = !isMonthView;

  if (isMonthView) {
    const monthName = MONTH_NAMES[Number(monthSelect.value) - 1];
    targetNote.textContent = `Edit monthly targets for ${monthName} ${yearSelect.value}`;
    targetChartNote.textContent = "Monthly targets compared to actuals";
    targetForm.classList.remove("disabled-note");
  } else if (viewMode.value === "week") {
    targetNote.textContent = "Week view uses a weekly estimate based on the month’s target. Monthly editing is disabled here.";
    targetChartNote.textContent = "Weekly actuals compared to estimated weekly targets";
    targetForm.classList.add("disabled-note");
  } else {
    targetNote.textContent = "Year view combines monthly targets across the selected year. Monthly editing is disabled here.";
    targetChartNote.textContent = "Year totals compared to yearly target totals";
    targetForm.classList.add("disabled-note");
  }
}

async function loadEverything() {
  showStatus("Loading dashboard...", "success");

  await loadTargetsForCurrentView();
  await loadTransactionsForCurrentView();

  renderEverything();

  showStatus("Dashboard updated.", "success");

  setTimeout(() => {
    hideStatus();
  }, 1800);
}

function getCurrentScopeLabel() {
  if (viewMode.value === "month") {
    const monthName = MONTH_NAMES[Number(monthSelect.value) - 1];
    return `${monthName} ${yearSelect.value}`;
  }

  if (viewMode.value === "week") {
    const { start, end } = getDateRangeForCurrentView();
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }

  return yearOnlySelect.value;
}

function getDateRangeForCurrentView() {
  if (viewMode.value === "month") {
    const month = Number(monthSelect.value);
    const year = Number(yearSelect.value);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  }

  if (viewMode.value === "week") {
    const start = getDateFromWeekInput(weekPicker.value);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  const year = Number(yearOnlySelect.value);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start, end };
}

async function loadTransactionsForCurrentView() {
  const { start, end } = getDateRangeForCurrentView();

  const { data, error } = await db
    .from("budget_transactions")
    .select("*")
    .gte("item_date", toISODate(start))
    .lte("item_date", toISODate(end))
    .order("item_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showStatus(`Could not load transactions: ${error.message}`, "error");
    transactions = [];
    return;
  }

  transactions = data || [];
}

async function loadTargetsForCurrentView() {
  if (viewMode.value === "month") {
    const month = Number(monthSelect.value);
    const year = Number(yearSelect.value);
    targets = await getMonthlyTargets(month, year);
  } else if (viewMode.value === "week") {
    const { start } = getDateRangeForCurrentView();
    const month = start.getMonth() + 1;
    const year = start.getFullYear();
    const monthTargets = await getMonthlyTargets(month, year);
    targets = prorateTargetsToWeek(monthTargets);
  } else {
    const year = Number(yearOnlySelect.value);
    targets = await getYearlyTargets(year);
  }

  fillTargetInputs();
}

async function getMonthlyTargets(month, year) {
  const { data, error } = await db
    .from("budget_targets")
    .select("*")
    .eq("target_month", month)
    .eq("target_year", year);

  if (error) {
    console.error(error);
    showStatus(`Could not load targets: ${error.message}`, "error");
    return { ...DEFAULT_TARGETS };
  }

  if (!data || data.length === 0) {
    await createDefaultTargetsForMonth(month, year);

    const retry = await db
      .from("budget_targets")
      .select("*")
      .eq("target_month", month)
      .eq("target_year", year);

    if (retry.error) {
      console.error(retry.error);
      return { ...DEFAULT_TARGETS };
    }

    return rowsToTargetObject(retry.data || []);
  }

  return rowsToTargetObject(data);
}

async function getYearlyTargets(year) {
  const { data, error } = await db
    .from("budget_targets")
    .select("*")
    .eq("target_year", year);

  if (error) {
    console.error(error);
    showStatus(`Could not load year targets: ${error.message}`, "error");

    const fallback = {};
    Object.entries(DEFAULT_TARGETS).forEach(([category, amount]) => {
      fallback[category] = amount * 12;
    });
    return fallback;
  }

  const result = {};
  Object.keys(DEFAULT_TARGETS).forEach(category => {
    result[category] = 0;
  });

  const monthsPresent = new Set((data || []).map(row => row.target_month));
  const missingMonthCount = 12 - monthsPresent.size;

  (data || []).forEach(row => {
    if (!result[row.category]) {
      result[row.category] = 0;
    }
    result[row.category] += Number(row.target_amount) || 0;
  });

  Object.entries(DEFAULT_TARGETS).forEach(([category, amount]) => {
    result[category] += amount * missingMonthCount;
  });

  return result;
}

function prorateTargetsToWeek(monthTargets) {
  const weekly = {};
  Object.entries(monthTargets).forEach(([category, amount]) => {
    weekly[category] = Math.round(((Number(amount) * 12) / 52) * 100) / 100;
  });
  return weekly;
}

async function createDefaultTargetsForMonth(month, year) {
  const rows = Object.entries(DEFAULT_TARGETS).map(([category, amount]) => ({
    category,
    target_amount: amount,
    target_month: month,
    target_year: year
  }));

  const { error } = await db
    .from("budget_targets")
    .insert(rows);

  if (error) {
    console.error(error);
  }
}

function rowsToTargetObject(rows) {
  const obj = { ...DEFAULT_TARGETS };

  rows.forEach(row => {
    obj[row.category] = Number(row.target_amount) || 0;
  });

  return obj;
}

async function addTransaction(event) {
  event.preventDefault();

  const name = itemName.value.trim();
  const type = itemType.value;
  const category = type === "income" ? "Income" : itemCategory.value;
  const amount = Number(itemAmount.value);
  const date = itemDate.value;

  if (!name) {
    showStatus("Please enter a name.", "error");
    return;
  }

  if (!amount || amount <= 0) {
    showStatus("Please enter an amount greater than zero.", "error");
    return;
  }

  if (!date) {
    showStatus("Please choose a date.", "error");
    return;
  }

  const newItem = {
    item_name: name,
    item_type: type,
    category,
    amount,
    is_paid: type === "income" ? true : itemPaid.checked,
    item_date: date
  };

  const { error } = await db
    .from("budget_transactions")
    .insert([newItem]);

  if (error) {
    console.error(error);
    showStatus(`Could not save item: ${error.message}`, "error");
    return;
  }

  transactionForm.reset();
  itemDate.value = toISODate(new Date());
  itemPaid.checked = true;
  itemCategory.value = "Income";

  await loadEverything();
  showStatus("Item saved.", "success");
}

async function saveTargets(event) {
  event.preventDefault();

  if (viewMode.value !== "month") {
    showStatus("Targets can only be edited in month view.", "error");
    return;
  }

  const month = Number(monthSelect.value);
  const year = Number(yearSelect.value);

  const rows = Object.entries(targetInputs).map(([category, input]) => ({
    category,
    target_amount: Number(input.value) || 0,
    target_month: month,
    target_year: year
  }));

  const { error } = await db
    .from("budget_targets")
    .upsert(rows, {
      onConflict: "category,target_month,target_year"
    });

  if (error) {
    console.error(error);
    showStatus(`Could not save targets: ${error.message}`, "error");
    return;
  }

  await loadEverything();
  showStatus("Targets saved.", "success");
}

async function deleteTransaction(id) {
  const { error } = await db
    .from("budget_transactions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    showStatus(`Could not delete item: ${error.message}`, "error");
    return;
  }

  await loadEverything();
  showStatus("Item deleted.", "success");
}

function renderEverything() {
  renderSummary();
  renderTransactions();
  renderBills();
  renderTopExpenses();
  renderCharts();

  const scopeLabel = getCurrentScopeLabel();
  transactionScopeLabel.textContent = `Transactions for ${scopeLabel}`;
  updateTargetFormState();
}

function getTotals() {
  let income = 0;
  let expenses = 0;
  let bills = 0;

  transactions.forEach(item => {
    const amount = Number(item.amount) || 0;

    if (item.item_type === "income") income += amount;
    if (item.item_type === "expense") expenses += amount;
    if (item.item_type === "bill") bills += amount;
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
    transactionRows.innerHTML = `<p class="empty-message">No transactions in this view yet. 👻</p>`;
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
        <span>${formatDisplayDate(item.item_date)}</span>
        <span><span class="badge ${statusClass}">${statusText}</span></span>
        <button class="delete-btn" type="button" data-id="${item.id}">Delete</button>
      </div>
    `;
  }).join("");
}

function renderBills() {
  const bills = transactions.filter(item => item.item_type === "bill");

  if (!bills.length) {
    billList.innerHTML = `<p class="empty-message">No bills in this view. 🐈</p>`;
    return;
  }

  billList.innerHTML = bills.map(item => {
    const status = item.is_paid ? "Paid" : "Unpaid";
    return `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHTML(item.item_name)}</div>
          <div class="list-sub">${formatDisplayDate(item.item_date)} · ${status}</div>
        </div>
        <strong>${money.format(Number(item.amount) || 0)}</strong>
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
    topExpenses.innerHTML = `<p class="empty-message">No spending categories yet. 👻</p>`;
    return;
  }

  topExpenses.innerHTML = rows.map(([category, amount]) => {
    return `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHTML(category)}</div>
          <div class="list-sub">Tracked spending</div>
        </div>
        <strong>${money.format(amount)}</strong>
      </div>
    `;
  }).join("");
}

function renderCharts() {
  if (!window.Chart) return;

  const totals = getTotals();
  const categoryTotals = getCategoryTotals();

  const categoryLabels = Object.keys(targets);
  const actualValues = categoryLabels.map(category => categoryTotals[category] || 0);
  const targetValues = categoryLabels.map(category => targets[category] || 0);

  const expenseLabels = Object.keys(categoryTotals);
  const expenseValues = Object.values(categoryTotals);

  destroyCharts();

  cashflowChart = new Chart(document.getElementById("cashflowChart"), {
    type: "bar",
    data: {
      labels: ["Income", "Bills", "Expenses", "Available"],
      datasets: [
        {
          label: "Amount",
          data: [totals.income, totals.bills, totals.expenses, totals.balance],
          backgroundColor: ["#0F7173", "#5D2A42", "#AF1B3F", "#417B5A"],
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
          backgroundColor: [
            "#5D2A42",
            "#AF1B3F",
            "#0F7173",
            "#417B5A",
            "#320E3B",
            "#d691a5",
            "#7ba7a8",
            "#c0a5b3"
          ],
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
          backgroundColor: ["#5D2A42", "#AF1B3F", "#0F7173", "#417B5A"],
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
          borderColor: "#AF1B3F",
          backgroundColor: "rgba(175, 27, 63, 0.10)",
          tension: 0.32,
          fill: true
        },
        {
          label: "Target",
          data: targetValues,
          borderColor: "#0F7173",
          backgroundColor: "rgba(15, 113, 115, 0.08)",
          tension: 0.32,
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
          color: "#320E3B",
          font: {
            weight: "700"
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#6a4c5d"
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          color: "#6a4c5d"
        },
        grid: {
          color: "rgba(50, 14, 59, 0.08)"
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
          color: "#320E3B",
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

  const headers = ["Name", "Type", "Category", "Amount", "Date", "Paid"];
  const rows = transactions.map(item => [
    item.item_name,
    item.item_type,
    item.category,
    item.amount,
    item.item_date,
    item.is_paid ? "Yes" : "No"
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
  link.download = `boo-get-planner-${viewMode.value}-${getCurrentScopeLabel().replaceAll(" ", "-")}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function toISODate(date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().split("T")[0];
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function getISOWeekInputValue(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000);
  const year = new Date(firstThursday).getFullYear();
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
}

function getDateFromWeekInput(value) {
  const [yearPart, weekPart] = value.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);

  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);

  if (dow <= 4 && dow !== 0) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() - 6);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  ISOweekStart.setHours(0, 0, 0, 0);
  return ISOweekStart;
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
