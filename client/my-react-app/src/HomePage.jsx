import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const HomePage = () => {
  const [incidents, setIncidents] = useState([])
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('searchTerm') || ''
  })

  useEffect(() => {
    localStorage.setItem('searchTerm', searchTerm)
  }, [searchTerm])

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [viewNearby, setViewNearby] = useState(() => {
    const stored = localStorage.getItem('viewNearby')
    return stored === 'true'
  })

  useEffect(() => {
    localStorage.setItem('viewNearby', viewNearby)
  }, [viewNearby])

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/incidents')
        const data = await response.json()
        setIncidents(data)
        setError('')
      } catch (err) {
        setError(`Failed to load incidents: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationError(null)
      },
      (err) => {
        setLocationError('Unable to retrieve your location')
        console.warn('Location error:', err)
      }
    )
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const distance = (lat1, lng1, lat2, lng2) => {
    const toRad = (v) => (v * Math.PI) / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
  }

  const sortedIncidents = [...incidents].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )

  const filteredIncidents = sortedIncidents.filter((incident) => {
    const searchLower = debouncedSearchTerm.toLowerCase()
    const matchesSearch =
      incident.title.toLowerCase().includes(searchLower) ||
      incident.description.toLowerCase().includes(searchLower) ||
      incident.location.toLowerCase().includes(searchLower)

    if (!viewNearby || !userLocation) return matchesSearch

    const d = distance(
      userLocation.lat,
      userLocation.lng,
      incident.lat,
      incident.lng
    )
    return d <= 10 && matchesSearch
  })

  return (
    <div className="min-h-screen bg-amber-50 px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-4xl font-bold text-rose-600">Neighbourhood Safety Tracker</h1>
          <div className="flex gap-3">
            <Link to="/resolved" className="bg-sky-600 text-white px-5 py-2 rounded-lg hover:bg-sky-700 transition">
              View Resolved
            </Link>
            <Link to="/report" className="bg-rose-600 text-white px-5 py-2 rounded-lg hover:bg-rose-700 transition">
              Report Incident
            </Link>
            <Link to="/login" className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition">
              Login
            </Link>
          </div>
        </div>

        {/* Search and Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={viewNearby}
              onChange={() => setViewNearby(!viewNearby)}
              className="sr-only"
              aria-label="Toggle nearby incidents only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                viewNearby ? 'bg-rose-500' : 'bg-amber-300'
              }`}
            />
            <span
              className={`absolute left-1 top-1 inline-block w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                viewNearby ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
            <span className="ml-3 text-sm font-medium text-gray-700">Nearby only</span>
          </label>

          {locationError && (
            <p className="text-sm text-red-600 mt-2 md:mt-0">{locationError}</p>
          )}

          <div className="relative w-full md:w-1/2">
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 pr-10 border rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-rose-400"
              aria-label="Search incidents"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-3 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Loading and Error */}
        {loading && (
          <div className="text-center text-gray-500 py-10" role="status" aria-live="polite">
            <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading reports...</p>
          </div>
        )}
        {error && (
          <div className="bg-rose-100 text-rose-800 border border-rose-200 p-4 rounded-md" role="alert">
            {error}
          </div>
        )}

        {/* Incident List */}
        {!loading && !error && (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {filteredIncidents.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">No incidents found.</div>
            ) : (
              filteredIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition space-y-2 border-l-4 border-amber-400"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/incidents/${incident.id}`}>
                        <h3 className="text-lg font-semibold text-rose-600 hover:underline">
                          {incident.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-sky-600">{incident.location}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{incident.description}</p>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
