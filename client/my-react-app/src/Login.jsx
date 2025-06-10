import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [alert, setAlert] = useState({ message: '', type: '', visible: false });
  const navigate = useNavigate();

  const showAlert = (message, type = 'error') => {
    setAlert({ message, type, visible: true });
    setTimeout(() => {
      setAlert({ ...alert, visible: false });
    }, 3000);
  };

const handleLogin = async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/login', form, {
      withCredentials: true
    });
    localStorage.setItem('token', res.data.token);
    const decoded = JSON.parse(atob(res.data.token.split('.')[1]));
    if (decoded.role === 'admin') window.location.href = '/admin';
    else if (decoded.role === 'resolver') window.location.href = '/resolver';
    else window.location.href = '/';
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      showAlert('Incorrect username or password', 'error');
    } else {
      showAlert(error.response?.data?.message || error.message, 'error');
    }
  }
};


  const handleLogout = () => {
    localStorage.removeItem('token');
    showAlert('Logged out successfully', 'success');
    navigate('/');
  };

  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4 relative">
      {isLoggedIn && (
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 transition cursor-pointer"
        >
          Logout
        </button>
      )}

      {alert.visible && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
            alert.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {alert.message}
        </div>
      )}

      <div className="bg-white shadow-2xl rounded-xl p-8 w-full max-w-md space-y-6 border-t-4 border-rose-400">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-rose-600">Admin / Resolver Login</h1>
          <p className="text-sm text-gray-500">Log in to manage reports and assignments</p>
        </div>

        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full p-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full p-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-rose-500 text-white py-3 rounded-lg font-semibold hover:bg-rose-600 transition cursor-pointer"
        >
          Log In
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full border border-gray-300 py-2 rounded-lg text-gray-700 hover:bg-amber-100 transition cursor-pointer"
        >
          ← Back to Home
        </button>

        <p className="text-xs text-center text-gray-400">
          For authorized users only. Public users can report or view incidents freely.
        </p>
      </div>
    </div>
  );
}
