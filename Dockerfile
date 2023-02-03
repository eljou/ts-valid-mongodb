FROM node:10-alpine as base

RUN mkdir -p /app
WORKDIR /app

FROM base as prebuild

COPY package*.json /app/
COPY .env tsconfig.json /app/

RUN npm install --quiet --pure-lockfile

COPY src /app/src

RUN npm run build

FROM base as production

# Update System and install Dependencies
RUN apk upgrade --no-cache
RUN apk add --no-cache --update-cache wget curl

COPY --from=prebuild /app/.env /app
COPY --from=prebuild /app/package*.json /app/
RUN npm install --quiet --production
COPY --from=prebuild /app/build /app/build

EXPOSE 80

CMD [ "npm", "run", "start:build" ]
