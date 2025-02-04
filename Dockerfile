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

# Create a non-root user and give ownership of the /app directory
RUN useradd -m nonuser && \
    mkdir -p /app/pipeline /app/cookies && \
    chown -R nonuser:nonuser /app

# Switch to non-root user
USER nonuser


# Ensure the directories exist and have the correct permissions
RUN mkdir -p /app/pipeline /app/cookies && \
    chmod -R 755 /app

# Command to run the application
CMD ["node", "src/twitter/index.js"]