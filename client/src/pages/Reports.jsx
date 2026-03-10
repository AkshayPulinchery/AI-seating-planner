import React, { useState, useEffect } from 'react';
import api from '../api';
import { FileText, Download, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Reports = () => {
    const [seating, setSeating] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeating = async () => {
            try {
                const res = await api.get('/seating');
                setSeating(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchSeating();
    }, []);

    // Filter seating
    const filteredSeating = seating.filter(row => {
        const term = searchTerm.toLowerCase();
        return (
            (row.roomName && row.roomName.toLowerCase().includes(term)) ||
            (row.student1Name && row.student1Name.toLowerCase().includes(term)) ||
            (row.student1Reg && row.student1Reg.toLowerCase().includes(term)) ||
            (row.student2Name && row.student2Name.toLowerCase().includes(term)) ||
            (row.student2Reg && row.student2Reg.toLowerCase().includes(term))
        );
    });

    // Group seating by room to form reports
    const reports = {};
    filteredSeating.forEach(row => {
        if (!reports[row.roomName]) {
            reports[row.roomName] = {
                roomName: row.roomName,
                invigilator1: row.invigilator1 || null,
                invigilator2: row.invigilator2 || null,
                studentNames: [],
                studentCount: 0
            };
        }

        if (row.student1Name) {
            reports[row.roomName].studentNames.push(`${row.student1Name} (${row.student1Reg})`);
            reports[row.roomName].studentCount++;
        }
        if (row.student2Name) {
            reports[row.roomName].studentNames.push(`${row.student2Name} (${row.student2Reg})`);
            reports[row.roomName].studentCount++;
        }

        // Ensure invigilators are picked up correctly from any row in the room
        if (row.invigilator1 && !reports[row.roomName].invigilator1) reports[row.roomName].invigilator1 = row.invigilator1;
        if (row.invigilator2 && !reports[row.roomName].invigilator2) reports[row.roomName].invigilator2 = row.invigilator2;
    });

    const reportData = Object.values(reports).sort((a, b) => a.roomName.localeCompare(b.roomName));

    const exportPDF = () => {
        const doc = new jsPDF('landscape');
        doc.text("Room Wise Seating Report", 14, 15);

        const tableColumn = ["Hall Name", "Invigilators", "Total Students", "Student Names"];
        const tableRows = [];

        reportData.forEach(data => {
            const invigilators = [data.invigilator1, data.invigilator2].filter(Boolean).join(", ") || "None";
            const studentsList = data.studentNames.join(", ");
            tableRows.push([data.roomName, invigilators, data.studentCount.toString(), studentsList]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 40 },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 170 } // Wide column for students
            }
        });

        doc.save("Exam_Seating_Report.pdf");
    };

    const exportExcel = () => {
        const dataForExcel = reportData.map(data => ({
            "Hall Name": data.roomName,
            "Invigilators": [data.invigilator1, data.invigilator2].filter(Boolean).join(", ") || "None",
            "Total Students": data.studentCount,
            "Student Names": data.studentNames.join(", ")
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExcel);

        // Auto-size columns slightly
        const wscols = [
            { wch: 15 }, // Hall
            { wch: 30 }, // Invigs
            { wch: 15 }, // Count
            { wch: 100 } // Students
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reports");
        XLSX.writeFile(wb, "Exam_Seating_Report.xlsx");
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Report...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                    <FileText className="w-8 h-8 mr-3 text-blue-600" />
                    Seating Reports
                </h2>

                <div className="relative flex-grow max-w-md mx-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search rooms, students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                <div className="flex flex-wrap gap-2 md:space-x-4">
                    <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> PDF Report
                    </button>
                    <button onClick={exportExcel} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> Excel Report
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-blue-50 text-gray-600 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4 border-b w-32">Hall Name</th>
                                <th className="px-6 py-4 border-b w-48">Invigilators</th>
                                <th className="px-6 py-4 border-b text-center w-32">Students Present</th>
                                <th className="px-6 py-4 border-b">Student Names (Reg No)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {reportData.length > 0 ? reportData.map((data, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-800">{data.roomName}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-purple-700">
                                        {[data.invigilator1, data.invigilator2].filter(Boolean).join(", ") || <span className="text-gray-400 font-normal italic">None</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-bold text-xs">{data.studentCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex flex-wrap gap-2">
                                            {data.studentNames.length > 0 ? data.studentNames.map((name, i) => (
                                                <span key={i} className="bg-gray-100 border border-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                                                    {name}
                                                </span>
                                            )) : <span className="text-gray-400 italic">No students routed here</span>}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No reporting data available. Generate seating first.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
