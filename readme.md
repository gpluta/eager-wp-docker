WP development env with docker-compose.

Based on [https://github.com/10up/wp-local-docker](https://github.com/10up/wp-local-docker)

php-fpm, nginx, MySQL // TODO replace MySQL with MariaDB

```bash
docker-compose up
./bin/setup.sh
```

Serves phpfpm containers' port 80 to our localhost:80

Notes:
Keeps yout MySQL data secure on a `./data` volume.
Mounts /var/www/html to `./wordpress` volume.
Store your source assets in `./assets-src`
Includes phpunit and wp-cli

Commands:
```bash
gulp dist #builds the frontend stuff in dev mode
gulp dist -p #builds the project in prod mode
gulp clean #empties the dist dir
gulp #launches watch mode along with browser sync on localhost:3000 - proxies localhost:80 to enable live reload etc
```

Check out `./docker-compose.yml`,`./gulpfile.js` and `./dockerfiles` to learn more about the setup.
