FROM node:19-alpine

WORKDIR /app

# Copy all files
COPY . .

RUN npm install

CMD ["node", "index.js"]
