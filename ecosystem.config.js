module.exports = {
  apps: [
    {
      name: 'wab-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      autorestart: true,
    },
    {
      name: 'wab-redaction',
      cwd: './apps/redaction',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001 -H 127.0.0.1',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '384M',
      autorestart: true,
    },
    {
      name: 'wab-cms',
      cwd: './apps/cms',
      script: 'node_modules/@strapi/strapi/bin/strapi.js',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 8090,
      },
      max_memory_restart: '1G',
      autorestart: true,
    },
  ],
};
