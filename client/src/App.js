import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './Login';
import Register from './Registration';
import HomePage from './HomePage';
import AddTable from './AddTable';
import DeleteEntry from './DeleteEntry';
import KMSForm from './KMSForm';
import ViewTables from './ViewTables';

// ✅ Navigation component with conditional rendering
function Navigation() {
  const location = useLocation();
  const hideNavOnPaths = ["/home", "/add-user","/kms-form", "/view-tables", "/add-table", "/delete-entry"];
  const shouldHideNav = hideNavOnPaths.includes(location.pathname);

  return (
    <nav>
      {!shouldHideNav && (
        <>
          <Link to="/login" style={{ marginRight: "1rem" }}>Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}

// ✅ Wrap Navigation inside a component with access to `useLocation`
function AppRoutes() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/add-table" element={<AddTable />} />
        
        <Route path="/delete-entry" element={<DeleteEntry />} />
        <Route path="/kms-form" element={<KMSForm />} />
        <Route path="/view-tables" element={<ViewTables />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
