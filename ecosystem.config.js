module.exports = {
  apps: [
    {
      name: 'boiler-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: {
        PORT: 3838,
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'boiler-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      env: {
        PORT: 3939,
        NODE_ENV: 'production',
      },
      instances: 1, // Single instance for shared VPS
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
