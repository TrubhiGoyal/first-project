import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";

const TABLE_ORDER = [
  { name: "kms_report", label: "KMS Form" },
  { name: "activity_report", label: "Activity Form" },
  { name: "branch", label: "Branch" },
  { name: "vehicle", label: "Vehicle" },
  { name: "custodian", label: "Custodian" },
  { name: "driver", label: "Driver" },
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
  branch: ["_id", "branch_name", "sol_id", "city", "circle", "bank_name"],
  vehicle: ["_id", "name"],
  custodian: ["_id", "name"],
  driver: ["_id", "name"],
  user: ["_id", "name", "email", "role"],
  activity_report: []
};
// Helper function to safely format "dd-mm-yyyy" date strings
const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return "";
  const [day, month, year] = dateStr.split("-");
  if (!day || !month || !year) return "";
  return `${day}-${month}-${year}`;
};

const ViewTables = () => {
  const [activeTable, setActiveTable] = useState("kms_report");
  const [tableData, setTableData] = useState([]);

  const fetchTableData = async (tableName) => {
    try {
      const res = await axios.get(`http://localhost:8888/api/tables/${tableName}`);
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

  
   
  const formatCell = (key, value) => {
  if (key === "data_entry_date" || key === "activity_date") {
    return formatDate(value);
  }
  return value;
};


  const exportToExcel = () => {
    if (!Array.isArray(tableData) || tableData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const fieldOrder = FIELD_ORDER[activeTable] || Object.keys(tableData[0]);

    const cleanedData = tableData.map((row) => {
      const cleanedRow = {};
      fieldOrder.forEach((key) => {
        cleanedRow[key] = row[key] ?? "";
      });
      return cleanedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTable);

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    FileSaver.saveAs(blob, `${activeTable}.xlsx`);
  };

  const renderTableHeader = () => {
    const fieldOrder = FIELD_ORDER[activeTable] || Object.keys(tableData[0] || {});

  return (
    <thead>
      <tr>
        <th>S. No.</th>
        {fieldOrder
          .filter((key) => key !== "_id") // Hide MongoDB _id field
          .map((key, index) => (
            <th key={index}>{formatHeader(key)}</th>
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

  const fieldOrder = FIELD_ORDER[activeTable] || Object.keys(tableData[0]);

  return (
    <tbody>
      {tableData.map((row, idx) => (
        <tr key={idx}>
          <td>{idx + 1}</td> {/* Serial Number */}
          {fieldOrder
            .filter((key) => key !== "_id")
            .map((key, index) => (
              <td key={index}>{formatCell(key, row[key])}</td>
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
