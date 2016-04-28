#!/bin/bash

OWN_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

docker stop speckle-viewer-dev
docker rm -v speckle-viewer-dev
docker build --rm=true -t "local:nodebase" ${OWN_DIR}/nodebase
docker build --rm=true -t "local:speckle-viewer-dev" ${OWN_DIR}/viewer-dev
docker create --name speckle-viewer-dev -p 8080:8080 \
     -v ${OWN_DIR}/../dist:/usr/share/nginx/html \
     -v ${OWN_DIR}/../:/var/www/node \
     local:speckle-viewer-dev
docker start speckle-viewer-dev
echo ""
echo "all done!"
echo ""
