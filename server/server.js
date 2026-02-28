require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// ================================
// CORS HEADERS
// ================================
const corsOptions = {
  origin: ["http://127.0.0.1:5501", "http://localhost:5501"],
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  allowedHeaders: ["authorization", "x-client-info", "apikey", "content-type"],
};
app.use(cors(corsOptions));

// ================================
// ENV
// ================================
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// ================================
// CLIENTS
// ================================

const sql = require("./db");

// ================================
// HELPERS
// ================================
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ================================
// ROUTES
// ================================

// 0. HEALTH CHECK
app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", message: "Spotless Admin Server is running" });
});

// 0.5 CHECK DB CONNECTION
app.get("/api/check-db", async (req, res) => {
  try {
    const start = Date.now();
    const result =
      await sql`SELECT CURRENT_TIMESTAMP, current_database(), current_user`;
    const duration = Date.now() - start;

    return res.json({
      success: true,
      message: "Database connected successfully",
      database: result[0].current_database,
      user: result[0].current_user,
      time: result[0].current_timestamp,
      ping_ms: duration,
    });
  } catch (err) {
    console.error("DB Check Error:", err);
    return res.status(500).json({
      success: false,
      error: "Database connection failed",
      details: err.message,
    });
  }
});

// 1. START PASSWORD LOGIN
app.post("/api/start-password-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password, "email password");
    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    // 1️⃣ VERIFY PASSWORD
    let user;
    try {
      const result =
        await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
      user = result[0];
    } catch (dbError) {
      console.error("Database error during user fetch:", dbError);
      return res
        .status(500)
        .json({ error: "Database error when finding user" });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    ``;
    // 3️⃣ GENERATE OTP
    const otp = generateOtp();
    console.log(`[TESTING] Generated OTP for ${email}:`, otp);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
      await sql`INSERT INTO otp_tokens (email, otp, expires_at) VALUES (${email}, ${otpHash}, ${expiresAt})`;
    } catch (insertError) {
      console.log(insertError, "inserter");
      console.error("OTP Insert Error:", insertError);
      return res.status(500).json({ error: "Failed to create OTP" });
    }

    // 4️⃣ SEND EMAIL
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Spotless Admin <admin@spotlessmauritius.com>",
        to: email,
        subject: "Your Admin Login OTP",
        html: `
          <div style="font-family:Arial,sans-serif">
            <h2>Admin Login Verification</h2>
            <p>Your OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP expires in 5 minutes.</p>
          </div>
        `,
      }),
    });
    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error("Email API failed:", err);
      throw new Error("Email failed: " + err);
    }

    return res.json({ success: true, step: "OTP_SENT" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 2. VERIFY EMAIL OTP
app.post("/api/verify-email-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    // ================================
    // GET LATEST VALID OTP
    // ================================
    let data;
    try {
      const result =
        await sql`SELECT * FROM otp_tokens WHERE email = ${email} AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`;
      data = result[0];
    } catch (error) {
      console.error("Select OTP Error:", error);
      return res.status(500).json({ error: "Database error when finding OTP" });
    }

    if (!data) {
      return res.status(400).json({ error: "OTP expired or not found" });
    }

    // ================================
    // VERIFY OTP
    const isValid = await bcrypt.compare(otp, data.otp);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    try {
      await sql`UPDATE otp_tokens SET used = true WHERE id = ${data.id}`;
    } catch (error) {
      console.error("Update OTP Error:", error);
      // Even if marking as used fails, it's verified, but we should probably error out to be safe
      return res.status(500).json({ error: "Failed to mark OTP as used" });
    }

    // ================================
    // GENERATE JWT TOKEN
    // ================================
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || "spotless_admin_secret_fallback",
      { expiresIn: "24h" },
    );

    return res.json({ success: true, step: "OTP_VERIFIED", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 3. SEND CONTACT NOTIFICATION
app.post("/api/send-contact-notification", async (req, res) => {
  try {
    const {
      type, // "contact" | "callback"
      name,
      email,
      phone,
      services,
      message,
    } = req.body;

    if (!type || !name || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ================================
    // GET NOTIFICATION SETTINGS
    // ================================
    let settings;
    try {
      const result = await sql`SELECT * FROM notification_settings LIMIT 1`;
      settings = result[0];
    } catch (settingsError) {
      console.error("Notification Settings Error:", settingsError);
      return res
        .status(500)
        .json({ error: "Database error when finding settings" });
    }

    if (
      !settings ||
      settings.notification_enabled !== true ||
      !Array.isArray(settings.notification_emails) ||
      settings.notification_emails.length === 0
    ) {
      // Notifications disabled → silently succeed
      return res.json({ success: true, notification: "disabled" });
    }

    const recipients = settings.notification_emails;

    if (!recipients.length) {
      return res.json({ success: true, notification: "no-recipients" });
    }

    // ================================
    // EMAIL CONTENT
    // ================================
    const subject =
      type === "callback"
        ? "📞 New Callback Request"
        : "📩 New Contact Form Submission";

    const html = `
      <div style="font-family:Arial,sans-serif">
        <h2>${subject}</h2>
        <p><b>Name:</b> ${name}</p>
        ${email ? `<p><b>Email:</b> ${email}</p>` : ""}
        <p><b>Phone:</b> ${phone}</p>
        ${services ? `<p><b>Service:</b> ${services}</p>` : ""}
        ${message ? `<p><b>Message:</b><br/>${message}</p>` : ""}
        <hr/>
        <p style="font-size:12px;color:#666">
          Sent from Spotless Mauritius website
        </p>
      </div>
    `;

    // ================================
    // SEND EMAIL (RESEND)
    // ================================
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Spotless Admin <admin@srinivastaxconsultant.in>",
        to: recipients,
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error("Email failed:", err);
      throw new Error("Email send failed");
    }

    // ================================
    // SUCCESS RESPONSE
    // ================================
    return res.json({ success: true, sentTo: recipients });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ================================
// MIDDLEWARE TO VERIFY JWT TOKEN
// ================================
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ error: "No token provided" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "spotless_admin_secret_fallback",
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.user = decoded;
      next();
    },
  );
};

// ================================
// DASHBOARD ROUTES (PROTECTED)
// ================================

// Get Contacts
app.get("/api/contacts", verifyToken, async (req, res) => {
  try {
    const result =
      await sql`SELECT * FROM contact_form ORDER BY created_on DESC`;
    return res.json({ data: result });
  } catch (error) {
    console.error("Fetch contacts error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Update Contact Status
app.put("/api/contacts/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const result =
      await sql`UPDATE contact_form SET status = ${status} WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.json({ data: result[0], success: true });
  } catch (error) {
    console.error("Update contact error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Delete Contact
app.delete("/api/contacts/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result =
      await sql`DELETE FROM contact_form WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.json({ success: true, message: "Contact deleted" });
  } catch (error) {
    console.error("Delete contact error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Get Callbacks
app.get("/api/callbacks", verifyToken, async (req, res) => {
  try {
    const result = await sql`SELECT * FROM call_back ORDER BY created_on DESC`;
    return res.json({ data: result });
  } catch (error) {
    console.error("Fetch callbacks error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Update Callback Status
app.put("/api/callbacks/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const result =
      await sql`UPDATE call_back SET status = ${status} WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      return res.status(404).json({ error: "Callback not found" });
    }

    return res.json({ data: result[0], success: true });
  } catch (error) {
    console.error("Update callback error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Delete Callback
app.delete("/api/callbacks/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result =
      await sql`DELETE FROM call_back WHERE id = ${id} RETURNING *`;

    if (result.length === 0) {
      return res.status(404).json({ error: "Callback not found" });
    }

    return res.json({ success: true, message: "Callback deleted" });
  } catch (error) {
    console.error("Delete callback error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Get Notification Settings
app.get("/api/notification-settings", verifyToken, async (req, res) => {
  try {
    const result = await sql`SELECT * FROM notification_settings LIMIT 1`;

    if (result.length === 0) {
      return res.json({ data: null });
    }

    return res.json({ data: result[0] });
  } catch (error) {
    console.error("Fetch notification settings error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Upsert Notification Settings
app.post("/api/notification-settings", verifyToken, async (req, res) => {
  try {
    const { id, notification_enabled, notification_emails } = req.body;

    let result;
    if (id) {
      result =
        await sql`UPDATE notification_settings SET notification_enabled = ${notification_enabled}, notification_emails = ${notification_emails || []}, updated_at = NOW() WHERE id = ${id} RETURNING *`;
    } else {
      result =
        await sql`INSERT INTO notification_settings (notification_enabled, notification_emails) VALUES (${notification_enabled}, ${notification_emails || []}) RETURNING *`;
    }

    return res.json({ data: result[0], success: true });
  } catch (error) {
    console.error("Update notification settings error:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
