const express = require('express');
const path = require('path');
const store = require('./store');

const router = express.Router();

// Serve dashboard
router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// API endpoint for stats (fallback for polling)
router.get('/api/stats', (req, res) => {
    res.json(store.getStats());
});

// API endpoint for recent requests
router.get('/api/requests', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json(store.getRecentRequests(limit));
});

// Clear all data
router.post('/api/clear', (req, res) => {
    store.clear();
    res.json({ success: true });
});

module.exports = router;
