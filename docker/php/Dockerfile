FROM php:8.3-fpm-alpine

# OS deps + PHP extensions (Alpine)
RUN apk add --no-cache \
      bash \
      icu-dev \
      oniguruma-dev \
      postgresql-dev \
      libzip-dev \
      $PHPIZE_DEPS \
  && docker-php-ext-install -j$(nproc) \
      intl mbstring pdo pdo_pgsql zip bcmath opcache

# (optional) Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# (optional) Composer in the image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
