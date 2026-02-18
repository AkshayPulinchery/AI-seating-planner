import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classrooms from './pages/Classrooms';
import Seating from './pages/Seating';
import ChangePassword from './pages/ChangePassword';
import Layout from './components/Layout';

function App() {
  const isAuthenticated = !!localStorage.getItem('token'); // Simple check for MVP

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="classrooms" element={<Classrooms />} />
          <Route path="seating" element={<Seating />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
