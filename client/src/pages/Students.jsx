import React, { useState, useEffect } from 'react';
import api from '../api';
import { Plus, Upload, Trash2, Search } from 'lucide-react';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [newStudent, setNewStudent] = useState({ name: '', registerNumber: '', examCode: '' });
    const [uploadFile, setUploadFile] = useState(null);

    const fetchStudents = async () => {
        try {
            const res = await api.get('/students');
            setStudents(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/students', newStudent);
            setNewStudent({ name: '', registerNumber: '', examCode: '' });
            fetchStudents();
        } catch (error) {
            alert('Error adding student');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return;
        const formData = new FormData();
        formData.append('file', uploadFile);
        try {
            await api.post('/students/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadFile(null);
            fetchStudents();
            alert('Upload successful');
        } catch (error) {
            alert('Error uploading file');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/students/${id}`);
            fetchStudents();
        } catch (error) {
            console.error(error);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.examCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Student Management</h2>

            {/* Actions Area */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Add Single Student */}
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="mb-4 text-lg font-semibold flex items-center"><Plus className="w-5 h-5 mr-2" /> Add Student</h3>
                    <form onSubmit={handleAddStudent} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                placeholder="Name"
                                value={newStudent.name}
                                onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                className="px-3 py-2 border rounded"
                                required
                            />
                            <input
                                placeholder="Reg No"
                                value={newStudent.registerNumber}
                                onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                                className="px-3 py-2 border rounded"
                                required
                            />
                            <input
                                placeholder="Exam Code"
                                value={newStudent.examCode}
                                onChange={e => setNewStudent({ ...newStudent, examCode: e.target.value })}
                                className="px-3 py-2 border rounded"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Add Student</button>
                    </form>
                </div>

                {/* Upload CSV */}
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <h3 className="mb-4 text-lg font-semibold flex items-center"><Upload className="w-5 h-5 mr-2" /> Upload CSV</h3>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <p className="text-sm text-gray-500">CSV must have headers: Name, RegisterNumber, ExamCode</p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={e => setUploadFile(e.target.files[0])}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <button
                            type="submit"
                            disabled={!uploadFile}
                            className="w-full px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-300"
                        >
                            Upload
                        </button>
                    </form>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold">Registered Students ({students.length})</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Register No</th>
                                <th className="px-6 py-3">Exam Code</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3">{student.name}</td>
                                    <td className="px-6 py-3 font-mono text-sm">{student.registerNumber}</td>
                                    <td className="px-6 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{student.examCode}</span></td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => handleDelete(student.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No students found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Students;
