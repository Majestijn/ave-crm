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

# PHP upload limits configuration
RUN echo "upload_max_filesize = 20M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 25M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 60" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

# (optional) Composer in the image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
