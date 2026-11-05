// PM2 process file. Usage (on the VPS): pm2 start deploy/ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'nimbus-api',
      cwd: '/opt/nimbus/back',
      script: 'dist/main.js',
      // The API reads /opt/nimbus/back/.env (NODE_ENV=production, secrets, DATABASE_URL...).
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '350M',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
    },
  ],
}
