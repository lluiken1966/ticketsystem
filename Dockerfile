FROM node:20-slim

# Install Oracle Instant Client dependencies
RUN apt-get update && apt-get install -y \
    libaio1 \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV TNS_ADMIN=/app/wallet

CMD ["npm", "start"]
