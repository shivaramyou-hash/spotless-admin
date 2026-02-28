console.log("admin-contact.js loaded");

// ================================
// 🔐 IMMEDIATE AUTH GUARD (NO UI FLASH)
// ================================
(async () => {
  const SUPABASE_URL = "https://hufqhcirhlbyslmexvgw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZnFoY2lyaGxieXNsbWV4dmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzIwNjEsImV4cCI6MjA4MTY0ODA2MX0.wGklNcQiLAPrmZTyNYWzJxy4YJvZ239umL5HJU0kVQI";

  window.supabaseClient =
    window.supabaseClient ||
    window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const supabaseClient = window.supabaseClient;

  const token = localStorage.getItem("admin_token");

  // ❌ Not logged in → go to login
  if (!token) {
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
// DOM READY (UI + DATA LOGIC)
// ================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Admin Contact DOM loaded");

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
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderTable();
  });

  fetchData();
});

// ================================
// FETCH DATA
// ================================
async function fetchData() {
  const token = localStorage.getItem("admin_token");
  try {
    const res = await fetch("https://spotless-server.vercel.app/api/contacts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error || "Failed to fetch data");
    }

    allRows = body.data || [];
    updateCounts();
    renderTable();
  } catch (error) {
    console.error("Fetch error:", error);
    showToast("Failed to fetch data", "error");
  }
}

// ================================
// UPDATE TOP COUNTS
// ================================
function updateCounts() {
  document.getElementById("totalContacts").textContent = allRows.length;

  document.getElementById("initiatedCount").textContent = allRows.filter(
    (r) => r.status === "Initiated",
  ).length;

  document.getElementById("pendingCount").textContent = allRows.filter(
    (r) => r.status === "Pending",
  ).length;

  document.getElementById("inProgressCount").textContent = allRows.filter(
    (r) => r.status === "In Progress",
  ).length;

  document.getElementById("completedCount").textContent = allRows.filter(
    (r) => r.status === "Completed",
  ).length;
}

// ================================
// RENDER TABLE (FILTER + SEARCH)
// ================================
function renderTable() {
  const tbody = document.getElementById("contactTableBody");
  tbody.innerHTML = "";

  const filteredRows = allRows.filter((row) => {
    const matchesStatus = activeFilter === "All" || row.status === activeFilter;

    const matchesSearch =
      row.name?.toLowerCase().includes(searchTerm) ||
      row.email?.toLowerCase().includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  if (!filteredRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading">No matching records found</td>
      </tr>`;
    return;
  }

  filteredRows.forEach((row) => {
    const statusClass = row.status.toLowerCase().replace(" ", "-");

    tbody.innerHTML += `
      <tr>
        <td class="contact-info">
          <strong>${row.name}</strong>
          <div>${row.email}</div>
          <div>${row.phone || "-"}</div>
        </td>

        <td>${row.services || "-"}</td>

        <td class="message">${row.message || "-"}</td>

        <td>
          <span class="status-badge status-${statusClass}">
            ${row.status}
          </span>
        </td>

        <td>
          ${new Date(row.created_on).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </td>

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
  const token = localStorage.getItem("admin_token");
  try {
    const res = await fetch(
      `https://spotless-server.vercel.app/api/contacts/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      },
    );

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error || "Failed to update status");
    }

    showToast(`Status updated to "${status}"`, "success");
    fetchData();
  } catch (error) {
    console.error("Update error:", error);
    showToast("Failed to update status", "error");
  }
}

// ================================
// DELETE ROW (OPTIONAL)
// ================================
async function deleteRow(id) {
  if (!confirm("Delete this record?")) return;

  const token = localStorage.getItem("admin_token");
  try {
    const res = await fetch(
      `https://spotless-server.vercel.app/api/contacts/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error || "Delete failed");
    }

    fetchData();
  } catch (error) {
    console.error("Delete error:", error);
    showToast("Delete failed", "error");
  }
}

// ================================
// TOAST
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
