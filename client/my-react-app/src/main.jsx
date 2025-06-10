// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import ResolverDashboard from './ResolverDashboard';
import ProtectedRoute from './ProtectedRoute';
import './index.css'
import HomePage from './HomePage'
import ReportForm from './ReportForm'
import IncidentDetails from './IncidentDetails'
import ResolvedIncidents from './ResolvedIncidents'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/resolver" element={<ProtectedRoute role="resolver"><ResolverDashboard /></ProtectedRoute>} />
        <Route path="/" element={<HomePage />} />
        <Route path="/report" element={<ReportForm />} />
        <Route path="/incidents/:id" element={<IncidentDetails />} />
        <Route path="/resolved" element={<ResolvedIncidents />} />
      </Routes>
    </Router>
  </React.StrictMode>
)