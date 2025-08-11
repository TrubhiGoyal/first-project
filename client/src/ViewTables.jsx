import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";

const TABLE_ORDER = [
  { name: "kms_report", label: "KMS Form" },
  { name: "activity_report", label: "Activity Form" },
  { name: "client", label: "Client" },
  { name: "circle", label: "Circle" },
  { name: "cluster", label: "Cluster" },
  { name: "branch", label: "Branch" },
  { name: "custodian", label: "Custodian" },
  { name: "driver", label: "Driver" },
  { name: "vehicle", label: "Vehicle" },
  { name: "user", label: "User" },
];

const FIELD_ORDER = {
  kms_report: [
    "_id", "data_entry_date", "vehicle_id", "activity_date", "trip_id",
    "custodian_name", "driver_name", "branch_name", "sol_id", "cluster",
    "circle", "client", "trip_retrieval_count", "trip_fresh_pickup_count",
    "trip_return_retrieval_count", "trip_empty_boxes_delivered_count",
    "trip_opening_kms", "trip_closing_kms", "trip_kms", "remarks",
    "trip_branch_count", "branch_kms", "transaction_id"
  ],

  circle: ["_id", "name", "client"],
  cluster: ["_id", "name", "circle", "client"],
  client: ["_id", "name"],
  branch: ["_id", "sol_id", "branch_name", "cluster", "circle", "bank_name"],
  vehicle: ["_id", "name"],
  custodian: ["_id", "name"],
  driver: ["_id", "name"],
  user: ["_id", "name", "email", "role"],
  activity_report: [],
};

// Format date as dd-mm-yyyy with leading zeros
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const ViewTables = () => {
  const [activeTable, setActiveTable] = useState("kms_report");
  const [tableData, setTableData] = useState([]);

  const fetchTableData = async (tableName) => {
    try {
      const res = await axios.get(`https://first-project-hsch.onrender.com/api/tables/${tableName}`);
      if (Array.isArray(res.data)) {
        setTableData(res.data);
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error("Error fetching table:", err);
      setTableData([]);
    }
  };

  useEffect(() => {
    fetchTableData(activeTable);
  }, [activeTable]);

  const formatHeader = (key) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const formatCell = (key, value, row) => {
    if (key === "data_entry_date" || key === "activity_date") {
      return formatDate(value);
    }

    if (key === "client") {
      // For circle: client is direct object
      // For cluster: client comes from row.circle.client
      if (activeTable === "circle" && value && typeof value === "object") {
        return value.name || "";
      }
      if (activeTable === "cluster") {
        if (row.circle && row.circle.client && typeof row.circle.client === "object") {
          return row.circle.client.name || "";
        }
        return "";
      }
      // fallback if value is string or something else
      if (typeof value === "string") return value;
      return "";
    }

    if (key === "circle") {
      // circle is object in cluster and circle table
      if (value && typeof value === "object") {
        return value.name || "";
      }
      return value || "";
    }

    if (key === "cluster") {
      // cluster might be object or string (branch table)
      if (value && typeof value === "object") {
        // try name or city fallback
        return value.name || value.city || "";
      }
      return value || "";
    }

    return value;
  };

  const exportToExcel = () => {
    if (!Array.isArray(tableData) || tableData.length === 0) {
      alert("No data available to export.");
      return;
    }

    let fieldOrder = FIELD_ORDER[activeTable] || Object.keys(tableData[0]);
    fieldOrder = fieldOrder.filter((key) => key !== "_id"); // always remove _id

    const cleanedData = tableData.map((row, index) => {
      const cleanedRow = { "S. No.": index + 1 };

      if (activeTable === "branch") {
        cleanedRow["sol_id"] = row.sol_id ?? "";
        cleanedRow["branch_name"] = row.branch_name ?? "";
        cleanedRow["Cluster"] = row.city ?? "";
        cleanedRow["circle"] = row.circle ?? "";
        cleanedRow["bank_name"] = row.bank_name ?? "";
      } else {
        fieldOrder.forEach((key) => {
          if (key === "client") {
            cleanedRow["client"] = formatCell("client", row[key], row);
          } else if (key === "circle") {
            cleanedRow["circle"] = formatCell("circle", row[key], row);
          } else if (key === "cluster") {
            cleanedRow["cluster"] = formatCell("cluster", row[key], row);
          } else if (key === "data_entry_date" || key === "activity_date") {
            cleanedRow[key] = formatDate(row[key]);
          } else {
            cleanedRow[key] = row[key] ?? "";
          }
        });
      }

      return cleanedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTable);

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    FileSaver.saveAs(blob, `${activeTable}.xlsx`);
  };

  const renderTableHeader = () => {
    let fieldOrder = FIELD_ORDER[activeTable] || Object.keys(tableData[0] || {});

    if (activeTable === "branch") {
      fieldOrder = fieldOrder.filter((key) => key !== "_id");
      const solIndex = fieldOrder.indexOf("sol_id");
      const branchIndex = fieldOrder.indexOf("branch_name");
      if (solIndex > -1 && branchIndex > -1 && solIndex > branchIndex) {
        fieldOrder.splice(solIndex, 1);
        fieldOrder.splice(branchIndex, 0, "sol_id");
      }
    } else {
      fieldOrder = fieldOrder.filter((key) => key !== "_id");
    }

    return (
      <thead>
        <tr>
          <th>S. No.</th>
          {fieldOrder.map((key, index) => (
            <th key={index}>
              {activeTable === "branch" && key === "cluster"
                ? "Cluster"
                : formatHeader(key)}
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  const renderTableRows = () => {
    if (!tableData.length) {
      return (
        <tbody>
          <tr>
            <td colSpan="100%">No records found</td>
          </tr>
        </tbody>
      );
    }

    let fieldOrder = FIELD_ORDER[activeTable] || Object.keys(tableData[0]);

    if (activeTable === "branch") {
      fieldOrder = fieldOrder.filter((key) => key !== "_id");
      const solIndex = fieldOrder.indexOf("sol_id");
      const branchIndex = fieldOrder.indexOf("branch_name");
      if (solIndex > -1 && branchIndex > -1 && solIndex > branchIndex) {
        fieldOrder.splice(solIndex, 1);
        fieldOrder.splice(branchIndex, 0, "sol_id");
      }
    } else {
      fieldOrder = fieldOrder.filter((key) => key !== "_id");
    }

    const narrowTables = ["custodian", "driver", "vehicle"];

    return (
      <tbody>
        {tableData.map((row, idx) => (
          <tr key={idx}>
            <td style={{ width: "50px", textAlign: "center" }}>{idx + 1}</td>
            {fieldOrder.map((key, index) => (
              <td
                key={index}
                style={
                  narrowTables.includes(activeTable)
                    ? { width: "150px", textAlign: "center" }
                    : {}
                }
              >
                {formatCell(key, row[key], row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "15px" }}>
        {TABLE_ORDER.map((table) => (
          <button
            key={table.name}
            onClick={() => setActiveTable(table.name)}
            style={{
              marginRight: "8px",
              padding: "8px 16px",
              backgroundColor: activeTable === table.name ? "#007bff" : "#e0e0e0",
              color: activeTable === table.name ? "white" : "black",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {table.label}
          </button>
        ))}
      </div>

      <button
        onClick={exportToExcel}
        style={{
          marginBottom: "15px",
          padding: "8px 16px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Export to Excel
      </button>

      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="8"
          cellSpacing="0"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          {renderTableHeader()}
          {renderTableRows()}
        </table>
      </div>
    </div>
  );
};

export default ViewTables;
