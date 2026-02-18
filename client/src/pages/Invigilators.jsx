import React, { useState, useEffect } from 'react';
import api from '../api';
// Removing icons temporarily to rule out component crashes
// import { Plus, Trash2, User } from 'lucide-react';

const Invigilators = () => {
    const [invigilators, setInvigilators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newInvigilator, setNewInvigilator] = useState({ name: '', email: '' });

    const fetchInvigilators = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Fetching invigilators...");
            const res = await api.get('/invigilators');
            console.log("Response:", res);
            if (Array.isArray(res.data)) {
                setInvigilators(res.data);
            } else {
                setError("Received invalid data format: " + JSON.stringify(res.data));
                setInvigilators([]);
            }
        } catch (error) {
            console.error(error);
            setError("Failed to fetch: " + (error.message || error.toString()));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvigilators();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post('/invigilators', newInvigilator);
            setNewInvigilator({ name: '', email: '' });
            fetchInvigilators();
        } catch (error) {
            alert('Error adding invigilator: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/invigilators/${id}`);
            fetchInvigilators();
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Invigilator Management (Debug Mode)</h2>

            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded border border-red-200">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-4 text-lg font-semibold flex items-center">
                    {/* <Plus className="w-5 h-5 mr-2" /> */}
                    [+] Add Invigilator
                </h3>
                <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            placeholder="Full Name"
                            value={newInvigilator.name}
                            onChange={e => setNewInvigilator({ ...newInvigilator, name: e.target.value })}
                            className="w-full px-3 py-2 mt-1 border rounded"
                            required
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                        <input
                            type="email"
                            placeholder="email@example.com"
                            value={newInvigilator.email}
                            onChange={e => setNewInvigilator({ ...newInvigilator, email: e.target.value })}
                            className="w-full px-3 py-2 mt-1 border rounded"
                        />
                    </div>
                    <button type="submit" className="px-6 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 mb-[1px]">Add</button>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Invigilators List ({(invigilators || []).length})</h3>
                    <button onClick={fetchInvigilators} className="text-sm text-blue-600 underline">Refresh</button>
                </div>

                {loading && <div className="p-8 text-center text-gray-500">Loading...</div>}

                {!loading && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {Array.isArray(invigilators) && invigilators.length > 0 ? invigilators.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium flex items-center">
                                            {/* <User className="w-4 h-4 mr-2 text-blue-500" /> */}
                                            <span className="mr-2 text-blue-500">[User]</span>
                                            {inv.name}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">{inv.email || '-'}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700">
                                                {/* <Trash2 className="w-4 h-4" /> */}
                                                [Delete]
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-gray-500">No invigilators added.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Invigilators;
