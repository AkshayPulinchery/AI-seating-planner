import axios from 'axios';

const api = axios.create({
    // Vercel URL
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    // Example Render URL when you deploy the backend on Render
    // baseURL: 'https://ai-seating-server.onrender.com/api',
});

export default api;
