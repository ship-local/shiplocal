/** PM2 config for the ShipLocal dashboard (production). */
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'shiplocal-dashboard',
      cwd: repoRoot,
      script: 'pnpm',
      args: '--filter @shiplocal/dashboard start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
