import React, { useEffect, useState } from 'react';
import api from '../api';
import { Users, School, Armchair } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({ students: 0, classrooms: 0, seating: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsRes, classroomsRes, seatingRes] = await Promise.all([
                    api.get('/students'),
                    api.get('/classrooms'),
                    api.get('/seating')
                ]);
                setStats({
                    students: studentsRes.data.length,
                    classrooms: classroomsRes.data.length,
                    seating: seatingRes.data.length // This is benches occupied
                });
            } catch (error) {
                console.error("Error fetching stats", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <StatCard
                    icon={Users}
                    title="Total Students"
                    value={stats.students}
                    color="bg-blue-500"
                />
                <StatCard
                    icon={School}
                    title="Total Classrooms"
                    value={stats.classrooms}
                    color="bg-green-500"
                />
                <StatCard
                    icon={Armchair}
                    title="Allocated Seats"
                    value={stats.seating * 2} // Approx seats
                    color="bg-purple-500"
                />
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Quick Guide</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Go to <strong>Students</strong> to add students or upload a CSV.</li>
                    <li>Go to <strong>Classrooms</strong> to define available rooms and bench capacity.</li>
                    <li>Go to <strong>Seating</strong> to generate the arrangement automatically.</li>
                </ul>
            </div>
        </div>
    );
};

const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="flex items-center p-6 bg-white rounded-lg shadow-md">
        <div className={`p-4 rounded-full ${color} text-white`}>
            <Icon className="w-8 h-8" />
        </div>
        <div className="ml-6">
            <h3 className="text-lg font-medium text-gray-500">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

export default Dashboard;
