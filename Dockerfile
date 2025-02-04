# Use Node.js 20 as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Create a non-root user
RUN useradd -m nonuser && \
    chown -R nonuser:nonuser /app
USER nonuser


# Command to run the application
CMD ["node", "src/twitter/index.js"]