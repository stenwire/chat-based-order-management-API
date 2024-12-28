FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy rest of the application
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:dev"]