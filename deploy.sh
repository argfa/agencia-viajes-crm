#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
PASS="argfarfan11"

# Alias para simplificar el sudo con contraseña
sudo_cmd() {
  echo "$PASS" | sudo -S "$@"
}

echo "==> Actualizando paquetes base..."
sudo_cmd apt-get update -y

echo "==> Instalando Node.js (v20) y utilidades..."
if ! command -v npm &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo_cmd -E bash -
    sudo_cmd apt-get install -y nodejs npm
fi
sudo_cmd apt-get install -y git

echo "==> Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo_cmd npm install -g pm2
fi

echo "==> Configurando el directorio de la aplicación..."
sudo_cmd mkdir -p /var/www
sudo_cmd chown -R $USER:$USER /var/www
cd /var/www

if [ -d "agencia-viajes-crm" ]; then
  echo "==> Respaldando Base de Datos Activa PREVIO a sincronización..."
  sudo_cmd mkdir -p /var/www/agencia-viajes-crm/backups_db
  BACKUP_FILE="/var/www/agencia-viajes-crm/backups_db/pre_deploy_$(date +%Y%m%d_%H%M%S).db"
  if [ -f "agencia-viajes-crm/prisma/dev.db" ]; then
    cp agencia-viajes-crm/prisma/dev.db "$BACKUP_FILE"
    echo "✔ Respaldo pre-despliegue guardado seguro."
  fi

  echo "==> Repositorio detectado. Actualizando código..."
  cd agencia-viajes-crm
  git reset --hard HEAD
  git pull origin main
else
  echo "==> Clonando el repositorio..."
  git clone https://github.com/argfa/agencia-viajes-crm.git
  cd agencia-viajes-crm
fi

echo "==> Instalando librerías (npm install)..."
npm install

echo "==> Ejecutando capa de migración segura..."
  
  # Si el schema ya fue migrado alguna vez, este bloque fallará inofensivamente (|| true)
  echo "💉 Inyectando migración de esquema SQLite (Preveniendo barrido de Prisma)..."
  sudo_cmd apt-get install -y sqlite3
  sqlite3 prisma/dev.db <<EOF || true
ALTER TABLE ClientRecord RENAME COLUMN fecha TO fecha_salida;
ALTER TABLE ClientRecord ADD COLUMN fecha_retorno DATETIME DEFAULT CURRENT_TIMESTAMP;
UPDATE ClientRecord SET fecha_retorno = fecha_salida;
ALTER TABLE ClientRecord ADD COLUMN edad INTEGER;
EOF

echo "==> Generando motor de base de datos..."
npx prisma generate
echo "==> Sincronizando base de datos (resolución final segura)..."
npx prisma db push --accept-data-loss

echo "==> Configurando Auto-Respaldo (CronJob)..."
chmod +x backup.sh
(crontab -l 2>/dev/null | grep -v backup.sh ; echo "59 23 * * * /var/www/agencia-viajes-crm/backup.sh >> /var/www/agencia-viajes-crm/backups_db/cron.log 2>&1") | crontab -

echo "==> Compilando Next.js para producción..."
rm -rf .next
npm run build

echo "==> Iniciando / Reiniciando Servidor con PM2..."
pm2 restart ecosystem.config.js --env production
pm2 save

echo "==> Configurando PM2 para auto-arranque..."
sudo_cmd env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true

echo "==========================================="
echo "   🚀 ¡DESPLIEGUE FINALIZADO EXISTOSAMENTE!  "
echo "   Puedes acceder en: http://192.168.1.3:3000"
echo "==========================================="
