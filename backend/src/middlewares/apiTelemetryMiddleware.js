/**
 * AuraMarket Enterprise API Telemetry & Traffic Insights Engine
 * Pillar 2 - Point 33: System Health Monitor & Live API Telemetry Dashboard
 */

// In-memory ring buffer & telemetry accumulator
let totalRequests = 0;
let activeConnections = 0;
const statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
const recentRequests = []; // max 50 recent requests
const slowestEndpoints = []; // top 10 slowest requests
const requestTimestamps = []; // timestamps within last 60s
const responseDurations = []; // last 200 response durations

let eventLoopLagMs = 0.5;
let lastHeartbeat = Date.now();

// Event loop lag monitoring heartbeat (1s interval)
const heartbeatTimer = setInterval(() => {
  const now = Date.now();
  const delta = now - lastHeartbeat - 1000;
  eventLoopLagMs = Math.max(0.1, Number((Math.max(0, delta) + 0.4).toFixed(2)));
  lastHeartbeat = now;
}, 1000);

if (heartbeatTimer.unref) {
  heartbeatTimer.unref();
}

/**
 * Express middleware to record incoming API requests and response latencies
 */
function apiTelemetryMiddleware(req, res, next) {
  const startTime = process.hrtime();
  activeConnections++;
  totalRequests++;

  const now = Date.now();
  requestTimestamps.push(now);

  // Maintain 60-second sliding window for RPM/RPS
  const oneMinuteAgo = now - 60000;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }

  res.on('finish', () => {
    activeConnections = Math.max(0, activeConnections - 1);
    const diff = process.hrtime(startTime);
    const durationMs = Number(((diff[0] * 1e9 + diff[1]) / 1e6).toFixed(2));

    const code = res.statusCode;
    if (code >= 200 && code < 300) statusCodes['2xx']++;
    else if (code >= 300 && code < 400) statusCodes['3xx']++;
    else if (code >= 400 && code < 500) statusCodes['4xx']++;
    else if (code >= 500) statusCodes['5xx']++;

    responseDurations.push(durationMs);
    if (responseDurations.length > 200) {
      responseDurations.shift();
    }

    const logEntry = {
      id: `REQ-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: code,
      durationMs,
      ip: req.ip || (req.headers && req.headers['x-forwarded-for']) || '127.0.0.1',
    };

    // Keep last 50 requests
    recentRequests.unshift(logEntry);
    if (recentRequests.length > 50) {
      recentRequests.pop();
    }

    // Track slowest endpoints (top 10)
    if (durationMs > 10 || slowestEndpoints.length < 10) {
      slowestEndpoints.push(logEntry);
      slowestEndpoints.sort((a, b) => b.durationMs - a.durationMs);
      if (slowestEndpoints.length > 10) {
        slowestEndpoints.pop();
      }
    }
  });

  next();
}

/**
 * Get aggregated API telemetry metrics snapshot
 */
function getApiTelemetryMetrics() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }

  const rpm = requestTimestamps.length;
  const rps = Number((rpm / 60).toFixed(2));

  let avgMs = 8.5;
  let p95Ms = 18.0;
  let p99Ms = 35.0;

  if (responseDurations.length > 0) {
    const sum = responseDurations.reduce((a, b) => a + b, 0);
    avgMs = Number((sum / responseDurations.length).toFixed(2));

    const sorted = [...responseDurations].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p99Idx = Math.floor(sorted.length * 0.99);
    p95Ms = Number((sorted[p95Idx] || sorted[sorted.length - 1]).toFixed(2));
    p99Ms = Number((sorted[p99Idx] || sorted[sorted.length - 1]).toFixed(2));
  }

  const total = Math.max(1, totalRequests);
  const successTotal = statusCodes['2xx'] + statusCodes['3xx'];
  const successRatePercent = Number(((successTotal / total) * 100).toFixed(1));

  return {
    summary: {
      healthStatus: eventLoopLagMs > 50 ? 'CRITICAL' : eventLoopLagMs > 20 ? 'WARNING' : 'HEALTHY',
      totalRequests,
      activeConnections,
      requestsPerMinute: rpm,
      requestsPerSecond: rps,
      avgResponseTimeMs: avgMs,
      p95ResponseTimeMs: p95Ms,
      p99ResponseTimeMs: p99Ms,
      eventLoopLagMs,
      successRatePercent,
    },
    statusCodes: { ...statusCodes },
    slowestEndpoints: [...slowestEndpoints],
    recentRequests: [...recentRequests],
  };
}

/**
 * Reset API metrics and latency buffer
 */
function resetApiTelemetry() {
  totalRequests = 0;
  activeConnections = 0;
  statusCodes['2xx'] = 0;
  statusCodes['3xx'] = 0;
  statusCodes['4xx'] = 0;
  statusCodes['5xx'] = 0;
  recentRequests.length = 0;
  slowestEndpoints.length = 0;
  requestTimestamps.length = 0;
  responseDurations.length = 0;
}

/**
 * Get current event loop lag
 */
function getEventLoopLag() {
  return eventLoopLagMs;
}

module.exports = {
  apiTelemetryMiddleware,
  getApiTelemetryMetrics,
  resetApiTelemetry,
  getEventLoopLag,
};
