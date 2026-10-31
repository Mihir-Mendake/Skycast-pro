const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const weatherRoutes = require('./routes/weather');
const favoritesRoutes = require('./routes/favorites');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api', weatherRoutes);
app.use('/api', favoritesRoutes);

// Serve static frontend files from project root
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

// Fallback to index.html for any frontend navigation
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server when run directly (e.g. npm start)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`===============================================`);
        console.log(`🌤️ SkyCast Pro Server running on http://localhost:${PORT}`);
        console.log(`🚀 Weather API available at http://localhost:${PORT}/api/weather`);
        console.log(`🔍 Search API available at http://localhost:${PORT}/api/search`);
        console.log(`===============================================`);
    });
}

module.exports = app;
