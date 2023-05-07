# base image
FROM node:14-alpine

# set working directory
WORKDIR /app

# copy package.json and package-lock.json files
COPY package*.json ./

# install dependencies
RUN npm install

# copy app files
COPY . .

# build app
RUN npm run build

# set production environment
ENV NODE_ENV=production

# expose port
EXPOSE 3000

# start app
CMD ["npm", "start"]
