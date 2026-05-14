const MAX_REQUESTS = 1000;
const TIME_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

class RequestStore {
    constructor() {
        this.requests = [];
        this.rpsHistory = [];
        this.lastRpsCalculation = Date.now();
    }

    addRequest(request) {
        this.requests.push(request);
        
        // Keep only last MAX_REQUESTS
        if (this.requests.length > MAX_REQUESTS) {
            this.requests.shift();
        }

        // Update RPS history every second
        const now = Date.now();
        if (now - this.lastRpsCalculation >= 1000) {
            this.updateRpsHistory();
            this.lastRpsCalculation = now;
        }
    }

    updateRpsHistory() {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        const recentRequests = this.requests.filter(r => r.timestamp >= oneSecondAgo);
        
        this.rpsHistory.push({
            timestamp: now,
            rps: recentRequests.length
        });

        // Keep last 5 minutes of RPS data
        const cutoff = now - TIME_WINDOW;
        this.rpsHistory = this.rpsHistory.filter(r => r.timestamp >= cutoff);
    }

    getRecentRequests(limit = 50) {
        return this.requests.slice(-limit).reverse();
    }

    getRequestsInWindow(windowMs = TIME_WINDOW) {
        const cutoff = Date.now() - windowMs;
        return this.requests.filter(r => r.timestamp >= cutoff);
    }

    getStats() {
        const windowRequests = this.getRequestsInWindow();
        const now = Date.now();

        // Calculate RPS (requests in last second)
        const oneSecondAgo = now - 1000;
        const rps = this.requests.filter(r => r.timestamp >= oneSecondAgo).length;

        // Status code distribution
        const statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
        windowRequests.forEach(r => {
            const category = Math.floor(r.statusCode / 100) + 'xx';
            if (statusCodes[category] !== undefined) {
                statusCodes[category]++;
            }
        });

        // HTTP methods distribution
        const methods = {};
        windowRequests.forEach(r => {
            methods[r.method] = (methods[r.method] || 0) + 1;
        });

        // Top endpoints
        const endpoints = {};
        windowRequests.forEach(r => {
            const key = `${r.method} ${r.path}`;
            endpoints[key] = (endpoints[key] || 0) + 1;
        });
        const topEndpoints = Object.entries(endpoints)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count }));

        // Slowest endpoints (average duration)
        const endpointDurations = {};
        windowRequests.forEach(r => {
            const key = `${r.method} ${r.path}`;
            if (!endpointDurations[key]) {
                endpointDurations[key] = { total: 0, count: 0 };
            }
            endpointDurations[key].total += r.duration;
            endpointDurations[key].count++;
        });
        const slowestEndpoints = Object.entries(endpointDurations)
            .map(([endpoint, data]) => ({
                endpoint,
                avgDuration: Math.round(data.total / data.count)
            }))
            .sort((a, b) => b.avgDuration - a.avgDuration)
            .slice(0, 5);

        // Latency percentiles
        const durations = windowRequests.map(r => r.duration).sort((a, b) => a - b);
        const percentile = (arr, p) => {
            if (arr.length === 0) return 0;
            const index = Math.ceil(arr.length * p / 100) - 1;
            return arr[Math.max(0, index)];
        };

        // Error rate
        const errorCount = windowRequests.filter(r => r.statusCode >= 400).length;
        const errorRate = windowRequests.length > 0 
            ? Math.round((errorCount / windowRequests.length) * 1000) / 10 
            : 0;

        // Status codes over time (bucketed by 10 seconds)
        const statusOverTime = this.getStatusOverTime();

        // RPS over time
        const rpsOverTime = this.getRpsOverTime();

        return {
            totalRequests: windowRequests.length,
            rps,
            avgLatency: durations.length > 0 
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) 
                : 0,
            p50: Math.round(percentile(durations, 50)),
            p95: Math.round(percentile(durations, 95)),
            p99: Math.round(percentile(durations, 99)),
            errorRate,
            statusCodes,
            methods,
            topEndpoints,
            slowestEndpoints,
            statusOverTime,
            rpsOverTime,
            recentRequests: this.getRecentRequests(20)
        };
    }

    getStatusOverTime() {
        const now = Date.now();
        const bucketSize = 10000; // 10 seconds
        const buckets = {};

        // Initialize buckets for last 5 minutes
        for (let i = 0; i < 30; i++) {
            const bucketTime = now - (i * bucketSize);
            const bucketKey = Math.floor(bucketTime / bucketSize) * bucketSize;
            buckets[bucketKey] = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
        }

        // Fill buckets
        this.getRequestsInWindow().forEach(r => {
            const bucketKey = Math.floor(r.timestamp / bucketSize) * bucketSize;
            if (buckets[bucketKey]) {
                const category = Math.floor(r.statusCode / 100) + 'xx';
                if (buckets[bucketKey][category] !== undefined) {
                    buckets[bucketKey][category]++;
                }
            }
        });

        return Object.entries(buckets)
            .sort((a, b) => a[0] - b[0])
            .map(([timestamp, data]) => ({
                timestamp: parseInt(timestamp),
                ...data
            }));
    }

    getRpsOverTime() {
        const now = Date.now();
        const bucketSize = 5000; // 5 seconds
        const buckets = {};

        // Initialize buckets for last 5 minutes
        for (let i = 0; i < 60; i++) {
            const bucketTime = now - (i * bucketSize);
            const bucketKey = Math.floor(bucketTime / bucketSize) * bucketSize;
            buckets[bucketKey] = 0;
        }

        // Fill buckets
        this.getRequestsInWindow().forEach(r => {
            const bucketKey = Math.floor(r.timestamp / bucketSize) * bucketSize;
            if (buckets[bucketKey] !== undefined) {
                buckets[bucketKey]++;
            }
        });

        return Object.entries(buckets)
            .sort((a, b) => a[0] - b[0])
            .map(([timestamp, count]) => ({
                timestamp: parseInt(timestamp),
                rps: count / (bucketSize / 1000) // Normalize to per-second
            }));
    }

    clear() {
        this.requests = [];
        this.rpsHistory = [];
    }
}

module.exports = new RequestStore();
