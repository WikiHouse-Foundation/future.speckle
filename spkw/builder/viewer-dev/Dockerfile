FROM local:nodebase

#nginx
RUN echo "deb http://nginx.org/packages/debian/ squeeze nginx\n\ndeb-src http://nginx.org/packages/debian/ squeeze nginx\n\n" > /etc/apt/sources.list.d/nginx.list
RUN curl -sL http://nginx.org/packages/keys/nginx_signing.key | apt-key add -
RUN apt-get update -qq
RUN apt-get install -t unstable -y nginx-full nginx-common
COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /var/www/node/dist
RUN ln -s /var/www/node/dist /usr/share/nginx/html

WORKDIR /var/www/node
CMD /var/www/node/builder/viewer-dev/builderStart.sh
