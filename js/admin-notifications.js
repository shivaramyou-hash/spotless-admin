console.log("admin-notifications.js loaded");

// ================================
// SUPABASE INIT
// ================================
const SUPABASE_URL = "https://hufqhcirhlbyslmexvgw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZnFoY2lyaGxieXNsbWV4dmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzIwNjEsImV4cCI6MjA4MTY0ODA2MX0.wGklNcQiLAPrmZTyNYWzJxy4YJvZ239umL5HJU0kVQI";

window.supabaseClient =
  window.supabaseClient ||
  window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const supabaseClient = window.supabaseClient;

// ================================
// DOM ELEMENTS
// ================================
const toggle = document.getElementById("enableNotifications");
const form = document.getElementById("notificationForm");
const emailInput = document.getElementById("notificationEmails");
const saveBtn = document.getElementById("saveEmailsBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ================================
// STATE
// ================================
let SETTINGS_ID = null;

// ================================
// AUTH CHECK
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "/";
    return;
  }

  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "/";
  };

  loadSettings();
});

// ================================
// LOAD SETTINGS (SINGLE ROW)
// ================================
async function loadSettings() {
  const { data, error } = await supabaseClient
    .from("notification_settings")
    .select("*")
    .limit(1)
    .single();

  if (data) {
    SETTINGS_ID = data.id;
    toggle.checked = data.notification_enabled;
    emailInput.value = (data.notification_emails || []).join(", ");
  }

  syncUI();
}

// ================================
// UI VISIBILITY
// ================================
function syncUI() {
  form.style.display = toggle.checked ? "block" : "none";
}

// ================================
// TOGGLE ENABLE / DISABLE
// ================================
toggle.addEventListener("change", async () => {
  syncUI();
  const { error } = await supabaseClient.from("notification_settings").upsert({
    id: SETTINGS_ID,
    notification_enabled: toggle.checked,
  });

  if (error) {
    showToast("Failed to update setting", "error");
  } else {
    showToast("Notification emails updated", "success");
  }
});

// ================================
// SAVE EMAILS (UPDATE ONLY)
// ================================
saveBtn.addEventListener("click", async () => {
  const emails = emailInput.value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!emails.length) {
    showToast("Enter at least one email", "error");
    return;
  }

  const { error } = await supabaseClient.from("notification_settings").upsert({
    id: SETTINGS_ID,
    notification_enabled: true,
    notification_emails: emails,
    updated_at: new Date(),
  });
  if (error) {
    showToast("Failed to update emails", "error");
  } else {
    showToast("Notification emails updated", "success");
  }
});

// ================================
// TOAST
// ================================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function syncUI() {
  if (toggle.checked) {
    emailForm.classList.remove("hidden");
  } else {
    emailForm.classList.add("hidden");
  }
}
