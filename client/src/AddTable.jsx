import React, { useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const AddTable = () => {
  const [selectedTable, setSelectedTable] = useState("branch");
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null); // <-- Important: useRef for file input

  const UNIQUE_FIELDS = {
    add_user: ["email", "name"],
    branch: ["sol_id", "branch_name"],
    vehicle: ["name"],
    custodian: ["name"],
    driver: ["name"],
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTableChange = (e) => {
    setSelectedTable(e.target.value);
    setFormData({});
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    setMessage("");
  };

  const getFieldsForTable = () => {
    switch (selectedTable) {
      case "add_user":
        return ["name", "email", "password", "role"];
      case "branch":
        return ["sol_id", "branch_name", "city", "circle", "bank_name"];
      case "vehicle":
      case "custodian":
      case "driver":
        return ["name"];
      default:
        return [];
    }
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      try {
        reader.readAsArrayBuffer(file);
      } catch (err) {
        reject(err);
      }
    });
  };

const handleSubmit = async () => {
  if (!selectedTable) {
    setMessage("Please select a table.");
    return;
  }

  // Check if file is selected for upload
  const fileFromInput = fileInputRef.current?.files?.[0];
  if (fileFromInput) {
    try {
      const data = await readFileAsArrayBuffer(fileFromInput);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const uniqueFields = UNIQUE_FIELDS[selectedTable];
      const uniqueValues = new Set();
      const filteredRows = [];
      const duplicateRows = [];

      for (const row of json) {
        // Support multiple unique fields
        const key = Array.isArray(uniqueFields)
          ? uniqueFields.map((f) => row[f]).join("|")
          : row[uniqueFields];
        if (
          key == null ||
          key === "" ||
          (Array.isArray(uniqueFields) &&
            uniqueFields.some((f) => !row[f] || row[f] === ""))
        ) {
          duplicateRows.push({ reason: `Missing ${uniqueFields}`, row });
        } else if (uniqueValues.has(key)) {
          duplicateRows.push({ reason: `Duplicate in file: ${key}`, row });
        } else {
          uniqueValues.add(key);
          filteredRows.push(row);
        }
      }

      if (filteredRows.length === 0) {
        setMessage("No valid rows found in file. All are missing or duplicate.");
        return;
      }
      const uploadFormData = new FormData();
      uploadFormData.append("file", fileFromInput); // correct file object
      uploadFormData.append("table", selectedTable);

      const response = await axios.put(
        "https://first-project-hsch.onrender.com/api/upload-file",
        uploadFormData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data?.inserted > 0) {
        setMessage(
          `${response.data.inserted} rows inserted successfully.` +
            (duplicateRows.length
              ? ` ${duplicateRows.length} duplicate rows were skipped.`
              : "")
        );
      } else {
        setMessage("No rows inserted. All rows might be duplicates.");
      }

      setFormData({});
      fileInputRef.current.value = null;
      return; // Exit after file upload
    } catch (err) {
      setMessage(
        err?.response?.data?.message ||
          "Unexpected error occurred while uploading file."
      );
      return;
    }
  }

  // Manual form entry
  const uniqueKeys = UNIQUE_FIELDS[selectedTable];
  const missingKeys = uniqueKeys.filter((key) => !formData[key]);

  if (missingKeys.length > 0) {
    setMessage(`Please enter: ${missingKeys.join(", ")}`);
    return;
  }

  try {
    const response = await axios.post("https://first-project-hsch.onrender.com/api/add-entry", {
      table: selectedTable,
      data: formData,
    });

    if (response.data.success) {
      setMessage("✅ Entry added successfully!");
      setFormData({});
    } else if (response.data.duplicate) {
      setMessage(`Duplicate entry for ${uniqueKeys.join(", ")}`);
    } else {
      setMessage("❌ Failed to add entry: " + (response.data.message || ""));
    }
  } catch (error) {
    const backendMessage = error.response?.data?.message;

    // Better error feedback
    if (backendMessage && typeof backendMessage === "string") {
      setMessage(`❌ ${backendMessage}`);
    } else if (error.response?.data?.duplicateFields) {
      const duplicateInfo = Object.entries(error.response.data.duplicateFields)
        .map(([field, value]) => `${field}: "${value}"`)
        .join(", ");
      setMessage(`❌ Duplicate entry: ${duplicateInfo}`);
    } else {
      setMessage("❌ Failed to add entry due to server error.");
    }
  }
};

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto" }}>
      <h2>Add Data to Table</h2>

      <label>Choose Table:</label>
      <select value={selectedTable} onChange={handleTableChange}>
        <option value="add_user">User</option>
        <option value="branch">Branch</option>
        <option value="vehicle">Vehicle</option>
        <option value="custodian">Custodian</option>
        <option value="driver">Driver</option>
      </select>

      <div style={{ marginTop: "20px" }}>
        <h4>Manual Entry:</h4>
        {getFieldsForTable().map((field) => (
  <div key={field}>
    <label>{field}:</label>
    {selectedTable === "add_user" && field === "role" ? (
      <select
        name="role"
        value={formData["role"] || ""}
        onChange={handleInputChange}
        style={{ width: "100%", marginBottom: "10px" }}
      >
        <option value="">Select Role</option>
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="user">User</option>
      </select>
    ) : (
      <input
        type="text"
        name={field}
        value={formData[field] || ""}
        onChange={handleInputChange}
        style={{ width: "100%", marginBottom: "10px" }}
      />
    )}
  </div>
))}


        <button onClick={handleSubmit}>Submit</button>
      </div>

      <hr />

      <div>
        <h4>OR Upload Excel File:</h4>
        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} />
        <button onClick={handleSubmit} style={{ marginTop: "10px" }}>
          Upload
        </button>
      </div>

      <p style={{ marginTop: "20px", color: "green" }}>{message}</p>
    </div>
  );
};

export default AddTable;