#!/bin/bash
# Backup Script Automático - Beach Camp CRM
SOURCE="/var/www/agencia-viajes-crm/prisma/dev.db"
DEST_DIR="/var/www/agencia-viajes-crm/backups_db"

# Asegurar que el directorio de respaldos exista
mkdir -p "$DEST_DIR"

DATE=$(date +'%Y-%m-%d_%H-%M')
FILENAME="db_backup_$DATE.sqlite"

cp "$SOURCE" "$DEST_DIR/$FILENAME"

# Rotación de respaldos: Elimina los que tengan más de 30 días para ahorrar disco
find "$DEST_DIR" -type f -name "*.sqlite" -mtime +30 -exec rm {} \;

echo "[$(date)] Respaldo completado: $DEST_DIR/$FILENAME"
