const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const monitorMiddleware = require('./monitor/middleware');
const monitorRoutes = require('./monitor/routes');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Apply monitoring middleware
app.use(monitorMiddleware(io));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Monitor routes (dashboard, API)
app.use(monitorRoutes);

// Sample API endpoints for testing
app.get('/api/users', (req, res) => {
    const delay = Math.random() * 100;
    setTimeout(() => {
        res.json({ 
            users: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' }
            ]
        });
    }, delay);
});

app.get('/api/users/:id', (req, res) => {
    const delay = Math.random() * 150;
    setTimeout(() => {
        if (Math.random() < 0.1) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ id: req.params.id, name: 'User ' + req.params.id });
    }, delay);
});

app.post('/api/users', express.json(), (req, res) => {
    const delay = Math.random() * 200;
    setTimeout(() => {
        if (Math.random() < 0.05) {
            return res.status(400).json({ error: 'Invalid data' });
        }
        res.status(201).json({ id: Date.now(), ...req.body });
    }, delay);
});

app.get('/api/products', (req, res) => {
    const delay = Math.random() * 80;
    setTimeout(() => {
        res.json({ 
            products: [
                { id: 1, name: 'Product A', price: 29.99 },
                { id: 2, name: 'Product B', price: 49.99 }
            ]
        });
    }, delay);
});

app.get('/api/orders', (req, res) => {
    const delay = Math.random() * 300;
    setTimeout(() => {
        if (Math.random() < 0.08) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ orders: [] });
    }, delay);
});

app.post('/api/orders', express.json(), (req, res) => {
    const delay = Math.random() * 500;
    setTimeout(() => {
        if (Math.random() < 0.1) {
            return res.status(500).json({ error: 'Order processing failed' });
        }
        res.status(201).json({ orderId: Date.now(), status: 'created' });
    }, delay);
});

app.get('/api/search', (req, res) => {
    const delay = 200 + Math.random() * 800;
    setTimeout(() => {
        res.json({ results: [], query: req.query.q });
    }, delay);
});

app.delete('/api/cache', (req, res) => {
    const delay = Math.random() * 50;
    setTimeout(() => {
        res.json({ cleared: true });
    }, delay);
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Dashboard client connected');
    
    socket.on('disconnect', () => {
        console.log('Dashboard client disconnected');
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Request Monitoring Server Started                        ║
║                                                               ║
║   Dashboard:  http://localhost:${PORT}/dashboard                 ║
║   API Stats:  http://localhost:${PORT}/api/stats                 ║
║                                                               ║
║   Run the traffic generator to see live data:                 ║
║   node demo/traffic-generator.js                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});
