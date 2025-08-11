import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const AddTable = () => {
  const [selectedTable, setSelectedTable] = useState("branch");
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  // Dropdown data for cascading selects
  const [clients, setClients] = useState([]);
  const [circles, setCircles] = useState([]);
  const [clusters, setClusters] = useState([]);

  // Fetch clients initially (for branch, circle tables)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientRes = await axios.get("http://localhost:8888/api/tables/client");
        setClients(clientRes.data || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  // Fetch circles when client changes (for branch and circle tables)
  useEffect(() => {
    const fetchCircles = async () => {
      if (!formData.client) {
        setCircles([]);
        setFormData((prev) => ({ ...prev, circle: "" }));
        return;
      }
      try {
        const circleRes = await axios.get(
          `http://localhost:8888/api/tables/circle?clientId=${formData.client}`
        );
        setCircles(circleRes.data || []);
        setFormData((prev) => ({ ...prev, circle: "" }));
      } catch (error) {
        console.error("Error fetching circles:", error);
      }
    };

    if (selectedTable === "branch" || selectedTable === "circle") {
      fetchCircles();
    }
  }, [formData.client, selectedTable]);

  // Fetch clusters when circle changes (for branch and cluster tables)
  useEffect(() => {
    const fetchClusters = async () => {
      if (!formData.circle) {
        setClusters([]);
        setFormData((prev) => ({ ...prev, cluster: "" }));
        return;
      }
      try {
        const clusterRes = await axios.get(
          `http://localhost:8888/api/tables/cluster?circleId=${formData.circle}`
        );
        setClusters(clusterRes.data || []);
        setFormData((prev) => ({ ...prev, cluster: "" }));
      } catch (error) {
        console.error("Error fetching clusters:", error);
      }
    };

    if (selectedTable === "branch" || selectedTable === "cluster") {
      fetchClusters();
    }
  }, [formData.circle, selectedTable]);

  const UNIQUE_FIELDS = {
    user: "email",
    branch: "sol_id",
    vehicle: "name",
    custodian: "name",
    driver: "name",
    cluster: "name",
    circle: "name",
    client: "name",
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTableChange = (e) => {
    setSelectedTable(e.target.value);
    setFormData({});
    setMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    // Reset dropdown data when switching tables
    if (e.target.value !== "branch" && e.target.value !== "circle" && e.target.value !== "cluster") {
      setClients([]);
      setCircles([]);
      setClusters([]);
    } else {
      // Reload clients when switching back to branch or circle or cluster
      axios.get("http://localhost:8888/api/tables/client").then((res) => {
        setClients(res.data || []);
      });
    }
  };

  const getFieldsForTable = () => {
    switch (selectedTable) {
      case "user":
        return ["name", "email", "password", "confirm_password", "role"];
      case "branch":
        return ["sol_id", "branch_name", "client", "circle", "cluster"];
      case "circle":
        return ["name", "client"];
      case "cluster":
        return ["name", "circle"];
      case "vehicle":
      case "custodian":
      case "driver":
      case "client":
        return ["name"];
      default:
        return [];
    }
  };

  // File reading helper
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
    try {
      setMessage("");

      const fileFromInput = fileInputRef.current?.files?.[0];

      if (fileFromInput) {
        // File upload logic
        let data;
        try {
          data = await readFileAsArrayBuffer(fileFromInput);
        } catch (e) {
          console.error("File reading error:", e);
          setMessage("File could not be read. Please reselect the file.");
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const uniqueField = UNIQUE_FIELDS[selectedTable];
        const uniqueValues = new Set();
        const filteredRows = [];
        const duplicateRows = [];

        for (const row of json) {
          const key = row[uniqueField];
          if (key == null || key === "") {
            duplicateRows.push({ reason: `Missing ${uniqueField}`, row });
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

        const formDataFile = new FormData();
        formDataFile.append("file", fileFromInput);
        formDataFile.append("table", selectedTable);

        const response = await axios.post(
          "http://localhost:8888/api/upload-file",
          formDataFile,
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

        return;
      }

      // Manual form entry validation
      const uniqueKey = UNIQUE_FIELDS[selectedTable];

      if (!formData[uniqueKey]) {
        setMessage(`Please enter ${uniqueKey}`);
        return;
      }

      if (selectedTable === "user") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email || !emailRegex.test(formData.email)) {
          setMessage("Please enter a valid email address.");
          return;
        }
        if (!formData.password || !formData.confirm_password) {
          setMessage("Please enter password and confirm password.");
          return;
        }
        if (formData.password !== formData.confirm_password) {
          setMessage("Password and confirm password do not match.");
          return;
        }
        if (!formData.role) {
          setMessage("Please select a role.");
          return;
        }
      }

      if (selectedTable === "branch") {
        if (!formData.client) {
          setMessage("Please select Client");
          return;
        }
        if (!formData.circle) {
          setMessage("Please select Circle");
          return;
        }
        if (!formData.cluster) {
          setMessage("Please select Cluster");
          return;
        }
      }

      if (selectedTable === "circle") {
        if (!formData.client) {
          setMessage("Please select Client");
          return;
        }
      }

      if (selectedTable === "cluster") {
        if (!formData.circle) {
          setMessage("Please select Circle");
          return;
        }
      }

      // Prepare data to send
      let dataToSend = { ...formData };

      if (selectedTable === "branch") {
        dataToSend = {
          sol_id: formData.sol_id?.trim(),
          branch_name: formData.branch_name?.trim(),
          client: formData.client,
          circle: formData.circle,
          cluster: formData.cluster,
        };
      } else if (selectedTable === "circle") {
        dataToSend = {
          name: formData.name?.trim(),
          client: formData.client,
        };
      } else if (selectedTable === "cluster") {
        dataToSend = {
          name: formData.name?.trim(),
          circle: formData.circle,
        };
      } else if (selectedTable === "user") {
        dataToSend = { ...formData };
        delete dataToSend.confirm_password;
      }

      const response = await axios.post("http://localhost:8888/api/add-entry", {
        table: selectedTable,
        data: dataToSend,
      });

      if (response.data.success) {
        setMessage("Entry added successfully.");
        setFormData({});
        if (fileInputRef.current) {
          fileInputRef.current.value = null;
        }
      } else if (response.data.duplicate) {
        setMessage(`Duplicate entry for ${uniqueKey}: ${formData[uniqueKey]}`);
      } else {
        setMessage("Failed to add entry.");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      setMessage(
        err?.response?.data?.message ||
          "Unexpected error occurred while submitting."
      );
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto" }}>
      <h2>Add Data to Table</h2>

      <label>
        Choose Table:
        <select
          value={selectedTable}
          onChange={handleTableChange}
          style={{ marginLeft: 10 }}
        >
          <option value="user">User</option>
          <option value="branch">Branch</option>
          <option value="vehicle">Vehicle</option>
          <option value="custodian">Custodian</option>
          <option value="driver">Driver</option>
          <option value="cluster">Cluster</option>
          <option value="circle">Circle</option>
          <option value="client">Client</option>
        </select>
      </label>

      <div style={{ marginTop: "20px" }}>
        <h4>Manual Entry:</h4>

        {getFieldsForTable().map((field) => {
          // User special cases
          if (selectedTable === "user") {
            if (field === "role") {
              return (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field}:</label>
                  <select
                    name="role"
                    value={formData.role || ""}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: 6 }}
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                  </select>
                </div>
              );
            } else if (field === "password" || field === "confirm_password") {
              return (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field.replace("_", " ")}:</label>
                  <input
                    type="password"
                    name={field}
                    value={formData[field] || ""}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: 6 }}
                    autoComplete="new-password"
                  />
                </div>
              );
            } else {
              return (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field}:</label>
                  <input
                    type="text"
                    name={field}
                    value={formData[field] || ""}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: 6 }}
                  />
                </div>
              );
            }
          }

          // Branch special handling
          if (selectedTable === "branch") {
            if (field === "client") {
              return (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field}:</label>
                  <select
                    name="client"
                    value={formData.client || ""}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: 6 }}
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            } else if (field === "circle") {
              return (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field}:</label>
                  <select
                    name="circle"
                    value={formData.circle || ""}
                    onChange={handleInputChange}
                    disabled={!formData.client}
                    style={{ width: "100%", padding: 6 }}
                  >
                    <option value="">Select Circle</option>
                    {circles.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            } else if (field === "cluster") {
              return (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field}:</label>
                  <select
                    name="cluster"
                    value={formData.cluster || ""}
                    onChange={handleInputChange}
                    disabled={!formData.circle}
                    style={{ width: "100%", padding: 6 }}
                  >
                    <option value="">Select Cluster</option>
                    {clusters.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            } else {
              // sol_id, branch_name inputs
              return (
                <div key={field} style={{ marginBottom: "10px" }}>
                  <label>{field}:</label>
                  <input
                    type="text"
                    name={field}
                    value={formData[field] || ""}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: 6 }}
                  />
                </div>
              );
            }
          }

          // Circle table with client dropdown
          if (selectedTable === "circle" && field === "client") {
            return (
              <div key={field} style={{ marginBottom: "10px" }}>
                <label>{field}:</label>
                <select
                  name="client"
                  value={formData.client || ""}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: 6 }}
                >
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          // Cluster table with circle dropdown
          if (selectedTable === "cluster" && field === "circle") {
            return (
              <div key={field} style={{ marginBottom: "10px" }}>
                <label>{field}:</label>
                <select
                  name="circle"
                  value={formData.circle || ""}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: 6 }}
                >
                  <option value="">Select Circle</option>
                  {circles.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          // Default text input for other tables
          return (
            <div key={field} style={{ marginBottom: "10px" }}>
              <label>{field}:</label>
              <input
                type="text"
                name={field}
                value={formData[field] || ""}
                onChange={handleInputChange}
                style={{ width: "100%", padding: 6 }}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        style={{
          marginTop: "10px",
          padding: "10px 16px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Submit
      </button>

      <hr style={{ margin: "20px 0" }} />

      <div>
        <h4>OR Upload Excel File:</h4>
        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} />
        <button
          onClick={handleSubmit}
          style={{
            marginTop: "10px",
            padding: "10px 16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Upload
        </button>
      </div>

      {message && (
        <p
          style={{
            marginTop: "20px",
            color:
              message.startsWith("Failed") || message.startsWith("Please")
                ? "red"
                : "green",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default AddTable;
