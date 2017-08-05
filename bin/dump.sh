#!/bin/bash

docker-compose exec --user www-data mariadb mysqldump wordpress --user=wordpress --password=password --result-file=/tmp/dump.sql
