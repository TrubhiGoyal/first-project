import React, { useEffect, useState } from "react";
import axios from "axios";

const defaultEntry = {
  data_entry_date: new Date().toLocaleDateString("en-GB"),
  vehicle_id: "",
  activity_date: "",
  trip_id: "",
  custodian_name: "",
  driver_name: "",
  branches: Array(8).fill({ branch_name: "", sol_id: "", cluster: "", circle: "", client: "" }),
  trip_retrieval_count: "",
  trip_fresh_pickup_count: "",
  trip_return_retrieval_count: "",
  trip_empty_boxes_delivered_count: "",
  trip_opening_kms: "",
  trip_closing_kms: "",
  trip_kms: "",
  remarks: "",
};
function formatDateToDDMMYYYY(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

const KMSForm = ({ onCancel }) => {
  const [entry, setEntry] = useState({ ...defaultEntry });
  const [dropdowns, setDropdowns] = useState({ vehicles: [], custodians: [], drivers: [], branches: [] });

  useEffect(() => {
    axios.get("https://first-project-hsch.onrender.com/api/dropdowns")
      .then(res => setDropdowns(res.data))
      .catch(err => console.error("Dropdown load error:", err));
  }, []);

  const handleChange = (field, value) => {
    const updated = { ...entry, [field]: value };

    // Trip ID logic
    if (field === "vehicle_id" || field === "activity_date") {
  const { vehicle_id, activity_date } = updated;
  if (vehicle_id && activity_date) {
    const firstLetter = vehicle_id.charAt(0).toUpperCase();
    const last4 = vehicle_id.slice(-4);
    const date = new Date(activity_date);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    updated.trip_id = `${firstLetter}${last4}/${dd}${mm}${yy}`;
  }
}


    // Trip KMs
    if (field === "trip_opening_kms" || field === "trip_closing_kms") {
      const start = parseInt(updated.trip_opening_kms || 0);
      const end = parseInt(updated.trip_closing_kms || 0);
      updated.trip_kms = end > start ? (end - start).toString() : "0";
    }

    setEntry(updated);
  };

  const handleBranchChange = (index, value) => {
    const branches = [...entry.branches];
    const branchData = dropdowns.branches.find(b => b.branch_name === value);
    branches[index] = branchData
      ? { branch_name: value, sol_id: branchData.sol_id, cluster: branchData.cluster, circle: branchData.circle, client: branchData.bank_name }
      : { branch_name: "", sol_id: "", cluster: "", circle: "", client: "" };
    setEntry(prev => ({ ...prev, branches }));
  };

  const resetForm = () => {
    setEntry({ ...defaultEntry, data_entry_date: formatDateToDDMMYYYY(new Date()), activity_date : formatDateToDDMMYYYY(entry.activity_date) });
  };

  const handleSave = async () => {
    try {
      const tripId = entry.trip_id;
      if (!tripId) return alert("Trip ID is missing.");

      const res = await axios.get(`https://first-project-hsch.onrender.com/api/kms-report/count?trip_id=${tripId}`);
      const currentCount = res.data.count || 0;
      const newCount = currentCount + entry.branches.filter(b => b.branch_name).length;

      const branchKms = (parseFloat(entry.trip_kms || 0) / newCount).toFixed(2);

      const rows = entry.branches
        .filter(b => b.branch_name)
        .map(b => ({
          data_entry_date: entry.data_entry_date,
          vehicle_id: entry.vehicle_id,
          activity_date: entry.activity_date,
          trip_id: entry.trip_id,
          custodian_name: entry.custodian_name,
          driver_name: entry.driver_name,
          branch_name: b.branch_name,
          sol_id: b.sol_id,
          cluster: b.cluster,
          circle: b.circle,
          client: b.client,
          trip_retrieval_count: entry.trip_retrieval_count,
          trip_fresh_pickup_count: entry.trip_fresh_pickup_count,
          trip_return_retrieval_count: entry.trip_return_retrieval_count,
          trip_empty_boxes_delivered_count: entry.trip_empty_boxes_delivered_count,
          trip_opening_kms: entry.trip_opening_kms,
          trip_closing_kms: entry.trip_closing_kms,
          trip_kms: entry.trip_kms,
          remarks: entry.remarks,
          trip_branch_count: newCount,
          branch_kms: branchKms,
          transaction_id: `${entry.trip_id}/${b.sol_id}`
        }));

      await axios.post("https://first-project-hsch.onrender.com/api/kms-report/bulk", rows);
      alert("KMS entries saved successfully.");
      resetForm();
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <label>Vehicle ID</label><br />
          <select value={entry.vehicle_id} onChange={(e) => handleChange("vehicle_id", e.target.value)}>
            <option value="">Select Vehicle</option>
            {dropdowns.vehicles.map(v => <option key={v.name}>{v.name}</option>)}
          </select>

          <br /><br />
          <label>Custodian</label><br />
          <select value={entry.custodian_name} onChange={(e) => handleChange("custodian_name", e.target.value)}>
            <option value="">Select Custodian</option>
            {dropdowns.custodians.map(c => <option key={c.name}>{c.name}</option>)}
          </select>

          <br /><br />
          <label>Driver</label><br />
          <select value={entry.driver_name} onChange={(e) => handleChange("driver_name", e.target.value)}>
            <option value="">Select Driver</option>
            {dropdowns.drivers.map(d => <option key={d.name}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label>Activity Date</label><br />
          <input type="date" value={entry.activity_date} onChange={(e) => handleChange("activity_date", e.target.value)} />
        </div>

        <div>
          <label>Trip ID</label><br />
          <input type="text" value={entry.trip_id} disabled />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <table border="1" cellPadding="4" style={{ width: "100%", textAlign: "center" }}>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Sol ID</th>
              <th>Cluster</th>
              <th>Circle</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody>
            {entry.branches.map((b, i) => (
              <tr key={i}>
                <td>
                  <select value={b.branch_name} onChange={(e) => handleBranchChange(i, e.target.value)}>
                    <option value="">Select</option>
                    {dropdowns.branches.map(branch => <option key={branch.branch_name}>{branch.branch_name}</option>)}
                  </select>
                </td>
                <td><input value={b.sol_id} disabled /></td>
                <td><input value={b.cluster} disabled /></td>
                <td><input value={b.circle} disabled /></td>
                <td><input value={b.client} disabled /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div>
          <label>Retrieval Count</label>
          <input type="number" value={entry.trip_retrieval_count} onChange={(e) => handleChange("trip_retrieval_count", e.target.value)} />
        </div>
        <div>
          <label>Fresh Pickup</label>
          <input type="number" value={entry.trip_fresh_pickup_count} onChange={(e) => handleChange("trip_fresh_pickup_count", e.target.value)} />
        </div>
        <div>
          <label>Return Retrieval</label>
          <input type="number" value={entry.trip_return_retrieval_count} onChange={(e) => handleChange("trip_return_retrieval_count", e.target.value)} />
        </div>
        <div>
          <label>Empty Boxes Delivered</label>
          <input type="number" value={entry.trip_empty_boxes_delivered_count} onChange={(e) => handleChange("trip_empty_boxes_delivered_count", e.target.value)} />
        </div>
        <div>
          <label>Start KM</label>
          <input type="number" value={entry.trip_opening_kms} onChange={(e) => handleChange("trip_opening_kms", e.target.value)} />
        </div>
        <div>
          <label>End KM</label>
          <input type="number" value={entry.trip_closing_kms} onChange={(e) => handleChange("trip_closing_kms", e.target.value)} />
        </div>
        <div>
          <label>Total KM</label>
          <input type="number" value={entry.trip_kms} disabled />
        </div>
        <div>
          <label>Remarks</label>
          <textarea value={entry.remarks} onChange={(e) => handleChange("remarks", e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={handleSave}>Save</button>
        <button onClick={resetForm} style={{ marginLeft: 10 }}>Reset</button>
        <button onClick={onCancel} style={{ marginLeft: 10 }}>Cancel</button>
      </div>
    </div>
  );
};

export default KMSForm;
