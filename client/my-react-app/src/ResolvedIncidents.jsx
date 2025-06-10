import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ResolvedIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResolvedIncidents = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/resolved-incidents');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch resolved incidents');
        }
        const data = await response.json();
        setIncidents(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchResolvedIncidents();
  }, []);

  return (
    <div className="min-h-screen bg-yellow-50 px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-4xl font-bold text-rose-600">Resolved Incidents</h1>
          <Link
            to="/"
            className="bg-sky-500 text-white px-5 py-2 rounded-lg hover:bg-sky-600 transition"
          >
            Back to Active Incidents
          </Link>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center text-gray-500 py-10" role="status" aria-live="polite">
            <div className="animate-spin h-10 w-10 border-4 border-rose-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading resolved reports...</p>
          </div>
        ) : (
          incidents.length === 0 ? (
            <p className="text-center text-gray-500">No resolved incidents found.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition space-y-3 border-l-4 border-green-400"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-green-600">{incident.title}</h3>
                      <p className="text-sm text-sky-600">{incident.location}</p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm select-none">
                      Resolved
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{incident.description}</p>
                  <div className="flex flex-col text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100 space-y-1">
                    <span>
                      <strong>Resolved by:</strong>{' '}
                      <span className="text-green-800 font-medium">{incident.assigned_username || 'Unknown'}</span>
                    </span>
                    <span>
                      <strong>Resolved on:</strong>{' '}
                      {new Date(incident.resolved_at).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span>
                      <strong>Auto-deletes in:</strong>{' '}
                      {Math.max(
                        0,
                        Math.round(24 - (new Date() - new Date(incident.resolved_at)) / (1000 * 60 * 60))
                      )}{' '}
                      hours
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ResolvedIncidents;
