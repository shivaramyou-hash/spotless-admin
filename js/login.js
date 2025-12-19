console.log("login.js loaded");

// ================================
// SUPABASE SAFE INIT
// ================================
console.log("Supabase object:", window.supabase);

const SUPABASE_URL = "https://hufqhcirhlbyslmexvgw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZnFoY2lyaGxieXNsbWV4dmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzIwNjEsImV4cCI6MjA4MTY0ODA2MX0.wGklNcQiLAPrmZTyNYWzJxy4YJvZ239umL5HJU0kVQI";

window.supabaseClient =
  window.supabaseClient ||
  window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const supabaseClient = window.supabaseClient;

console.log("Supabase client created:", supabaseClient);

// ================================
// LOGIN HANDLER
// ================================
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

console.log("loginForm:", loginForm);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Login submit clicked");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  console.log("Email:", email);

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  console.log("Supabase response:", data, error);

  if (error) {
    loginError.textContent = error.message;
    return;
  }

  window.location.href = "admin.html";
});
