FROM node:12.13.1

WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4000
CMD [ "npm", "run", "start" ]
