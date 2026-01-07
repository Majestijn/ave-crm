#!/bin/sh

set -e


echo "Fixing Laravel folder permissions..."


cd /var/www/html


#zorg dat alle mappen bestaan
mkdir -p storage/framework/{cache,sessions,testing,views}
mkdir -p storage/logs
mkdir -p bootstrap/cache

#zet eigenaar op www-data
chown -R www-data:www-data storage bootstrap/cache

chmod -R 775 storage bootstrap/cache

echo "Permissions fixed!"
