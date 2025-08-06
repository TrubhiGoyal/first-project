require("dotenv").config(); // server.js (MongoDB version)
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const XLSX = require("xlsx");
const csvParser = require("csv-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8888;
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("✅ Connected to MongoDB"));

// Mongoose Models
const User = require("./models/add_user");
const Vehicle = require("./models/vehicle");
const Branch = require("./models/branch");
const Custodian = require("./models/custodian");
const Driver = require("./models/driver");
const KmsReport = require("./models/kms_report.models");

const UNIQUE_COLUMNS = {
  add_user: ["email", "name"],
  vehicle: ["name"],
  custodian: ["name"],
  driver: ["name"],
  branch: ["sol_id", "branch_name"]
};

const Models = {
  add_user: User,
  vehicle: Vehicle,
  branch: mongoose.model("Branch", require("./models/branch.model")),
  custodian: Custodian,
  driver: Driver,
  kms_report: KmsReport,
};

function convertToDate(ddmmyyyy) {
  if (!ddmmyyyy || typeof ddmmyyyy !== 'string') return null;
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return new Date(`${yyyy}-${mm}-${dd}`);
}

function formatDatesInObject(obj) {
  const formatted = { ...obj };
  for (let k in formatted) {
    if (k.toLowerCase().includes("date") && formatted[k]) {
      const d = new Date(formatted[k]);
      if (!isNaN(d)) {
        formatted[k] = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      }
    }
  }
  return formatted;
}

app.post("/api/add-user", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "User already exists" });
    const user = new User({ name, email, password, role });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Email not found" });
    if (user.password !== password) return res.status(401).json({ error: "Incorrect password" });
    res.json({ name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/add-entry", async (req, res) => {
  try {
    const { table, data } = req.body;

    const Model = Models[table];
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid table name" });
    }

    // Check for duplicate fields (if needed)
    const uniqueFields = {
      user: ["email"],
      vehicle: ["name"],
      driver: ["name"],
      custodian: ["name"],
      branch: ["id"],
    };

    const filters = {};
    for (let field of uniqueFields[table] || []) {
      if (data[field]) filters[field] = data[field];
    }

    const existing = await Model.findOne(filters);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
        duplicateFields: filters,
      });
    }

    const newEntry = new Model(data);
    await newEntry.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Add-entry error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


const upload = multer({ dest: "uploads/" });

app.post("/api/upload-file", upload.single("file"), async (req, res) => {
  const table = req.body.table; // ⬅️ Now reading table from the body
  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const Model = Models[table];
  const uniqueKeys = UNIQUE_COLUMNS[table];

  if (!Model || !uniqueKeys) {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: "Invalid table" });
  }

  let rows = [];
  if (ext === ".csv") {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", row => rows.push(row))
      .on("end", () => processRows());
  } else if (ext === ".xlsx" || ext === ".xls") {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.SheetNames[0];
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
    processRows();
  } else {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: "Unsupported file type" });
  }

  async function processRows() {
  let inserted = 0;
  let duplicates = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const query = {};
    for (let key of uniqueKeys) query[key] = row[key];

    const exists = await Model.findOne(query);
    if (exists) {
      duplicates.push({ rowNumber: i + 2, ...row }); // +2 because Excel rows start from 1 and 1st row is header
    } else {
      try {
        await new Model(row).save();
        inserted++;
      } catch (err) {
        console.error("Error inserting row:", err.message);
      }
    }
  }

  fs.unlinkSync(filePath);
  res.json({ inserted, duplicates });
}
});

app.get("/api/dropdowns", async (req, res) => {
  try {
    const Vehicle = require("./models/vehicle");
    const Custodian = require("./models/custodian");
    const Driver = require("./models/driver");
    const Branch = require("./models/branch");

    const vehicles = await Vehicle.find().select("name -_id").lean();
    const custodians = await Custodian.find().select("name -_id").lean();
    const drivers = await Driver.find().select("name -_id").lean();
    const branchesRaw = await Branch.find().lean();

    // ✅ Map branch data to the format expected by KMSForm.jsx
    const branches = branchesRaw.map(b => ({
      sol_id: b.id,
      branch_name: b.branch_name,
      cluster: b.city,
      circle: b.circle,
      bank_name: b.bank_name,
    }));

    res.json({
      vehicles,
      custodians,
      drivers,
      branches,
    });
  } catch (error) {
    console.error("Error in /api/dropdowns:", error);
    res.status(500).json({ error: "Failed to load dropdown data" });
  }
});


app.post("/api/kms-report/bulk", async (req, res) => {
  try {
    const entries = req.body.map(e => ({
      ...e,
      data_entry_date: convertToDate(e.data_entry_date),
      activity_date: convertToDate(e.activity_date)
      
    }));
    const inserted = await KmsReport.insertMany(entries);
    res.json({ success: true, inserted_count: inserted.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/kms-report/count", async (req, res) => {
  try {
    const { trip_id } = req.query;
    if (!trip_id) {
      return res.status(400).json({ error: "trip_id is required" });
    }

    const count = await KmsReport.countDocuments({ trip_id });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/delete", async (req, res) => {
  const { table, ids } = req.body;
  try {
    const collection = mongoose.connection.collection(table);
    await collection.deleteMany({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } });
    res.status(200).send("Deleted successfully");
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entries" });
  }
});




app.get("/api/tables/:name", async (req, res) => {
  const { name } = req.params;

  const collectionMap = {
    user: "add_user",
    branch: "branch",
    vehicle: "vehicle",
    custodian: "custodian",
    driver: "driver",
    kms_report: "kms_report",
    activity_report: "activity_report"
  };

  const collectionName = collectionMap[name];
  if (!collectionName) return res.status(400).json({ error: "Invalid table name" });

  try {
    const data = await mongoose.connection.collection(collectionName).find({}).toArray();
    res.json(data);
  } catch (err) {
    console.error("Error fetching table:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/api/export-all", async (req, res) => {
  const workbook = XLSX.utils.book_new();
  for (let key in Models) {
    const data = await Models[key].find().lean();
    const formatted = data.map(formatDatesInObject);
    const sheet = XLSX.utils.json_to_sheet(formatted);
    XLSX.utils.book_append_sheet(workbook, sheet, key);
  }
  const filename = path.join(__dirname, 'all_tables_export.xlsx');
  XLSX.writeFile(workbook, filename);
  res.download(filename);
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
