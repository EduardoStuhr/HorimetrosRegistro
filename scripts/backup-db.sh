#!/bin/bash
# ========================================================
# TRANSJAP — Rotina de Backup Diário do PostgreSQL
# ========================================================
set -e

BACKUP_DIR="/var/backups/transjap"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/transjap_horimetro_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="transjap-postgres"
DB_USER="transjap_admin"
DB_NAME="transjap_horimetro"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Iniciando backup do banco de dados TRANSJAP em ${TIMESTAMP}..."

# Executa pg_dump dentro do container Docker e comprime com gzip
docker exec -t ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "${BACKUP_FILE}"

echo "[SUCESSO] Backup concluído com sucesso: ${BACKUP_FILE}"
echo "[INFO] Tamanho do arquivo: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Mantém apenas os backups dos últimos 30 dias (rotação)
find "${BACKUP_DIR}" -name "transjap_horimetro_*.sql.gz" -mtime +30 -exec rm {} \;
echo "[INFO] Rotação executada. Backups antigos com mais de 30 dias foram descartados."
