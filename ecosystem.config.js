module.exports = {
  apps: [
    {
      name: 'wab-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
    },
    {
      name: 'wab-cms',
      cwd: './apps/cms',
      script: 'node_modules/@strapi/strapi/bin/strapi.js',
      args: 'start',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1G',
    },
  ],
};
