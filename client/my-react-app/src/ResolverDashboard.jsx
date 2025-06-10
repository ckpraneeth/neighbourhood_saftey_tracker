import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ResolverDashboard() {
  const [assignedIncidents, setAssignedIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [confirmIncidentId, setConfirmIncidentId] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAssignedIncidents();
  }, [navigate, token]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchAssignedIncidents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/my-assigned-incidents', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setAssignedIncidents(res.data);
    } catch (err) {
      console.error(err);
      showMessage('Failed to fetch incidents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmResolve = (incidentId) => {
    setConfirmIncidentId(incidentId);
  };

  const cancelConfirm = () => {
    setConfirmIncidentId(null);
  };

  const resolveIncident = async () => {
    const incidentId = confirmIncidentId;
    setConfirmIncidentId(null);

    try {
      await axios.patch(
        `http://localhost:5000/api/incidents/${incidentId}/resolve`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      showMessage('Resolved successfully', 'success');
      setAssignedIncidents(prev => prev.filter(i => i.id !== incidentId));
    } catch (error) {
      console.error(error);
      showMessage('Failed to resolve incident', 'error');
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

  return (
    <div className="p-6 bg-amber-50 min-h-screen relative">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-rose-600">Resolver Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadCSV}
              className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 transition cursor-pointer"
              disabled={loading}
            >
              📄 Download Archive CSV
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              className="bg-rose-500 text-white px-4 py-2 rounded hover:bg-rose-600 transition cursor-pointer"
              disabled={loading}
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

        {confirmIncidentId && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-amber-100 border border-amber-300 text-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
              <h2 className="text-xl font-bold text-rose-600">Resolve Incident?</h2>
              <p className="text-sm text-gray-700">
                Are you sure you want to mark this incident as resolved? This helps keep our community safe!
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 transition cursor-pointer"
                  onClick={cancelConfirm}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition cursor-pointer"
                  onClick={resolveIncident}
                >
                  Yes, Resolve
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2" role="status" aria-live="polite">
            <div className="animate-spin h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full"></div>
            <p className="text-amber-700 font-medium">Loading assigned incidents...</p>
          </div>
        ) : assignedIncidents.length === 0 ? (
          <p className="text-gray-600">No assigned incidents</p>
        ) : (
          assignedIncidents.map(incident => (
            <div key={incident.id} className="bg-white border border-amber-200 p-4 rounded-lg shadow space-y-2">
              <h2 className="text-lg font-bold text-rose-700">{incident.title}</h2>
              <p>{incident.description}</p>

              {incident.location && (
                <p>
                  <strong>Location:</strong> {incident.location}{' '}
                  {incident.lat && incident.lng && `(${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)})`}
                </p>
              )}

              {incident.created_at && (
                <p>
                  <strong>Created At:</strong> {new Date(incident.created_at).toLocaleString()}
                </p>
              )}

              <button
                className="bg-sky-600 text-white px-4 py-2 rounded mt-2 hover:bg-sky-700 transition cursor-pointer"
                onClick={() => confirmResolve(incident.id)}
                disabled={loading}
              >
                Resolve
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
