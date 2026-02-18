import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';

const Classrooms = () => {
    const [classrooms, setClassrooms] = useState([]);
    const [newRoom, setNewRoom] = useState({ roomName: '', benchCount: '' });

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
            setNewRoom({ roomName: '', benchCount: '' });
            fetchClassrooms();
        } catch (error) {
            alert('Error adding classroom');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/classrooms/${id}`);
            fetchClassrooms();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Classroom Management</h2>

            <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="mb-4 text-lg font-semibold flex items-center"><Plus className="w-5 h-5 mr-2" /> Add Classroom</h3>
                <form onSubmit={handleAddRoom} className="flex flex-col md:flex-row gap-4 md:items-end">
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
                    <button type="submit" className="px-6 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 mb-[1px]">Add</button>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {classrooms.map(room => (
                    <div key={room.id} className="p-6 bg-white rounded-lg shadow-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{room.roomName}</h3>
                                <p className="text-gray-500 flex items-center mt-2">
                                    <LayoutGrid className="w-4 h-4 mr-2" />
                                    {room.benchCount} Benches
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Capacity: {room.benchCount * 2} Students</p>
                            </div>
                            <button onClick={() => handleDelete(room.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
                {classrooms.length === 0 && (
                    <div className="col-span-full p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        No classrooms added yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Classrooms;
