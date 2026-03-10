import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, LayoutGrid, Upload, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Classrooms = () => {
    const [classrooms, setClassrooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [newRoom, setNewRoom] = useState({ roomName: '', benchCount: '' });
    const [uploadFile, setUploadFile] = useState(null);

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/classrooms');
            setClassrooms(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const handleAddRoom = async (e) => {
        e.preventDefault();
        try {
            await api.post('/classrooms', newRoom);
            toast.success('Classroom added successfully!');
            setNewRoom({ roomName: '', benchCount: '' });
            fetchClassrooms();
        } catch (error) {
            toast.error('Error adding classroom');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return;
        const formData = new FormData();
        formData.append('file', uploadFile);
        try {
            const res = await api.post('/classrooms/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadFile(null);
            fetchClassrooms();
            toast.success(res.data.message);
        } catch (error) {
            console.error("Upload error:", error);
            toast.error('Error uploading file: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/classrooms/${id}`);
            toast.success('Classroom deleted');
            fetchClassrooms();
        } catch (error) {
            console.error(error);
            toast.error('Error deleting classroom');
        }
    };

    const handleToggleAvailability = async (id, currentStatus) => {
        try {
            await api.put(`/classrooms/${id}/availability`, { isAvailable: !currentStatus });
            toast.success(`Classroom marked as ${!currentStatus ? 'Available' : 'Unavailable'}`);
            fetchClassrooms();
        } catch (error) {
            toast.error("Error toggling availability");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRooms.length === 0) return;
        if (!window.confirm(`Delete ${selectedRooms.length} classrooms?`)) return;
        try {
            await api.post('/classrooms/delete-bulk', { ids: selectedRooms });
            toast.success(`Deleted ${selectedRooms.length} classrooms`);
            setSelectedRooms([]);
            fetchClassrooms();
        } catch (error) {
            toast.error("Error deleting classrooms");
        }
    };

    const toggleSelect = (id) => {
        if (selectedRooms.includes(id)) {
            setSelectedRooms(selectedRooms.filter(rid => rid !== id));
        } else {
            setSelectedRooms([...selectedRooms, id]);
        }
    };

    const filteredClassrooms = classrooms.filter(r => r.roomName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Classroom Management</h2>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Add Single Classroom */}
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="mb-4 text-lg font-semibold flex items-center"><Plus className="w-5 h-5 mr-2" /> Add Classroom</h3>
                    <form onSubmit={handleAddRoom} className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Room Name</label>
                                <input
                                    placeholder="e.g. Hall A"
                                    value={newRoom.roomName}
                                    onChange={e => setNewRoom({ ...newRoom, roomName: e.target.value })}
                                    className="w-full px-3 py-2 mt-1 border rounded"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Bench Capacity</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 20"
                                    value={newRoom.benchCount}
                                    onChange={e => setNewRoom({ ...newRoom, benchCount: e.target.value })}
                                    className="w-full px-3 py-2 mt-1 border rounded"
                                    required
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
                                <p>CSV Headers: RoomName, BenchCount</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const csvContent = "RoomName,BenchCount\nHall A,20\nHall B,25";
                                        const blob = new Blob([csvContent], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = "classroom_template.csv";
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

            {selectedRooms.length > 0 && (
                <div className="flex justify-end">
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center px-4 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected ({selectedRooms.length})
                    </button>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search classrooms by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full p-4 pl-10 text-sm border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredClassrooms.map(room => (
                    <div key={room.id} className={`p-6 rounded-lg shadow-md relative group border-t-4 ${room.isAvailable ? 'bg-white border-green-500' : 'bg-gray-100 border-gray-400'}`}>
                        <input
                            type="checkbox"
                            checked={selectedRooms.includes(room.id)}
                            onChange={() => toggleSelect(room.id)}
                            className="absolute top-4 left-4 rounded border-gray-300 w-5 h-5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex justify-between items-start pl-8">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{room.roomName}</h3>
                                <p className="text-gray-500 flex items-center mt-2">
                                    <LayoutGrid className="w-4 h-4 mr-2" />
                                    {room.benchCount} Benches
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Capacity: {room.benchCount * 2} Students</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                                <button onClick={() => handleDelete(room.id)} className="text-red-500 hover:text-red-700" title="Delete Room">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleToggleAvailability(room.id, room.isAvailable)}
                                    className={room.isAvailable ? "text-green-600 hover:text-green-700" : "text-gray-500 hover:text-gray-700"}
                                    title={room.isAvailable ? "Available for seating" : "Unavailable"}
                                >
                                    {room.isAvailable ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredClassrooms.length === 0 && (
                    <div className="col-span-full p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        No classrooms added yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Classrooms;
