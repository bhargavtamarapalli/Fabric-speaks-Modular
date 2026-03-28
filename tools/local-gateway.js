const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 4000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Route mappings: path prefix -> target service URL
const routes = {
  // Admin sub-routes routed to their owning services (must come before /api/v1/admin)
  '/api/v1/admin/orders': 'http://localhost:8084',
  '/api/v1/admin/returns': 'http://localhost:8089',
  '/api/v1/admin/inventory': 'http://localhost:8086',
  '/api/v1/admin/products': 'http://localhost:8082',
  '/api/v1/admin/categories': 'http://localhost:8082',
  '/api/v1/admin/collections': 'http://localhost:8082',
  '/api/v1/admin/stories': 'http://localhost:8082',

  // Admin service (port 8080)
  '/api/v1/admin': 'http://localhost:8080',
  '/api/v1/homepage': 'http://localhost:8080/api/v1/admin/homepage/public',
  '/api/v1/banners': 'http://localhost:8080/api/v1/admin/content/banners/active',

  // Auth service (port 8081)
  '/api/v1/auth': 'http://localhost:8081',

  // Catalog service (port 8082)
  '/api/v1/products': 'http://localhost:8082',
  '/api/v1/categories': 'http://localhost:8082',
  '/api/v1/collections': 'http://localhost:8082',
  '/api/v1/stories': 'http://localhost:8082',

  // Cart service (port 8083)
  '/api/v1/cart': 'http://localhost:8083',

  // Order service (port 8084)
  '/api/v1/orders': 'http://localhost:8084',

  // Payment service (port 8085)
  '/api/v1/payments': 'http://localhost:8085',

  // Inventory service (port 8086)
  '/api/v1/inventory': 'http://localhost:8086',

  // Pincode service (port 8088)
  '/api/v1/pincode': 'http://localhost:8088',

  // Return service (port 8089)
  '/api/v1/returns': 'http://localhost:8089',

  // Search service (port 8090)
  '/api/v1/search': 'http://localhost:8090',

  // Customer/Addresses (use auth service for now)
  '/api/v1/addresses': 'http://localhost:8081',
  '/api/v1/customer': 'http://localhost:8081',
};

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'local-gateway' });
});

const healthTargets = {
  gateway: `http://localhost:${PORT}/api/v1/health`,
  auth: 'http://localhost:8081/health',
  admin: 'http://localhost:8080/health',
  catalog: 'http://localhost:8082/health',
  order: 'http://localhost:8084/health',
  inventory: 'http://localhost:8086/health',
  returns: 'http://localhost:8089/health',
  support: 'http://localhost:8091/health',
};

app.get('/api/v1/health/:service', async (req, res) => {
  const target = healthTargets[req.params.service];
  if (!target) {
    return res.status(404).json({ success: false, status: 'unknown', service: req.params.service });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
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
