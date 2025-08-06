require("dotenv").config();
const mysql = require("mysql2/promise");
const mongoose = require("mongoose");

// MongoDB Models
const User = require("./models/User");
const Vehicle = require("./models/Vehicle");
const Branch = require("./models/Branch");
const Custodian = require("./models/Custodian");
const Driver = require("./models/Driver");
const KmsReport = require("./models/KmsReport");

// Connect to MySQL
const mysqlConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "kms_db",
};

// Convert SQL date fields to JS Date
function formatDate(d) {
  return d instanceof Date ? d : new Date(d);
}

async function migrate() {
  try {
    const mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log("✅ Connected to MySQL");

    await mongoose.connect(process.env.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const tables = [
      { sql: "SELECT * FROM add_user", model: User },
      { sql: "SELECT * FROM vehicle", model: Vehicle },
      { sql: "SELECT * FROM branch", model: Branch },
      { sql: "SELECT * FROM custodian", model: Custodian },
      { sql: "SELECT * FROM driver", model: Driver },
      { sql: "SELECT * FROM kms_report", model: KmsReport, formatDates: true },
    ];

    for (const { sql, model, formatDates } of tables) {
      const [rows] = await mysqlConn.execute(sql);
      if (!rows.length) continue;

      if (formatDates) {
        for (let row of rows) {
          for (let key in row) {
            if (key.toLowerCase().includes("date") && row[key]) {
              row[key] = formatDate(row[key]);
            }
          }
        }
      }

      await model.insertMany(rows, { ordered: false });
      console.log(`✅ Migrated ${rows.length} records to ${model.modelName}`);
    }

    await mysqlConn.end();
    await mongoose.disconnect();
    console.log("🎉 Migration completed!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  }
}

migrate();
