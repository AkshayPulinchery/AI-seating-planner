import React, { useState, useEffect } from 'react';
import api from '../api';
import { Armchair, Download, RefreshCw, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const Seating = () => {
    const [seating, setSeating] = useState([]);
    const [invigilators, setInvigilators] = useState([]);
    const [loading, setLoading] = useState(false);
    const [assigningRoomId, setAssigningRoomId] = useState(null);
    const [editingRoomId, setEditingRoomId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSeating = async () => {
        try {
            const res = await api.get('/seating');
            setSeating(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchInvigilators = async () => {
        try {
            const res = await api.get('/invigilators');
            setInvigilators(res.data.filter(i => i.isAvailable !== 0)); // Only show available
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchSeating();
        fetchInvigilators();
    }, []);

    const handleGenerate = async () => {
        if (!window.confirm("This will clear existing seating. Continue?")) return;
        setLoading(true);
        try {
            const res = await api.post('/seating/generate');
            toast.success(`Seating Generated! Allocated: ${res.data.allocated} seats.`);
            fetchSeating();
        } catch (error) {
            toast.error('Error generating seating: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text("Exam Seating Arrangement", 14, 15);

        const tableColumn = ["Room", "Bench", "Student 1", "S1 Exam", "Student 2", "S2 Exam"];
        const tableRows = [];

        seating.forEach(row => {
            const s1 = row.student1Name ? `${row.student1Name} (${row.student1Reg})` : '-';
            const s1Code = row.student1Exam || '-';
            const s2 = row.student2Name ? `${row.student2Name} (${row.student2Reg})` : '-';
            const s2Code = row.student2Exam || '-';
            tableRows.push([row.roomName, row.benchNumber, s1, s1Code, s2, s2Code]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 },
            columnStyles: {
                2: { cellWidth: 40 },
                4: { cellWidth: 40 }
            }
        });

        doc.save("seating_chart.pdf");
    };

    const exportExcel = () => {
        const data = seating.map(row => ({
            Room: row.roomName,
            Bench: row.benchNumber,
            Student1: row.student1Name ? `${row.student1Name} (${row.student1Reg})` : '-',
            Student1_Exam: row.student1Exam || '-',
            Student2: row.student2Name ? `${row.student2Name} (${row.student2Reg})` : '-',
            Student2_Exam: row.student2Exam || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Seating");
        XLSX.writeFile(wb, "seating_chart.xlsx");
    };

    // Filter seating before grouping
    const filteredSeating = seating.filter(row => {
        const term = searchTerm.toLowerCase();
        return (
            (row.roomName && row.roomName.toLowerCase().includes(term)) ||
            (row.student1Name && row.student1Name.toLowerCase().includes(term)) ||
            (row.student1Reg && row.student1Reg.toLowerCase().includes(term)) ||
            (row.student2Name && row.student2Name.toLowerCase().includes(term)) ||
            (row.student2Reg && row.student2Reg.toLowerCase().includes(term)) ||
            (row.benchNumber && row.benchNumber.toString().includes(term))
        );
    });

    const rooms = {};
    filteredSeating.forEach(row => {
        if (!rooms[row.roomName]) {
            rooms[row.roomName] = {
                roomId: row.roomId,
                rows: [],
                invigilator1Id: null,
                invigilator2Id: null,
                invigilator1Name: null,
                invigilator2Name: null,
            };
        }
        rooms[row.roomName].rows.push(row);
        // Assuming we patch backend to return roomId, inv1Id, inv2Id
        // We set these values below if they exist
        if (row.roomId) rooms[row.roomName].roomId = row.roomId;
        if (row.invigilator1Id) rooms[row.roomName].invigilator1Id = row.invigilator1Id;
        if (row.invigilator2Id) rooms[row.roomName].invigilator2Id = row.invigilator2Id;
        if (row.invigilator1) rooms[row.roomName].invigilator1Name = row.invigilator1;
        if (row.invigilator2) rooms[row.roomName].invigilator2Name = row.invigilator2;
    });

    const handleManualAssign = async (roomId, targetSlot, newInvId, currentRoomObj) => {
        if (!roomId) { toast.error("Room ID missing!"); return; }

        setAssigningRoomId(roomId);
        try {
            let inv1 = targetSlot === 1 ? newInvId : currentRoomObj.invigilator1Id;
            let inv2 = targetSlot === 2 ? newInvId : currentRoomObj.invigilator2Id;

            await api.post('/seating/manual-assign', {
                roomId,
                invigilator1Id: inv1 || null,
                invigilator2Id: inv2 || null
            });
            await fetchSeating();
            toast.success('Invigilators updated successfully');
            setEditingRoomId(null);
        } catch (error) {
            toast.error("Error assigning invigilator: " + error.message);
        } finally {
            setAssigningRoomId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900">Seating Arrangement</h2>

                <div className="relative flex-grow max-w-md mx-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search rooms, students, reg no..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                </div>

                <div className="flex flex-wrap gap-2 md:space-x-4">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center disabled:opacity-50 inline-flex"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Generating...' : 'Generate New Seating'}
                    </button>
                    <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center">
                        <Download className="w-4 h-4 mr-2" /> PDF
                    </button>
                    <button onClick={exportExcel} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center">
                        <Download className="w-4 h-4 mr-2" /> Excel
                    </button>
                </div>
            </div>

            {seating.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-md">
                    No seating arrangement generated yet. Click "Generate" to start.
                </div>
            ) : (
                Object.keys(rooms).map(roomName => (
                    <div key={roomName} className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                        <div className="p-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-xl font-bold text-gray-800">{roomName}</h3>
                            <div className="text-sm flex flex-col md:flex-row gap-4 md:items-center bg-white p-3 rounded shadow-sm border border-gray-100">
                                <span className="font-semibold text-gray-700">Assigned Invigilators:</span>

                                {editingRoomId === rooms[roomName].roomId ? (
                                    <div className="flex gap-2 items-center">
                                        <select
                                            className="border rounded p-1.5 text-xs bg-gray-50"
                                            value={rooms[roomName].invigilator1Id || ""}
                                            disabled={assigningRoomId === rooms[roomName].roomId}
                                            onChange={(e) => handleManualAssign(rooms[roomName].roomId, 1, e.target.value, rooms[roomName])}
                                        >
                                            <option value="">-- Seat 1 --</option>
                                            {invigilators.map(inv => (
                                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="border rounded p-1.5 text-xs bg-gray-50"
                                            value={rooms[roomName].invigilator2Id || ""}
                                            disabled={assigningRoomId === rooms[roomName].roomId}
                                            onChange={(e) => handleManualAssign(rooms[roomName].roomId, 2, e.target.value, rooms[roomName])}
                                        >
                                            <option value="">-- Seat 2 --</option>
                                            {invigilators.map(inv => (
                                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => setEditingRoomId(null)}
                                            className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                                        >
                                            Done
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-600">
                                            {rooms[roomName].invigilator1Name || rooms[roomName].invigilator2Name ? (
                                                <>
                                                    {rooms[roomName].invigilator1Name && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded mr-1">{rooms[roomName].invigilator1Name}</span>}
                                                    {rooms[roomName].invigilator2Name && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{rooms[roomName].invigilator2Name}</span>}
                                                </>
                                            ) : (
                                                <span className="italic text-gray-400">None Assigned</span>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => setEditingRoomId(rooms[roomName].roomId)}
                                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Change/Swap
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3 border-b border-r w-24">Bench</th>
                                        <th className="px-6 py-3 border-b bg-blue-50 w-1/2">Student 1</th>
                                        <th className="px-6 py-3 border-b bg-green-50 w-1/2">Student 2</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rooms[roomName].rows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium border-r text-center">{row.benchNumber}</td>
                                            <td className="px-6 py-3 border-r relative group">
                                                {row.student1Name ? (
                                                    <div>
                                                        <div className="font-medium text-blue-900">{row.student1Name}</div>
                                                        <div className="text-xs text-gray-500">{row.student1Reg} • <span className="font-mono bg-blue-100 px-1 rounded">{row.student1Exam}</span></div>
                                                    </div>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-3">
                                                {row.student2Name ? (
                                                    <div>
                                                        <div className="font-medium text-green-900">{row.student2Name}</div>
                                                        <div className="text-xs text-gray-500">{row.student2Reg} • <span className="font-mono bg-green-100 px-1 rounded">{row.student2Exam}</span></div>
                                                    </div>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default Seating;
