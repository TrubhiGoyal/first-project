const express = require("express");
const router = express.Router();
const KmsReport = require("../models/kms_report.models");

// Helper: Convert "dd-mm-yyyy" to JS Date object (in IST)
function convertToDate(str) {
  if (!str || typeof str !== "string") return null;
  const [dd, mm, yyyy] = str.split("-");
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00+05:30`);
}

// ➤ POST /api/kms-report/bulk
router.post("/bulk", async (req, res) => {
  try {
    const entries = req.body.map((e) => ({
      ...e,
      data_entry_date: convertToDate(e.data_entry_date),
      activity_date: convertToDate(e.activity_date),
    }));
    const inserted = await KmsReport.insertMany(entries);
    res.json({ success: true, inserted_count: inserted.length });
  } catch (err) {
    console.error("Error in POST /kms-report/bulk:", err);
    res.status(500).json({ error: err.message });
  }
});

// ➤ GET /api/kms-report/count?trip_id=...
router.get("/count", async (req, res) => {
  try {
    const { trip_id } = req.query;
    if (!trip_id) {
      return res.status(400).json({ error: "trip_id is required" });
    }

    const count = await KmsReport.countDocuments({ trip_id });
    res.json({ count });
  } catch (err) {
    console.error("Error in GET /kms-report/count:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
