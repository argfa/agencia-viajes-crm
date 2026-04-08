module.exports = {
  apps: [
    {
      name: 'playa-camp-crm',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max', // Utilizar todos los nucleos del CPU
      exec_mode: 'cluster', // Modo cluster para balanceo de carga
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'prisma-admin',
      script: 'npm',
      args: 'run db:admin',
      autorestart: true,
      watch: false
    }
  ]
};
