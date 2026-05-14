const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Endpoint configurations with weights and methods
const endpoints = [
    { path: '/api/users', method: 'GET', weight: 30 },
    { path: '/api/users/1', method: 'GET', weight: 15 },
    { path: '/api/users/2', method: 'GET', weight: 10 },
    { path: '/api/users/999', method: 'GET', weight: 5 },
    { path: '/api/users', method: 'POST', weight: 10, body: { name: 'Test User' } },
    { path: '/api/products', method: 'GET', weight: 20 },
    { path: '/api/orders', method: 'GET', weight: 15 },
    { path: '/api/orders', method: 'POST', weight: 8, body: { items: [1, 2] } },
    { path: '/api/search?q=test', method: 'GET', weight: 5 },
    { path: '/api/cache', method: 'DELETE', weight: 2 }
];

// Calculate total weight for random selection
const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);

// Select random endpoint based on weights
function selectEndpoint() {
    let random = Math.random() * totalWeight;
    for (const endpoint of endpoints) {
        random -= endpoint.weight;
        if (random <= 0) {
            return endpoint;
        }
    }
    return endpoints[0];
}

// Make HTTP request
function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const url = new URL(endpoint.path, BASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TrafficGenerator/1.0'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const status = res.statusCode;
                const statusColor = status < 300 ? '\x1b[32m' : 
                                   status < 400 ? '\x1b[36m' : 
                                   status < 500 ? '\x1b[33m' : '\x1b[31m';
                console.log(`${statusColor}${status}\x1b[0m ${endpoint.method.padEnd(6)} ${endpoint.path}`);
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`\x1b[31mERR\x1b[0m  ${endpoint.method.padEnd(6)} ${endpoint.path} - ${err.message}`);
            resolve();
        });

        if (endpoint.body) {
            req.write(JSON.stringify(endpoint.body));
        }

        req.end();
    });
}

// Traffic patterns
const patterns = {
    steady: () => 100 + Math.random() * 100,      // 100-200ms between requests
    burst: () => 10 + Math.random() * 30,          // 10-40ms (high traffic)
    slow: () => 500 + Math.random() * 1000,        // 500-1500ms (low traffic)
    variable: () => Math.random() < 0.3 ? 
        (10 + Math.random() * 30) :                // 30% burst
        (100 + Math.random() * 200)                // 70% steady
};

let currentPattern = 'steady';
let requestCount = 0;
let running = true;

// Main traffic generation loop
async function generateTraffic() {
    while (running) {
        const endpoint = selectEndpoint();
        await makeRequest(endpoint);
        requestCount++;

        // Get delay based on current pattern
        const delay = patterns[currentPattern]();
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Pattern rotation
function rotatePattern() {
    const patternNames = Object.keys(patterns);
    const currentIndex = patternNames.indexOf(currentPattern);
    currentPattern = patternNames[(currentIndex + 1) % patternNames.length];
    console.log(`\n\x1b[35m► Pattern changed to: ${currentPattern}\x1b[0m\n`);
}

// Stats display
function showStats() {
    console.log(`\n\x1b[36m═══ Stats: ${requestCount} requests sent | Pattern: ${currentPattern} ═══\x1b[0m\n`);
}

// Startup
console.log(`
\x1b[36m╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔥 Traffic Generator Started                                ║
║                                                               ║
║   Sending requests to: ${BASE_URL}                      ║
║   Press Ctrl+C to stop                                        ║
║                                                               ║
║   Pattern will rotate every 30 seconds                        ║
║   Current pattern: ${currentPattern}                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
\x1b[0m
`);

// Start generating traffic
generateTraffic();

// Rotate patterns every 30 seconds
const patternInterval = setInterval(rotatePattern, 30000);

// Show stats every 10 seconds
const statsInterval = setInterval(showStats, 10000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down traffic generator...');
    running = false;
    clearInterval(patternInterval);
    clearInterval(statsInterval);
    console.log(`Total requests sent: ${requestCount}`);
    process.exit(0);
});
