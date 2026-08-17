#!/bin/sh
set -e

echo "[backend] Migrasyonlar uygulanıyor..."
python manage.py migrate --noinput

echo "[backend] Django development server başlatılıyor (0.0.0.0:8000)..."
exec python manage.py runserver 0.0.0.0:8000
