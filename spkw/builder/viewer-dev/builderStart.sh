service nginx restart

if [ ! -d "/var/www/node/node_modules" ]; then
    npm install
fi

npm run watch