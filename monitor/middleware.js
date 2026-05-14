const store = require('./store');

function monitorMiddleware(io) {
    return (req, res, next) => {
        const startTime = process.hrtime.bigint();
        const startTimestamp = Date.now();

        // Capture original end method
        const originalEnd = res.end;

        res.end = function (chunk, encoding) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

            const requestData = {
                method: req.method,
                path: req.path || req.url,
                statusCode: res.statusCode,
                duration: Math.round(duration * 100) / 100,
                contentLength: res.get('Content-Length') || (chunk ? chunk.length : 0),
                timestamp: startTimestamp,
                userAgent: req.get('User-Agent') || 'Unknown'
            };

            // Store the request
            store.addRequest(requestData);

            // Emit real-time update via Socket.IO
            if (io) {
                io.emit('request', requestData);
                io.emit('stats', store.getStats());
            }

            // Call original end
            return originalEnd.call(this, chunk, encoding);
        };

        next();
    };
}

module.exports = monitorMiddleware;
