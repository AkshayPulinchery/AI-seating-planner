import React, { useState, useEffect } from 'react';
import api from '../api';
import { Armchair, Download, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Seating = () => {
    const [seating, setSeating] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchSeating = async () => {
        try {
            const res = await api.get('/seating');
            setSeating(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchSeating();
    }, []);

    const handleGenerate = async () => {
        if (!window.confirm("This will clear existing seating. Continue?")) return;
        setLoading(true);
        try {
            const res = await api.post('/seating/generate');
            alert(`Seating Generated! Allocated: ${res.data.allocated} seats.`);
            fetchSeating();
        } catch (error) {
            alert('Error generating seating: ' + (error.response?.data?.error || error.message));
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

        doc.autoTable({
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

    // Group seating by room
    const rooms = {};
    seating.forEach(row => {
        if (!rooms[row.roomName]) {
            rooms[row.roomName] = {
                rows: [],
                invigilators: [row.invigilator1, row.invigilator2].filter(Boolean)
            };
        }
        rooms[row.roomName].rows.push(row);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900">Seating Arrangement</h2>
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
                        <div className="p-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-800">{roomName}</h3>
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold mr-2">Invigilators:</span>
                                {rooms[roomName].invigilators.length > 0
                                    ? rooms[roomName].invigilators.join(', ')
                                    : <span className="text-red-500 italic">None Assigned</span>
                                }
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
