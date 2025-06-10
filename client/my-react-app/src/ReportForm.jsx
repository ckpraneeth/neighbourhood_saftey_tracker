import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const ReportForm = () => {
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    location: '',
    lat: 0,
    lng: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    //libraries: ['places']
  });

  const handleMapClick = useCallback(async (e) => {
    try {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      // Reverse geocode clicked location
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      let address = '';
      if (data.status === 'OK' && data.results[0]) {
        address = data.results[0].formatted_address;
      } else {
        address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      setFormData(prev => ({
        ...prev,
        location: address,
        lat,
        lng
      }));

    } catch (err) {
      setError('Failed to get address for selected location');
    }
  }, []);

  const handleMapLoad = useCallback((map) => {
    setMapRef(map);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGeolocation = () => {
    setGettingLocation(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude: lat, longitude: lng } = position.coords;
          
          // Reverse geocode to get address
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          
          if (data.status === 'OK' && data.results[0]) {
            setFormData(prev => ({
              ...prev,
              location: data.results[0].formatted_address,
              lat,
              lng
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              lat,
              lng
            }));
          }
        } catch (err) {
          setError('Failed to get address from coordinates');
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        setError('Unable to retrieve your location');
        setGettingLocation(false);
      }
    );
  };

  const geocodeLocation = async (location) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results[0]) {
        throw new Error('Could not find location. Please try a more specific address.');
      }
      
      const { lat, lng } = data.results[0].geometry.location;
      setFormData(prev => ({ ...prev, lat, lng }));
      return { lat, lng };
    } catch (err) {
      throw new Error('Geocoding failed: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSubmissionStatus(null);

    try {
      const { lat, lng } = await geocodeLocation(formData.location);
      
      const response = await fetch('http://localhost:5000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          lat,
          lng
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit incident');
      }

      setFormData(prev => ({
        title: '', 
        description: '', 
        location: '',
        lat: prev.lat,
        lng: prev.lng
      }));

      setSubmissionStatus('success');
    } catch (err) {
      setError(err.message);
      setSubmissionStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 px-4 py-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-rose-600 drop-shadow-sm">Report Incident</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2 rounded-lg shadow transition font-semibold cursor-pointer"
          >
            Back to Incidents
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-xl shadow-lg border border-rose-300 space-y-8"
        >
          <div className="grid md:grid-cols-2 gap-6">
            <input
              name="title"
              placeholder="Incident Title"
              value={formData.title}
              onChange={handleChange}
              required
              className="border border-rose-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder:text-sm"
            />
            <div className="relative">
              <input
                name="location"
                placeholder="Location"
                value={formData.location}
                onChange={handleChange}
                required
                className="border border-rose-300 p-3 rounded-lg w-full pr-40 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder:text-sm"
              />
              <button
                type="button"
                onClick={handleGeolocation}
                disabled={gettingLocation}
                className={`absolute right-2 top-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition duration-200 cursor-pointer ${
                  gettingLocation
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {gettingLocation ? 'Detecting...' : 'Use Current Location'}
              </button>
            </div>
            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              required
              className="border border-rose-300 p-3 rounded-lg md:col-span-2 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder:text-sm"
              rows={5}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submission Success */}
          {submissionStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                Incident reported successfully!
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="ml-4 bg-green-100 text-green-700 px-4 py-1.5 rounded-lg hover:bg-green-200 transition font-medium cursor-pointer"
              >
                View All Incidents
              </button>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-start">
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-3 rounded-lg font-semibold transition shadow cursor-pointer ${
                submitting
                  ? 'bg-rose-300 text-white opacity-70 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {submitting ? 'Submitting...' : 'Report Incident'}
            </button>
          </div>
        </form>

        {/* Google Map */}
        {isLoaded && (
          <div className="rounded-xl overflow-hidden shadow-lg border border-rose-300 mt-10">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '400px' }}
              center={
                formData.lat !== 0
                  ? { lat: formData.lat, lng: formData.lng }
                  : { lat: 15.335, lng: 76.462 }
              }
              zoom={formData.lat !== 0 ? 14 : 7}
              onClick={handleMapClick}
              onLoad={handleMapLoad}
            >
              {formData.lat !== 0 && (
                <Marker
                  position={{ lat: formData.lat, lng: formData.lng }}
                  draggable={true}
                  onDragEnd={async (e) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    setFormData((prev) => ({ ...prev, lat, lng }));
                  }}
                />
              )}
            </GoogleMap>
            <div className="bg-rose-100 text-rose-700 text-center text-sm font-medium py-2">
              {formData.lat !== 0
                ? 'Click anywhere on the map to change location'
                : 'Click on the map to select location'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportForm;
