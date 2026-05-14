// Socket.IO connection
const socket = io();

// Chart instances
let trafficChart, statusTimeChart, statusChart, methodsChart;

// Chart.js default configuration
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#30363d';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Colors
const colors = {
    cyan: '#58a6ff',
    cyanAlpha: 'rgba(88, 166, 255, 0.2)',
    green: '#3fb950',
    greenAlpha: 'rgba(63, 185, 80, 0.2)',
    yellow: '#d29922',
    yellowAlpha: 'rgba(210, 153, 34, 0.2)',
    orange: '#db6d28',
    orangeAlpha: 'rgba(219, 109, 40, 0.2)',
    red: '#f85149',
    redAlpha: 'rgba(248, 81, 73, 0.2)',
    purple: '#a371f7',
    purpleAlpha: 'rgba(163, 113, 247, 0.2)',
    magenta: '#f778ba'
};

// Initialize charts
function initCharts() {
    // Traffic Chart (Area)
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    trafficChart = new Chart(trafficCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Requests/sec',
                data: [],
                borderColor: colors.cyan,
                backgroundColor: colors.cyanAlpha,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { maxTicksLimit: 10 }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: { color: '#21262d' }
                }
            },
            animation: {
                duration: 300
            }
        }
    });

    // Status Codes Over Time (Stacked Area)
    const statusTimeCtx = document.getElementById('statusTimeChart').getContext('2d');
    statusTimeChart = new Chart(statusTimeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '2xx',
                    data: [],
                    borderColor: colors.green,
                    backgroundColor: colors.greenAlpha,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 1
                },
                {
                    label: '4xx',
                    data: [],
                    borderColor: colors.yellow,
                    backgroundColor: colors.yellowAlpha,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 1
                },
                {
                    label: '5xx',
                    data: [],
                    borderColor: colors.red,
                    backgroundColor: colors.redAlpha,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, padding: 10 }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { maxTicksLimit: 8 }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    stacked: true,
                    grid: { color: '#21262d' }
                }
            },
            animation: {
                duration: 300
            }
        }
    });

    // Status Codes Distribution (Doughnut)
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['2xx', '3xx', '4xx', '5xx'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [colors.green, colors.cyan, colors.yellow, colors.red],
                borderColor: '#21262d',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, padding: 8 }
                }
            },
            animation: {
                duration: 300
            }
        }
    });

    // HTTP Methods (Pie)
    const methodsCtx = document.getElementById('methodsChart').getContext('2d');
    methodsChart = new Chart(methodsCtx, {
        type: 'pie',
        data: {
            labels: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [colors.cyan, colors.green, colors.yellow, colors.red, colors.purple],
                borderColor: '#21262d',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, padding: 8 }
                }
            },
            animation: {
                duration: 300
            }
        }
    });
}

// Update stats display
function updateStats(stats) {
    document.getElementById('rps').textContent = stats.rps || 0;
    document.getElementById('p95').textContent = (stats.p95 || 0) + 'ms';
    document.getElementById('errors').textContent = stats.statusCodes ? 
        (stats.statusCodes['4xx'] + stats.statusCodes['5xx']) : 0;
    document.getElementById('total').textContent = stats.totalRequests || 0;

    // Latency display
    document.getElementById('p50-display').textContent = (stats.p50 || 0) + 'ms';
    document.getElementById('p95-display').textContent = (stats.p95 || 0) + 'ms';
    document.getElementById('p99-display').textContent = (stats.p99 || 0) + 'ms';
    document.getElementById('avg-display').textContent = (stats.avgLatency || 0) + 'ms';

    // Error rate gauge
    const errorRate = stats.errorRate || 0;
    document.getElementById('error-rate').textContent = errorRate + '%';
    const gaugeFill = document.getElementById('error-gauge-fill');
    gaugeFill.style.width = Math.min(errorRate * 5, 100) + '%';
    
    // Color based on error rate
    const gaugeValue = document.getElementById('error-rate');
    if (errorRate > 10) {
        gaugeFill.style.background = colors.red;
        gaugeValue.style.color = colors.red;
    } else if (errorRate > 5) {
        gaugeFill.style.background = colors.orange;
        gaugeValue.style.color = colors.orange;
    } else if (errorRate > 2) {
        gaugeFill.style.background = colors.yellow;
        gaugeValue.style.color = colors.yellow;
    } else {
        gaugeFill.style.background = colors.green;
        gaugeValue.style.color = colors.green;
    }
}

// Update traffic chart
function updateTrafficChart(rpsOverTime) {
    if (!rpsOverTime || rpsOverTime.length === 0) return;

    const labels = rpsOverTime.map(d => {
        const date = new Date(d.timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
    });
    const data = rpsOverTime.map(d => d.rps);

    trafficChart.data.labels = labels;
    trafficChart.data.datasets[0].data = data;
    trafficChart.update('none');
}

// Update status over time chart
function updateStatusTimeChart(statusOverTime) {
    if (!statusOverTime || statusOverTime.length === 0) return;

    const labels = statusOverTime.map(d => {
        const date = new Date(d.timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
    });

    statusTimeChart.data.labels = labels;
    statusTimeChart.data.datasets[0].data = statusOverTime.map(d => d['2xx']);
    statusTimeChart.data.datasets[1].data = statusOverTime.map(d => d['4xx']);
    statusTimeChart.data.datasets[2].data = statusOverTime.map(d => d['5xx']);
    statusTimeChart.update('none');
}

// Update status codes chart
function updateStatusChart(statusCodes) {
    if (!statusCodes) return;

    statusChart.data.datasets[0].data = [
        statusCodes['2xx'] || 0,
        statusCodes['3xx'] || 0,
        statusCodes['4xx'] || 0,
        statusCodes['5xx'] || 0
    ];
    statusChart.update('none');
}

// Update methods chart
function updateMethodsChart(methods) {
    if (!methods) return;

    const methodLabels = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    methodsChart.data.datasets[0].data = methodLabels.map(m => methods[m] || 0);
    methodsChart.update('none');
}

// Update top endpoints
function updateTopEndpoints(endpoints) {
    const container = document.getElementById('topEndpoints');
    
    if (!endpoints || endpoints.length === 0) {
        container.innerHTML = '<div class="endpoint-placeholder">Waiting for data...</div>';
        return;
    }

    const maxCount = Math.max(...endpoints.map(e => e.count));
    
    container.innerHTML = endpoints.slice(0, 5).map(e => {
        const [method, path] = e.endpoint.split(' ');
        const percentage = (e.count / maxCount) * 100;
        return `
            <div class="endpoint-item">
                <span class="endpoint-method method-${method}">${method}</span>
                <span class="endpoint-path">${path}</span>
                <div class="endpoint-bar">
                    <div class="endpoint-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="endpoint-value">${e.count}</span>
            </div>
        `;
    }).join('');
}

// Update slowest endpoints
function updateSlowestEndpoints(endpoints) {
    const container = document.getElementById('slowestEndpoints');
    
    if (!endpoints || endpoints.length === 0) {
        container.innerHTML = '<div class="endpoint-placeholder">Waiting for data...</div>';
        return;
    }

    const maxDuration = Math.max(...endpoints.map(e => e.avgDuration));
    
    container.innerHTML = endpoints.map(e => {
        const [method, path] = e.endpoint.split(' ');
        const percentage = (e.avgDuration / maxDuration) * 100;
        return `
            <div class="endpoint-item">
                <span class="endpoint-method method-${method}">${method}</span>
                <span class="endpoint-path">${path}</span>
                <div class="endpoint-bar">
                    <div class="endpoint-bar-fill" style="width: ${percentage}%; background: linear-gradient(90deg, ${colors.orange}, ${colors.red})"></div>
                </div>
                <span class="endpoint-value">${e.avgDuration}ms</span>
            </div>
        `;
    }).join('');
}

// Update request feed
function updateRequestFeed(requests) {
    const container = document.getElementById('requestFeed');
    
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="request-placeholder">Waiting for requests...</div>';
        return;
    }

    container.innerHTML = requests.map(r => {
        const statusClass = `status-${Math.floor(r.statusCode / 100)}xx`;
        const time = new Date(r.timestamp).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit',
            minute: '2-digit', 
            second: '2-digit' 
        });
        return `
            <div class="request-item">
                <span class="request-status ${statusClass}">${r.statusCode}</span>
                <span class="request-method">${r.method}</span>
                <span class="request-path">${r.path}</span>
                <span class="request-duration">${r.duration}ms</span>
                <span class="request-time">${time}</span>
            </div>
        `;
    }).join('');
}

// Add single request to feed (for real-time updates)
function addRequestToFeed(request) {
    const container = document.getElementById('requestFeed');
    const placeholder = container.querySelector('.request-placeholder');
    if (placeholder) {
        container.innerHTML = '';
    }

    const statusClass = `status-${Math.floor(request.statusCode / 100)}xx`;
    const time = new Date(request.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit',
        minute: '2-digit', 
        second: '2-digit' 
    });

    const requestEl = document.createElement('div');
    requestEl.className = 'request-item';
    requestEl.innerHTML = `
        <span class="request-status ${statusClass}">${request.statusCode}</span>
        <span class="request-method">${request.method}</span>
        <span class="request-path">${request.path}</span>
        <span class="request-duration">${request.duration}ms</span>
        <span class="request-time">${time}</span>
    `;

    container.insertBefore(requestEl, container.firstChild);

    // Keep only last 20 requests
    while (container.children.length > 20) {
        container.removeChild(container.lastChild);
    }
}

// Full stats update handler
function handleStatsUpdate(stats) {
    updateStats(stats);
    updateTrafficChart(stats.rpsOverTime);
    updateStatusTimeChart(stats.statusOverTime);
    updateStatusChart(stats.statusCodes);
    updateMethodsChart(stats.methods);
    updateTopEndpoints(stats.topEndpoints);
    updateSlowestEndpoints(stats.slowestEndpoints);
    updateRequestFeed(stats.recentRequests);
}

// Socket.IO event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('stats', handleStatsUpdate);

socket.on('request', (request) => {
    addRequestToFeed(request);
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    
    // Fetch initial stats
    fetch('/api/stats')
        .then(res => res.json())
        .then(handleStatsUpdate)
        .catch(err => console.error('Failed to fetch initial stats:', err));
});
