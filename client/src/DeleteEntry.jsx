// src/components/DeleteEntries.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const DeleteEntries = ({ userRole }) => {
  const [selectedTable, setSelectedTable] = useState("vehicle");
  const [entries, setEntries] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const TABLE_OPTIONS = ["user", "vehicle", "custodian", "driver", "branch"];

  useEffect(() => {
    fetchData();
  }, [selectedTable , fetchData]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`https://first-project-hsch.onrender.com/api/tables/${selectedTable}`);
      setEntries(res.data || []);
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setEntries([]);
    }
  };

  const handleCheckboxChange = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return alert("Select at least one entry to delete.");

    try {
      await axios.post(`https://first-project-hsch.onrender.com/api/delete`, {
        table: selectedTable,
        ids: selectedIds,
      });
      alert("Entries deleted successfully.");
      fetchData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSingleDelete = async (id) => {
    try {
      await axios.post(`https://first-project-hsch.onrender.com/api/delete`, {
        table: selectedTable,
        ids: [id],
      });
      alert("Entry deleted.");
      fetchData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (!["admin", "manager"].includes(userRole?.toLowerCase())) {
    return <div className="p-4 text-red-600 font-semibold">Access Denied</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Delete Entries</h2>

      <div>
        <label className="mr-2 font-medium">Select Table:</label>
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="p-2 border rounded"
        >
          {TABLE_OPTIONS.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleBulkDelete}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Delete Selected
      </button>

      <table className="min-w-full mt-4 border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border"><input type="checkbox" disabled /></th>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center p-4 text-gray-500">
                No records found
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry._id}>
                <td className="p-2 border text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(entry._id)}
                    onChange={() => handleCheckboxChange(entry._id)}
                  />
                </td>
                <td className="p-2 border">{entry._id}</td>
                <td className="p-2 border">{entry.name || entry.email || entry.id || "-"}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => handleSingleDelete(entry._id)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeleteEntries;
