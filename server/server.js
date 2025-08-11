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
const Cluster = require("./models/cluster");
const Circle = require("./models/circle");
const Client = require("./models/client");
const { default: cluster } = require("cluster");
const UNIQUE_COLUMNS = {
  add_user: ["email", "name"],
  vehicle: ["name"],
  custodian: ["name"],
  driver: ["name"],
  branch: ["sol_id", "branch_name"],
  cluster : ["name", "circleId"],
  circle: ["name", "clientId"],
  client: ["name"]
};

const Models = {
  add_user: User,
  vehicle: Vehicle,
  branch: Branch,
  custodian: Custodian,
  driver: Driver,
  kms_report: KmsReport,
  cluster: Cluster,
  circle: Circle,
  client: Client, 
};


function convertToDate(value) {
  if (!value) return null;
  const match = value.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return new Date(`${yyyy}-${mm}-${dd}`);
}

function formatDatesInObject(obj) {
  const formatted = { ...obj };
  for (let k in formatted) {
    if (k.toLowerCase().includes("date") && formatted[k]) {
      const d = new Date(formatted[k]);
      if (!isNaN(d)) {
        formatted[k] = `${String(d.getDate()).padStart(2, "0")}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}-${d.getFullYear()}`;
      }
    }
  }
  return formatted;
}

app.get("/api/tables/client", async (req, res) => {
  try {
    const clients = await Client.find().sort({ name: 1 });
    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching clients" });
  }
});

// GET circles filtered by client
app.get("/api/tables/circle", async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { client: clientId } : {};
    const circles = await Circle.find(filter).sort({ name: 1 });
    res.json(circles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching circles" });
  }
});

// GET clusters filtered by circle
app.get("/api/tables/cluster", async (req, res) => {
  try {
    const { circleId } = req.query;
    const filter = circleId ? { circle: circleId } : {};
    const clusters = await Cluster.find(filter).sort({ name: 1 });
    res.json(clusters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching clusters" });
  }
});

// POST add client
app.post("/api/tables/client", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Client name is required" });

    const exists = await Client.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ message: "Client already exists" });

    const client = new Client({ name: name.trim() });
    await client.save();
    res.status(201).json({ success: true, client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add client" });
  }
});

// POST add circle with client reference
app.post("/api/tables/circle", async (req, res) => {
  try {
    const { name, client } = req.body; // client = clientId
    if (!name || !client)
      return res.status(400).json({ message: "Circle name and Client are required" });

    const exists = await Circle.findOne({ name: name.trim(), client });
    if (exists) return res.status(409).json({ message: "Circle already exists" });

    const circle = new Circle({ name: name.trim(), client });
    await circle.save();
    res.status(201).json({ success: true, circle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add circle" });
  }
});

// POST add cluster with circle reference
app.post("/api/tables/cluster", async (req, res) => {
  try {
    const { name, circle } = req.body; // circle = circleId
    if (!name || !circle)
      return res.status(400).json({ message: "Cluster name and Circle are required" });

    const exists = await Cluster.findOne({ name: name.trim(), circle });
    if (exists) return res.status(409).json({ message: "Cluster already exists" });

    const cluster = new Cluster({ name: name.trim(), circle });
    await cluster.save();
    res.status(201).json({ success: true, cluster });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add cluster" });
  }
});

// POST add branch with cluster reference
app.post("/api/tables/branch", async (req, res) => {
  try {
    const { sol_id, branch_name, cluster } = req.body;
    if (!sol_id || !branch_name || !cluster) {
      return res.status(400).json({ message: "Sol ID, Branch Name, and Cluster are required" });
    }

    // Duplicate check on sol_id and branch_name independently
    const duplicateSolId = await Branch.findOne({ sol_id: sol_id.trim() });
    const duplicateBranchName = await Branch.findOne({ branch_name: branch_name.trim() });

    if (duplicateSolId || duplicateBranchName) {
      const errors = {};
      if (duplicateSolId) errors.sol_id = "Sol ID already exists";
      if (duplicateBranchName) errors.branch_name = "Branch Name already exists";
      return res.status(409).json({ message: "Duplicate entry", errors });
    }

    const branch = new Branch({ sol_id: sol_id.trim(), branch_name: branch_name.trim(), cluster });
    await branch.save();

    res.status(201).json({ success: true, branch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add branch" });
  }
});
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
// POST add cluster

app.post("/api/add-entry", async (req, res) => {
  try {
    const { table, data } = req.body;

    const Model = Models[table];
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid table name" });
    }

    // Validate required parent fields for circle and cluster
    if (table === "circle") {
      if (!data.client) {
        return res.status(400).json({ success: false, message: "Client is required for circle." });
      }
    }
    if (table === "cluster") {
      if (!data.circle) {
        return res.status(400).json({ success: false, message: "Circle is required for cluster." });
      }
    }

    // Check for duplicate fields (if needed)
    const uniqueFields = {
      user: ["email"],
      vehicle: ["name"],
      driver: ["name"],
      custodian: ["name"],
      branch: ["id"],
      circle: ["name"],   // add uniqueness on name for circle
      cluster: ["name"],  // add uniqueness on name for cluster
      client: ["name"],   // optionally for client too
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
      sol_id: b.sol_id,
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
    res.json({ success: true, inserted_count: inserted.length, insertedIds: inserted.map(doc => doc._id) });
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

  // ✅ Validate inputs
  if (!table || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Table and IDs are required" });
  }

  // ✅ Allowed collections safeguard
  const allowedCollections = ["vehicle", "custodian", "driver", "branch", "add_user", "kms_report", "activity_report"];
  if (!allowedCollections.includes(table)) {
    return res.status(403).json({ error: "Unauthorized collection" });
  }

  try {
    const collection = mongoose.connection.collection(table);

    // ✅ Convert to ObjectId
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    const result = await collection.deleteMany({ _id: { $in: objectIds } });

    res.status(200).json({ message: "Deleted successfully", deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete entries" });
  }
});





  // Map route param to Mongoose model or collection name
  
  app.get("/api/tables/:name", async (req, res) => {
  const { name } = req.params;
const collectionMap = {
    cluster: "clusters",
    circle: "circles",
    client: "clients",
    user: "add_user",
    branch: "branch2",
    vehicle: "vehicle",
    custodian: "custodian",
    driver: "driver",
    kms_report: "kms_report",
    activity_report: "activity_report"
  };

  const ModelMap = {
    cluster: require("./models/cluster"),
    circle: require("./models/circle"),
    client: require("./models/client"),
    user: require("./models/add_user"),
    branch: require("./models/branch"),
    vehicle: require("./models/vehicle"),
    custodian: require("./models/custodian"),
    driver: require("./models/driver"),
    kms_report: require("./models/kms_report.models"),
    
  };

  const Model = ModelMap[name];
  if (!Model) return res.status(400).json({ error: "Invalid table name" });

  try {
    let data;

    if (name === "circle") {
      data = await Model.find().populate("client", "name").lean();
    } else if (name === "cluster") {
      data = await Model.find()
        .populate({
          path: "circle",
          select: "name client",
          populate: { path: "client", select: "name" },
        })
        .lean();
    } else if (name === "client") {
      data = await Model.find().lean();
    } else {
      data = await Model.find().lean();
    }

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
