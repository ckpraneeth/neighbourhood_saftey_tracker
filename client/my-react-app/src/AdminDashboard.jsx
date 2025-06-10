import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [resolvedIncidents, setResolvedIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmIncidentId, setConfirmIncidentId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  useEffect(() => {
    if (!token) return navigate('/login');
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incidentRes, userRes, resolvedRes] = await Promise.all([
        axios.get('http://localhost:5000/api/incidents', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/resolved-incidents', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setIncidents(incidentRes.data);
      setUsers(userRes.data);
      setResolvedIncidents(resolvedRes.data);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/incident-archive', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = new Blob([res.data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'incident_archive.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showMessage("CSV downloaded successfully", "success");
    } catch (err) {
      if (err.response && err.response.status === 404) {
        showMessage("No archive found. Try resolving an incident first.", "error");
      } else {
        console.error(err);
        showMessage("Download failed", "error");
      }
    }
  };

  const assignIncident = async (incidentId, username) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/incidents/${incidentId}/assign`,
        { username: username === "unassign" ? null : username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msg = username === "unassign"
        ? "Permission removed successfully"
        : `Assigned to ${username}`;
      showMessage(msg, "success");
      fetchData();
    } catch (err) {
      showMessage("Assignment failed", "error");
    }
  };

  const triggerResolve = (incidentId) => setConfirmIncidentId(incidentId);
  const cancelResolve = () => setConfirmIncidentId(null);

  const confirmResolve = async () => {
    try {
      await axios.patch(`http://localhost:5000/api/incidents/${confirmIncidentId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage("Resolved successfully", "success");
      setConfirmIncidentId(null);
      fetchData();
    } catch (err) {
      showMessage("Resolution failed", "error");
    }
  };

  const getAssignedUsername = (incident) => {
    if (!incident.assigned_to) return "None";
    const user = users.find(u => u.username === incident.assigned_to);
    return user ? user.username : "Unknown";
  };

  const filteredIncidents = incidents
    .filter(i => (!showUnassignedOnly || !i.assigned_to))
    .filter(i =>
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="p-6 bg-amber-50 min-h-screen relative">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-rose-600">Admin Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadCSV}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded cursor-pointer"
            >
              📄 Download Archive CSV
            </button>
            <button
              onClick={handleLogout}
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300
              ${messageType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          >
            {message}
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="flex flex-col items-center justify-center space-y-2 py-10">
            <div className="animate-spin h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full"></div>
            <p className="text-amber-700 font-semibold">Loading data...</p>
          </div>
        )}

        {!loading && (
          <>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search incidents..."
                className="p-2 border border-amber-300 rounded w-1/2 focus:ring-rose-400 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showUnassignedOnly}
                  onChange={() => setShowUnassignedOnly(!showUnassignedOnly)}
                  className="accent-rose-500"
                />
                Show only unassigned
              </label>
            </div>

            <h2 className="text-xl font-semibold text-sky-700">Ongoing Incidents</h2>
            {filteredIncidents.length === 0 ? (
              <p className="text-gray-500">No matching incidents</p>
            ) : (
              filteredIncidents.map(incident => (
                <div key={incident.id} className="bg-white border border-amber-200 p-4 rounded-lg shadow space-y-2">
                  <h3 className="text-lg font-bold text-rose-600">{incident.title}</h3>
                  <p>{incident.description}</p>
                  <p><strong>Location:</strong> {incident.location} ({incident.lat.toFixed(4)}, {incident.lng.toFixed(4)})</p>
                  <p><strong>Created At:</strong> {new Date(incident.created_at).toLocaleString()}</p>
                  <p><strong>Assigned to:</strong> {getAssignedUsername(incident)}</p>

                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <select
                      onChange={e => assignIncident(incident.id, e.target.value)}
                      defaultValue=""
                      className="border border-amber-300 p-2 rounded text-sm"
                    >
                      <option value="" disabled>Select Resolver</option>
                      <option value="unassign">None</option>
                      {users.filter(u => u.role === "resolver").map(user => (
                        <option key={user.username} value={user.username}>{user.username}</option>
                      ))}
                    </select>

                    {!incident.resolved && (
                      <button
                        onClick={() => triggerResolve(incident.id)}
                        className="bg-sky-600 text-white px-3 py-1 rounded hover:bg-sky-700 transition cursor-pointer"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {confirmIncidentId && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-amber-100 border border-amber-300 text-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold text-rose-600">Confirm Resolution</h2>
            <p className="text-sm text-gray-700">Are you sure you want to mark this incident as resolved?</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                className="px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 transition cursor-pointer"
                onClick={cancelResolve}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition cursor-pointer"
                onClick={confirmResolve}
              >
                Yes, Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
