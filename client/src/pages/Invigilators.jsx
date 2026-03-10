import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, User, Upload, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Invigilators = () => {
    const [invigilators, setInvigilators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newInvigilator, setNewInvigilator] = useState({ name: '', email: '' });
    const [uploadFile, setUploadFile] = useState(null);
    const [selectedInvigilators, setSelectedInvigilators] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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
            toast.success('Invigilator added successfully!');
            setNewInvigilator({ name: '', email: '' });
            fetchInvigilators();
        } catch (error) {
            toast.error('Error adding invigilator: ' + error.message);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return;
        const formData = new FormData();
        formData.append('file', uploadFile);
        try {
            const res = await api.post('/invigilators/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadFile(null);
            fetchInvigilators();
            toast.success(res.data.message);
        } catch (error) {
            console.error("Upload error:", error);
            toast.error('Error uploading file: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedInvigilators.length === 0) return;
        if (!window.confirm(`Delete ${selectedInvigilators.length} invigilators?`)) return;
        try {
            await api.post('/invigilators/delete-bulk', { ids: selectedInvigilators });
            toast.success(`Deleted ${selectedInvigilators.length} invigilators`);
            setSelectedInvigilators([]);
            fetchInvigilators();
        } catch (error) {
            toast.error("Error deleting invigilators");
        }
    };

    const toggleSelect = (id) => {
        if (selectedInvigilators.includes(id)) {
            setSelectedInvigilators(selectedInvigilators.filter(iid => iid !== id));
        } else {
            setSelectedInvigilators([...selectedInvigilators, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedInvigilators.length === (invigilators || []).length && (invigilators || []).length > 0) {
            setSelectedInvigilators([]);
        } else {
            setSelectedInvigilators((invigilators || []).map(i => i.id));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/invigilators/${id}`);
            toast.success('Invigilator deleted');
            fetchInvigilators();
        } catch (error) {
            toast.error('Error deleting: ' + error.message);
        }
    };

    const handleToggleAvailability = async (id, currentStatus) => {
        try {
            await api.put(`/invigilators/${id}/availability`, { isAvailable: !currentStatus });
            toast.success(`Invigilator marked as ${!currentStatus ? 'Available' : 'Unavailable'}`);
            fetchInvigilators();
        } catch (error) {
            toast.error("Error toggling availability");
        }
    };

    const filteredInvigilators = (invigilators || []).filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.email && i.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Invigilator Management</h2>

            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded border border-red-200">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Add Single Invigilator */}
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="mb-4 text-lg font-semibold flex items-center">
                        <Plus className="w-5 h-5 mr-2" />
                        Add Invigilator
                    </h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
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
                        </div>
                        <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 mt-2">Add</button>
                    </form>
                </div>

                {/* Upload CSV */}
                <div className="p-6 bg-white rounded-lg shadow-md flex flex-col justify-between">
                    <div>
                        <h3 className="mb-4 text-lg font-semibold flex items-center"><Upload className="w-5 h-5 mr-2" /> Upload CSV</h3>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="flex justify-between items-center text-sm text-gray-500">
                                <p>CSV Headers: Name, Email</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const csvContent = "Name,Email\nJane Doe,jane@example.com\nJohn Smith,john@example.com";
                                        const blob = new Blob([csvContent], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = "invigilator_template.csv";
                                        a.click();
                                    }}
                                    className="text-blue-600 hover:underline text-xs"
                                >
                                    Download Template
                                </button>
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={e => setUploadFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mt-5"
                            />
                            <button
                                type="submit"
                                disabled={!uploadFile}
                                className="w-full px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-300 mt-3"
                            >
                                Upload
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">Invigilators List ({(invigilators || []).length})</h3>
                        {selectedInvigilators.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete ({selectedInvigilators.length})
                            </button>
                        )}
                    </div>
                    <button onClick={fetchInvigilators} className="text-sm text-blue-600 underline">Refresh</button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b bg-white relative">
                    <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full p-2 pl-10 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {loading && <div className="p-8 text-center text-gray-500">Loading...</div>}

                {!loading && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={(invigilators || []).length > 0 && selectedInvigilators.length === (invigilators || []).length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3 text-center">Available</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredInvigilators.length > 0 ? filteredInvigilators.map(inv => (
                                    <tr key={inv.id} className={`hover:bg-gray-50 ${!inv.isAvailable && 'opacity-60 bg-gray-50'}`}>
                                        <td className="px-6 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedInvigilators.includes(inv.id)}
                                                onChange={() => toggleSelect(inv.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-3 font-medium flex items-center">
                                            <User className="w-4 h-4 mr-2 text-blue-500" />
                                            {inv.name}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">{inv.email || '-'}</td>
                                        <td className="px-6 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleAvailability(inv.id, inv.isAvailable)}
                                                className={inv.isAvailable ? "text-green-600 hover:text-green-700" : "text-gray-500 hover:text-gray-700"}
                                            >
                                                {inv.isAvailable ? <ToggleRight className="w-6 h-6 mx-auto" /> : <ToggleLeft className="w-6 h-6 mx-auto" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No invigilators added.</td>
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
