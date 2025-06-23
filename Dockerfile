# Use the official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the application code
COPY . .

# Expose app port (change to your app's port if different)
EXPOSE 3000

# Set environment variable for production
# ENV NODE_ENV=production

# Start the app
CMD ["node", "index.js"]
