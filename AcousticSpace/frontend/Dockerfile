# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package configuration files
COPY package.json package-lock.json ./

# Install dependencies using clean install
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

# Define build-time argument for the backend API URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Compile Vite assets into static files
RUN npm run build

# Stage 2: Serve static files using Nginx
FROM nginx:stable-alpine

# Copy custom Nginx configuration to support SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from build stage to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
