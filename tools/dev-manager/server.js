const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 5050;

app.use(express.json());

const ROOT = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(__dirname, 'public');

const SERVICES = [
  {
    id: 'gateway',
    label: 'Gateway',
    port: 4000,
    healthUrl: 'http://localhost:4000/api/v1/health',
    start: 'node tools/local-gateway.js',
  },
  {
    id: 'frontend',
    label: 'Frontend',
    port: 3000,
    healthUrl: 'http://localhost:3000',
    start: 'npm --workspaces=false --prefix apps/web run dev',
  },
  {
    id: 'auth',
    label: 'Auth Service',
    port: 8081,
    healthUrl: 'http://localhost:8081/health',
    start: 'npm --workspaces=false --prefix services/auth-service run dev',
  },
  {
    id: 'cart',
    label: 'Cart Service',
    port: 8083,
    healthUrl: 'http://localhost:8083/health',
    start: 'npm --workspaces=false --prefix services/cart-service run dev',
  },
  {
    id: 'payment',
    label: 'Payment Service',
    port: 8085,
    healthUrl: 'http://localhost:8085/health',
    start: 'npm --workspaces=false --prefix services/payment-service run dev',
  },
  {
    id: 'notification',
    label: 'Notification Service',
    port: 8087,
    healthUrl: 'http://localhost:8087/health',
    start: 'npm --workspaces=false --prefix services/notification-service run dev',
  },
  {
    id: 'pincode',
    label: 'Pincode Service',
    port: 8088,
    healthUrl: 'http://localhost:8088/health',
    start: 'npm --workspaces=false --prefix services/pincode-service run dev',
  },
  {
    id: 'admin',
    label: 'Admin Service',
    port: 8080,
    healthUrl: 'http://localhost:8080/health',
    start: 'npm --workspaces=false --prefix services/admin-service run dev',
  },
  {
    id: 'catalog',
    label: 'Catalog Service',
    port: 8082,
    healthUrl: 'http://localhost:8082/health',
    start: 'npm --workspaces=false --prefix services/catalog-service run dev',
  },
  {
    id: 'order',
    label: 'Order Service',
    port: 8084,
    healthUrl: 'http://localhost:8084/health',
    start: 'npm --workspaces=false --prefix services/order-service run dev',
  },
  {
    id: 'inventory',
    label: 'Inventory Service',
    port: 8086,
    healthUrl: 'http://localhost:8086/health',
    start: 'npm --workspaces=false --prefix services/inventory-service run dev',
  },
  {
    id: 'returns',
    label: 'Return Service',
    port: 8089,
    healthUrl: 'http://localhost:8089/health',
    start: 'npm --workspaces=false --prefix services/return-service run dev',
  },
  {
    id: 'search',
    label: 'Search Service',
    port: 8090,
    healthUrl: 'http://localhost:8090/health',
    start: 'npm --workspaces=false --prefix services/search-service run dev',
  },
  {
    id: 'support',
    label: 'Support Service',
    port: 8091,
    healthUrl: 'http://localhost:8091/health',
    start: 'npm --workspaces=false --prefix services/support-service run dev',
  },
];

const managed = new Map();
const logs = new Map();
const LOG_LIMIT = 500;

function getService(id) {
  return SERVICES.find((svc) => svc.id === id);
}

async function fetchHealth(service) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(service.healthUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { status: 'down', message: `HTTP ${res.status}` };
    return { status: 'ok' };
  } catch (err) {
    return { status: 'down', message: 'Unreachable' };
  }
}

function startService(service) {
  if (managed.has(service.id)) return managed.get(service.id);
  const child = spawn(service.start, {
    cwd: ROOT,
    shell: true,
    stdio: 'pipe',
  });
  logs.set(service.id, []);
  managed.set(service.id, child);
  if (child.stdout) {
    child.stdout.on('data', (data) => appendLog(service.id, 'stdout', data));
    child.stdout.pipe(process.stdout);
  }
  if (child.stderr) {
    child.stderr.on('data', (data) => appendLog(service.id, 'stderr', data));
    child.stderr.pipe(process.stderr);
  }
  child.on('exit', () => {
    managed.delete(service.id);
    appendLog(service.id, 'system', 'Process exited');
  });
  return child;
}

function appendLog(id, source, data) {
  const entry = `[${new Date().toLocaleTimeString()}] [${source}] ${data.toString().trim()}`;
  const list = logs.get(id) || [];
  list.push(entry);
  if (list.length > LOG_LIMIT) {
    list.splice(0, list.length - LOG_LIMIT);
  }
  logs.set(id, list);
}

async function stopService(service) {
  const child = managed.get(service.id);
  if (child && child.pid) {
    await execPowerShell(`taskkill /PID ${child.pid} /T /F`);
    managed.delete(service.id);
    return { stopped: 'managed' };
  }

  if (service.port) {
    const pid = await execPowerShell(
      `$p = Get-NetTCPConnection -LocalPort ${service.port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess; if ($p) { $p }`
    );
    const parsed = parseInt(pid, 10);
    if (!Number.isNaN(parsed)) {
      await execPowerShell(`Stop-Process -Id ${parsed} -Force`);
      return { stopped: 'external' };
    }
  }
  return { stopped: 'none' };
}

function execPowerShell(command) {
  return new Promise((resolve) => {
    const ps = spawn('powershell', ['-NoProfile', '-Command', command], { shell: false });
    let output = '';
    ps.stdout.on('data', (data) => {
      output += data.toString();
    });
    ps.on('close', () => resolve(output.trim()));
    ps.on('error', () => resolve(''));
  });
}

app.get('/api/services', async (_req, res) => {
  const results = await Promise.all(SERVICES.map(async (svc) => {
    const health = await fetchHealth(svc);
    const proc = managed.get(svc.id);
    return {
      id: svc.id,
      label: svc.label,
      port: svc.port,
      status: health.status,
      message: health.message,
      managed: Boolean(proc),
      pid: proc?.pid ?? null,
    };
  }));

  res.json({ success: true, data: results });
});

app.post('/api/services/batch/start', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ success: false, message: 'Invalid IDs' });
  ids.forEach(id => {
    const service = getService(id);
    if (service) startService(service);
  });
  res.json({ success: true });
});

app.post('/api/services/batch/stop', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ success: false, message: 'Invalid IDs' });
  await Promise.all(ids.map(async id => {
    const service = getService(id);
    if (service) await stopService(service);
  }));
  res.json({ success: true });
});

app.post('/api/services/:id/start', (req, res) => {
  const service = getService(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: 'Unknown service' });
  startService(service);
  res.json({ success: true });
});

app.post('/api/services/:id/stop', async (req, res) => {
  const service = getService(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: 'Unknown service' });
  const result = await stopService(service);
  res.json({ success: true, data: result });
});

app.post('/api/services/:id/restart', async (req, res) => {
  const service = getService(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: 'Unknown service' });
  await stopService(service);
  startService(service);
  res.json({ success: true });
});

app.get('/api/services/:id/logs', (req, res) => {
  const service = getService(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: 'Unknown service' });
  if (!managed.has(service.id)) {
    return res.json({
      success: true,
      data: {
        managed: false,
        logs: ['Logs available only for services started from Dev Manager.'],
      },
    });
  }
  const data = logs.get(service.id) || [];
  res.json({ success: true, data: { managed: true, logs: data } });
});

app.get('/api/services/:id/logs/download', (req, res) => {
  const service = getService(req.params.id);
  if (!service) return res.status(404).send('Unknown service');
  const data = logs.get(service.id) || [];
  const body = data.length ? data.join('\n') : 'No logs captured.';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${service.id}-logs.txt"`);
  res.send(body);
});

app.delete('/api/services/:id/logs', (req, res) => {
  const service = getService(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: 'Unknown service' });
  logs.set(service.id, []);
  res.json({ success: true });
});

app.get('/api/services/logs/download', (_req, res) => {
  const body = SERVICES.map((svc) => {
    const data = logs.get(svc.id) || [];
    const header = `===== ${svc.label} (${svc.id}) =====`;
    const content = data.length ? data.join('\n') : 'No logs captured.';
    return `${header}\n${content}\n`;
  }).join('\n');
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="all-service-logs.txt"');
  res.send(body);
});

app.use(express.static(PUBLIC_DIR));

app.use((_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dev Manager running at http://localhost:${PORT}`);
});
