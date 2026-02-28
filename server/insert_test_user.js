const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const DATABASE_URL = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

(async () => {
  try {
    const hash = await bcrypt.hash("Welcome@123", 10);
    await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      ["dazzmk2445", "dazzmk2445@gmail.com", hash],
    );
    console.log("Inserted dazzmk2445@gmail.com into users");
  } catch (err) {
    if (err.code === "23505") {
      console.log("User already active or duplicate key");
    } else {
      console.error(err);
    }
  } finally {
    pool.end();
  }
})();
