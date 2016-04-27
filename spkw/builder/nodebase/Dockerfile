FROM node:5.7

MAINTAINER Alex Kotenko <alexykot@gmail.com>

ENV TERM xterm
ENV DEBIAN_FRONTEND noninteractive

#system the way I like it
RUN echo "\n\n#sid unstable \n deb http://ftp.uk.debian.org/debian unstable main contrib " >> /etc/apt/sources.list
RUN echo "Package: *\nPin: release a=jessie\nPin-Priority: 700\n\nPackage: * \nPin: release a=unstable\nPin-Priority: 50\n\n" > /etc/apt/preferences
RUN apt-get update -qq && apt-get upgrade -y -qq
RUN apt-get install -y -qq mc git unzip man curl rsync wget apt-utils build-essential

#workaround for https://github.com/npm/npm/issues/9863
RUN rm -rf /usr/local/lib/node_modules/npm \
 && git clone https://github.com/DIREKTSPEED-LTD/npm /usr/local/lib/node_modules/npm \
 && rm -rf /usr/local/lib/node_modules/npm/.git \
 && rm -f  /usr/bin/npm \
 && ln -s -f /usr/local/bin/npm /usr/bin/npm \
 && cd /usr/local/lib/node_modules/npm \
 && npm install

#cleanup
RUN apt-get update -qq && apt-get autoclean -qq && apt-get clean -qq && apt-get autoremove -qq
