const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
}));

// Route mappings: path prefix -> target service URL
const routes = {
  // Admin sub-routes routed to their owning services (must come before /api/v1/admin)
  '/api/v1/admin/orders': 'http://127.0.0.1:8084',
  '/api/v1/admin/returns': 'http://127.0.0.1:8089',
  '/api/v1/admin/inventory': 'http://127.0.0.1:8086',
  '/api/v1/admin/products': 'http://127.0.0.1:8082',
  '/api/v1/admin/brands': 'http://127.0.0.1:8082',
  '/api/v1/admin/categories': 'http://127.0.0.1:8082',
  '/api/v1/admin/collections': 'http://127.0.0.1:8082',
  '/api/v1/admin/catalog': 'http://127.0.0.1:8082',
  '/api/v1/admin/stories': 'http://127.0.0.1:8082',
  '/api/v1/admin/support': 'http://127.0.0.1:8091',

  // Admin service (port 8080)
  '/api/v1/admin': 'http://127.0.0.1:8080',
  '/api/v1/homepage': 'http://127.0.0.1:8080/api/v1/admin/homepage/public',
  '/api/v1/banners': 'http://127.0.0.1:8080/api/v1/admin/content/banners/active',

  // Auth service (port 8081)
  '/api/v1/auth': 'http://127.0.0.1:8081',

  // Catalog service (port 8082)
  '/api/v1/products': 'http://127.0.0.1:8082',
  '/api/v1/categories': 'http://127.0.0.1:8082',
  '/api/v1/brands': 'http://127.0.0.1:8082',
  '/api/v1/collections': 'http://127.0.0.1:8082',
  '/api/v1/stories': 'http://127.0.0.1:8082',

  // Cart service (port 8083)
  '/api/v1/cart': 'http://127.0.0.1:8083',

  // Order service (port 8084)
  '/api/v1/orders': 'http://127.0.0.1:8084',

  // Payment service (port 8085)
  '/api/v1/payments': 'http://127.0.0.1:8085',

  // Inventory service (port 8086)
  '/api/v1/inventory': 'http://127.0.0.1:8086',

  // Notification service (port 8087)
  '/api/v1/notifications': 'http://127.0.0.1:8087',

  // Pincode service (port 8088)
  '/api/v1/pincode': 'http://127.0.0.1:8088',

  // Return service (port 8089)
  '/api/v1/returns': 'http://127.0.0.1:8089',

  // Search service (port 8090)
  '/api/v1/search': 'http://127.0.0.1:8090',

  // Support service (port 8091)
  '/api/v1/support': 'http://127.0.0.1:8091',

  // Customer/Addresses (use auth service for now)
  '/api/v1/addresses': 'http://127.0.0.1:8081',
  '/api/v1/customer': 'http://127.0.0.1:8081',
};

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'local-gateway' });
});

const healthTargets = {
  gateway: `http://127.0.0.1:${PORT}/api/v1/health`,
  auth: 'http://127.0.0.1:8081/health',
  admin: 'http://127.0.0.1:8080/health',
  catalog: 'http://127.0.0.1:8082/health',
  order: 'http://127.0.0.1:8084/health',
  inventory: 'http://127.0.0.1:8086/health',
  notifications: 'http://127.0.0.1:8087/health',
  returns: 'http://127.0.0.1:8089/health',
  support: 'http://127.0.0.1:8091/health',
};

app.get('/api/v1/health/:service', async (req, res) => {
  const target = healthTargets[req.params.service];
  if (!target) {
    return res.status(404).json({ success: false, status: 'unknown', service: req.params.service });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // Increased timeout to 5s
    const resp = await fetch(target, { signal: controller.signal });
    clearTimeout(timeout);

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return res.status(resp.status).json(data || { success: false, status: 'down', service: req.params.service });
    }
    return res.json(data || { success: true, status: 'ok', service: req.params.service });
  } catch (err) {
    return res.status(503).json({ success: false, status: 'down', service: req.params.service });
  }
});

// Setup proxies
Object.entries(routes).forEach(([routePath, target]) => {
  app.use(routePath, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (pathStr) => {
      // If the target already includes a path (like for homepage), we don't want to append the original path again.
      if (target.includes('/api/v1')) return '';
      // Express strips the mount path, so re-add it to preserve the full API route.
      return `${routePath}${pathStr}`;
    },
  }));
});

app.listen(PORT, () => {
  console.log(`Local Gateway running on port ${PORT}`);
});
