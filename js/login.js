console.log("login.js loaded");

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

(async () => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    window.location.replace("admin/contact");
  }
})();

// ================================
// DOM ELEMENTS
// ================================
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const otpSection = document.getElementById("otpSection");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpInputs = document.querySelectorAll(".otp-input");

// ================================
// TEMP STATE
// ================================
let cachedEmail = "";
let cachedPassword = "";

// ================================
// OTP INPUT UX
// ================================
otpInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "");

    if (input.value && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && index > 0) {
      otpInputs[index - 1].focus();
    }
  });
});

function getOtpValue() {
  return Array.from(otpInputs)
    .map((i) => i.value)
    .join("");
}

// ================================
// STEP 1️⃣ PASSWORD CHECK → SEND OTP
// ================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!email || !password) {
    loginError.textContent = "Email and password required";
    return;
  }

  submitBtn.classList.add("loading");

  try {
    const res = await fetch("http://localhost:5000/api/start-password-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    submitBtn.classList.remove("loading");

    if (!res.ok || !data.success) {
      loginError.textContent = data.error || "Invalid login credentials";
      return;
    }

    // Cache credentials temporarily
    cachedEmail = email;
    cachedPassword = password;

    // Show OTP UI
    loginForm.style.display = "none";
    otpSection.style.display = "block";
    if (otpInputs.length > 0) {
      otpInputs[0].focus();
    }
  } catch (err) {
    submitBtn.classList.remove("loading");
    console.error(err);
    loginError.textContent = "Server error. Please try again.";
  }
});

// ================================
// STEP 2️⃣ VERIFY OTP → FINAL LOGIN
// ================================
verifyOtpBtn.addEventListener("click", async () => {
  loginError.textContent = "";

  const otp = getOtpValue();

  if (otp.length !== 6) {
    loginError.textContent = "Please enter the full 6-digit OTP";
    return;
  }

  verifyOtpBtn.classList.add("loading");

  try {
    const res = await fetch("http://localhost:5000/api/verify-email-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: cachedEmail,
        otp,
      }),
    });

    const data = await res.json();

    verifyOtpBtn.classList.remove("loading");

    if (res.ok && data.success && data.step === "OTP_VERIFIED") {
      // Store token (e.g. in localStorage)
      localStorage.setItem("admin_token", data.token);
      // SUCCESS
      window.location.href = "admin/contact";
    } else {
      // else do nothing (or just show error if it wasn't successful)
      if (!data.success) {
        loginError.textContent = data.error || "Invalid OTP";
      }
    }
  } catch (err) {
    verifyOtpBtn.classList.remove("loading");
    console.error(err);
    loginError.textContent = "OTP verification failed";
  }
});

document.getElementById("backToLogin").addEventListener("click", () => {
  // Hide OTP section
  otpSection.style.display = "none";

  // Show login form again
  loginForm.style.display = "block";

  // Clear OTP inputs (important)
  document.querySelectorAll(".otp-box").forEach((box) => {
    box.value = "";
  });

  // Optional: clear error
  loginError.textContent = "";
});
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

/* Prevent focus + selection */
togglePassword.addEventListener("mousedown", (e) => {
  e.preventDefault();
});

/* Toggle visibility */
togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";

  togglePassword.classList.toggle("fa-eye");
  togglePassword.classList.toggle("fa-eye-slash");
});
