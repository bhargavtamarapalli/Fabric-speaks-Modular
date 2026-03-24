const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const servicesDir = path.resolve(__dirname, '../services');
const rootEnv = path.resolve(__dirname, '../.env');
const sharedDir = path.resolve(__dirname, '../shared');

const servicePorts = {
  'admin-service': 8080,
  'auth-service': 8081,
  'catalog-service': 8082,
  'cart-service': 8083,
  'order-service': 8084,
  'payment-service': 8085,
  'inventory-service': 8086,
  'notification-service': 8087,
  'pincode-service': 8088,
  'return-service': 8089,
  'search-service': 8090,
  'support-service': 8091
};

function setup() {
  console.log('--- Setting up shared module and environment files ---');

  // 1. Build shared module
  console.log('Building shared module...');
  try {
    execSync('npm run build --workspace=shared', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to build shared module. Continuing anyway...');
  }

  const services = fs.readdirSync(servicesDir).filter(f => 
    fs.statSync(path.join(servicesDir, f)).isDirectory()
  );

  services.forEach(service => {
    const servicePath = path.join(servicesDir, service);
    const targetFsDir = path.join(servicePath, 'node_modules/@fs');
    const targetSharedDir = path.join(targetFsDir, 'shared');
    const serviceEnv = path.join(servicePath, '.env');

    console.log(`Setting up ${service}...`);

    // Create service-specific .env if it doesn't exist
    if (!fs.existsSync(serviceEnv)) {
      console.log(`Creating .env for ${service}...`);
      const port = servicePorts[service] || 8099;
      fs.writeFileSync(serviceEnv, `APP_PORT=${port}\nNODE_ENV=development\n`);
    } else {
      // Standardize PORT= to APP_PORT= in existing .env
      let content = fs.readFileSync(serviceEnv, 'utf8');
      if (content.includes('PORT=') && !content.includes('APP_PORT=')) {
        console.log(`Standardizing PORT to APP_PORT in ${service}/.env`);
        content = content.replace(/^PORT=/m, 'APP_PORT=');
        fs.writeFileSync(serviceEnv, content);
      }
    }

    // Create @fs directory if it doesn't exist
    if (!fs.existsSync(targetFsDir)) {
      fs.mkdirSync(targetFsDir, { recursive: true });
    }

    // copy root .env to @fs directory (fallback)
    if (fs.existsSync(rootEnv)) {
      fs.copyFileSync(rootEnv, path.join(targetFsDir, '.env'));
    }

    // sync shared build to node_modules/@fs/shared
    if (fs.existsSync(sharedDir)) {
      try {
        if (!fs.existsSync(targetSharedDir)) {
            fs.mkdirSync(targetSharedDir, { recursive: true });
        }
        execSync(`xcopy "${sharedDir}" "${targetSharedDir}" /E /I /Y /Q`, { stdio: 'ignore' });
      } catch (e) {
        console.error(`Failed to copy shared to ${service}: ${e.message}`);
      }
    }
  });

  console.log('--- Setup complete! ---');
}

setup();
