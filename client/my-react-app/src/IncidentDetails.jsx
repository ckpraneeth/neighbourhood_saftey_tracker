import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/incidents/${id}`);
        if (!response.ok) throw new Error('Failed to fetch incident');
        const data = await response.json();
        setIncident(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchIncident();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent mx-auto"></div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center px-4">
        <div className="bg-red-100 text-red-700 border border-red-200 p-4 rounded-md text-lg max-w-md text-center">
          {error}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-yellow-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="bg-sky-500 text-white px-5 py-2 rounded-lg hover:bg-sky-600 transition-colors shadow cursor-pointer"
        >
          ← Back to Incidents
        </button>

        <div className="bg-white shadow-lg rounded-xl p-8 border-l-4 border-rose-400">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-rose-600 mb-2">{incident.title}</h1>
              <p className="text-gray-600 text-sm">
                Reported on{' '}
                {new Date(incident.created_at).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6 text-gray-700">
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Location</h3>
                <p>{incident.location}</p>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Description</h3>
                <p className="whitespace-pre-wrap leading-relaxed">{incident.description}</p>
              </section>

            </div>

            {isLoaded && (
              <div className="h-96 rounded-xl overflow-hidden shadow-lg border border-gray-200">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: incident.lat, lng: incident.lng }}
                  zoom={14}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                >
                  <Marker
                    position={{ lat: incident.lat, lng: incident.lng }}
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                      scaledSize: new window.google.maps.Size(40, 40),
                    }}
                  />
                </GoogleMap>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
