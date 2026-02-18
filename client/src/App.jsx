import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classrooms from './pages/Classrooms';
import Seating from './pages/Seating';
import Invigilators from './pages/Invigilators';
import ChangePassword from './pages/ChangePassword';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const isAuthenticated = !!localStorage.getItem('token'); // Simple check for MVP

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="students" element={<ErrorBoundary><Students /></ErrorBoundary>} />
          <Route path="classrooms" element={<ErrorBoundary><Classrooms /></ErrorBoundary>} />
          <Route path="invigilators" element={<ErrorBoundary><Invigilators /></ErrorBoundary>} />
          <Route path="seating" element={<ErrorBoundary><Seating /></ErrorBoundary>} />
          <Route path="change-password" element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
