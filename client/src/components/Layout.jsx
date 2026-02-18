import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, School, Armchair, LogOut, KeyRound, Menu, X, User } from 'lucide-react';
import clsx from 'clsx';

const Layout = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/students', label: 'Students', icon: Users },
        { path: '/classrooms', label: 'Classrooms', icon: School },
        { path: '/invigilators', label: 'Invigilators', icon: User },
        { path: '/seating', label: 'Seating', icon: Armchair },
        { path: '/change-password', label: 'Password', icon: KeyRound },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    return (
        <div className="flex h-screen bg-gray-100 flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white p-4 shadow-sm flex justify-between items-center">
                <h1 className="text-xl font-bold text-blue-600">ExamSeat AI</h1>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600">
                    {isSidebarOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={clsx(
                "bg-white shadow-md fixed md:relative z-20 h-full transition-transform duration-300 ease-in-out md:translate-x-0 w-64",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 hidden md:block">
                    <h1 className="text-2xl font-bold text-blue-600">ExamSeat AI</h1>
                </div>
                <nav className="mt-6 flex flex-col h-[calc(100%-80px)]">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={clsx(
                                    "flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors",
                                    isActive && "bg-blue-50 text-blue-600 border-r-4 border-blue-600"
                                )}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <div className="mt-auto p-4 border-t">
                        <button
                            onClick={handleLogout}
                            className="flex items-center px-6 py-3 text-red-600 hover:bg-red-50 w-full rounded"
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
