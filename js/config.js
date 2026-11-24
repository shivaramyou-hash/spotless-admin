// Shared API base URL: local server when running on localhost, Vercel otherwise.
window.API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://localhost:5000"
  : "https://spotless-server.vercel.app";

// ponytail: local dev login bypass — fake token so pages open; API calls still 401 until real login works. Remove when DB is back.
if (window.API_BASE === "http://localhost:5000" && !localStorage.getItem("admin_token")) {
  localStorage.setItem("admin_token", "dev");
}
