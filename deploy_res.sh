#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
PASS="argfarfan11"
sudo_cmd() { echo "$PASS" | sudo -S "$@"; }

cd /var/www/agencia-viajes-crm

echo "==> Reactivando... Generando motor de base de datos..."
npx prisma generate
echo "==> Sincronizando base de datos (limpia)..."
npx prisma db push --accept-data-loss

echo "==> Compilando Next.js para producción..."
rm -rf .next
npm run build

echo "==> Iniciando / Reiniciando Servidor con PM2..."
pm2 restart playa-camp-crm || pm2 start ecosystem.config.js --env production
pm2 save

echo "==> Configurando PM2 para auto-arranque..."
sudo_cmd env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true

echo "==========================================="
echo "   🚀 ¡DESPLIEGUE FINALIZADO EXISTOSAMENTE!  "
echo "   Puedes acceder en: http://192.168.1.3:3000"
echo "==========================================="
