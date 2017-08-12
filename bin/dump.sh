#!/bin/bash

docker-compose exec --user www-data mariadb mysqldump wordpress --user=wordpress --password=password --result-file=/tmp/$(date "+%Y-%m-%d_%H-%M-%S")-wp-dump.sql
