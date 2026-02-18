import React, { useState } from 'react';
import api from '../api';
import { KeyRound } from 'lucide-react';

const ChangePassword = () => {
    const [formData, setFormData] = useState({
        username: 'admin', // Hardcoded for MVP as we have single admin
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New passwords don't match");
            return;
        }

        try {
            const res = await api.post('/auth/change-password', {
                username: formData.username,
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword
            });
            setMessage(res.data.message);
            setFormData({ ...formData, oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update password');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <KeyRound className="w-6 h-6 mr-2 text-blue-600" />
                Change Password
            </h2>

            {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                        type="password"
                        value={formData.oldPassword}
                        onChange={e => setFormData({ ...formData, oldPassword: e.target.value })}
                        className="w-full px-3 py-2 mt-1 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                        type="password"
                        value={formData.newPassword}
                        onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 mt-1 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 mt-1 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                    Update Password
                </button>
            </form>
        </div>
    );
};

export default ChangePassword;
