console.log("admin-callback.js loaded");

// ================================
// 🔐 IMMEDIATE AUTH GUARD (NO FLASH)
// ================================
(async () => {
  const SUPABASE_URL = "https://hufqhcirhlbyslmexvgw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZnFoY2lyaGxieXNsbWV4dmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzIwNjEsImV4cCI6MjA4MTY0ODA2MX0.wGklNcQiLAPrmZTyNYWzJxy4YJvZ239umL5HJU0kVQI";

  window.supabaseClient =
    window.supabaseClient ||
    window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const supabaseClient = window.supabaseClient;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  // ❌ Not logged in → login page
  if (!session) {
    window.location.replace("/");
    return;
  }
})();

// ================================
// GLOBAL STATE
// ================================
let allRows = [];
let activeFilter = "All";
let searchTerm = "";

// ================================
// DOM READY
// ================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin Callback DOM loaded");

  // 🚪 LOGOUT
  document.getElementById("logoutBtn").onclick = async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn(e);
    }

    localStorage.clear();
    sessionStorage.clear();

    window.location.href = "/";
  };

  // 🔘 FILTER BUTTONS
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));

      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  // 🔍 SEARCH
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderTable();
    });
  }

  fetchData();
});

// ================================
// FETCH CALLBACK DATA
// ================================
async function fetchData() {
  const { data, error } = await window.supabaseClient
    .from("call_back")
    .select("*")
    .order("created_on", { ascending: false });

  if (error) {
    console.error("Fetch error:", error);
    showToast("Failed to load callback data", "error");
    return;
  }

  allRows = data || [];
  updateCounts();
  renderTable();
}

// ================================
// UPDATE TOP COUNTS
// ================================
function updateCounts() {
  document.getElementById("totalContacts").textContent = allRows.length;

  document.getElementById("initiatedCount").textContent = allRows.filter(
    (r) => r.status === "Initiated"
  ).length;

  document.getElementById("pendingCount").textContent = allRows.filter(
    (r) => r.status === "Pending"
  ).length;

  document.getElementById("inProgressCount").textContent = allRows.filter(
    (r) => r.status === "In Progress"
  ).length;
  document.getElementById("completedCount").textContent = allRows.filter(
    (r) => r.status === "Completed"
  ).length;
}

// ================================
// RENDER TABLE
// ================================
function renderTable() {
  const tbody = document.getElementById("contactTableBody");
  tbody.innerHTML = "";

  const filteredRows = allRows.filter((row) => {
    const matchesStatus = activeFilter === "All" || row.status === activeFilter;

    const matchesSearch =
      row.name?.toLowerCase().includes(searchTerm) ||
      row.phone?.toLowerCase().includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  if (!filteredRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="loading">No matching records found</td>
      </tr>`;
    return;
  }

  filteredRows.forEach((row) => {
    const statusClass = row.status.toLowerCase().replace(" ", "-");

    tbody.innerHTML += `
      <tr>
        <td>${row.name || "-"}</td>
        <td>${row.phone || "-"}</td>

        <td>
          <span class="status-badge status-${statusClass}">
            ${row.status}
          </span>
        </td>

        <td>${new Date(row.created_on).toLocaleString()}</td>

        <td>
          <div class="actions-main">
            <div class="action1">
              <span class="action-pill initiated"
                onclick="updateStatus('${row.id}', 'Initiated')">
                Initiated
              </span>

              <span class="action-pill pending"
                onclick="updateStatus('${row.id}', 'Pending')">
                Pending
              </span>
            </div>

            <div class="action2">
              <span class="action-pill in-progress"
                onclick="updateStatus('${row.id}', 'In Progress')">
                In Progress
              </span>

              <span class="action-pill completed"
                onclick="updateStatus('${row.id}', 'Completed')">
                Completed
              </span>
            </div>
          </div>
        </td>
      </tr>`;
  });
}

// ================================
// UPDATE STATUS
// ================================
async function updateStatus(id, status) {
  const { error } = await window.supabaseClient
    .from("call_back")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Update error:", error);
    showToast("Failed to update status", "error");
    return;
  }

  showToast(`Status updated to "${status}"`, "success");
  fetchData();
}

// ================================
// DELETE ROW (OPTIONAL)
// ================================
async function deleteRow(id) {
  if (!confirm("Delete this callback request?")) return;

  const { error } = await window.supabaseClient
    .from("call_back")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete error:", error);
    showToast("Delete failed", "error");
    return;
  }

  fetchData();
}

// ================================
// TOAST (SAFE)
// ================================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
