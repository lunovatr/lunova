# Lunova Backend - Development/Test Dockerfile
#
# Üretim (production) için optimize edilmemiştir (multi-stage değildir, runserver kullanır).
# Amaç: lokal test/entegrasyon ortamı için hızlı ve tekrarlanabilir bir kurulum.

FROM python:3.12-slim

# psycopg2 (non-binary paket requirements.txt'te de var) derlemek için gerekli
# sistem paketleri. psycopg2-binary zaten kendi libpq'sunu taşır ama psycopg2
# (saf paket) pg_config + bir C derleyicisi + standart C header'ları
# (stdlib.h vb.) olmadan derlenemez. Sadece "gcc" kurmak yetmiyor çünkü
# python:slim (Debian) imajında libc6-dev (standart header'lar) otomatik
# gelmiyor - build-essential bunu garantili şekilde birlikte getiriyor.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
