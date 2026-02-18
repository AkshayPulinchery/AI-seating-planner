import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Lock } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState(''); // For connection status
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const checkConnection = async () => {
        setStatus('Pinging server...');
        try {
            const res = await api.get('/');
            setStatus(`Server is Awake! Response: ${res.data}`);
        } catch (err) {
            setStatus(`Connection Failed: ${err.message}`);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setStatus('Logging in...');

        try {
            console.log("Sending login request to:", api.defaults.baseURL);
            const response = await api.post('/auth/login', { username, password });
            console.log("Login response:", response.data);

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                setStatus('Login Success! Redirecting...');
                setTimeout(() => navigate('/'), 500);
            } else {
                throw new Error("No token received");
            }
        } catch (err) {
            console.error("Login Error:", err);
            const fullUrl = `${api.defaults.baseURL}/auth/login`;
            setError(`Failed accessing ${fullUrl}. Details: ${JSON.stringify(err.message || err)}`);
            setStatus('Login Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="flex flex-col items-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-gray-900">Admin Login</h1>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md break-words">
                        {error}
                    </div>
                )}

                {status && (
                    <div className="p-3 text-sm text-blue-600 bg-blue-50 rounded-md break-words">
                        {status}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Connecting...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 p-4 bg-gray-50 rounded border text-xs font-mono break-all space-y-2">
                    <p className="font-bold">Debugging Info:</p>
                    <p>API URL: {api.defaults.baseURL}</p>
                    <button
                        onClick={checkConnection}
                        type="button"
                        className="mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 w-full"
                    >
                        Test Server Connection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
