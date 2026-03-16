# Use an official Node.js runtime as a parent image
FROM node:20-bookworm-slim

# Set the working directory
WORKDIR /app

# Install Python 3, pip, and venv
# bookworm-slim includes python3 but maybe not venv/pip by default
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Create and activate a virtual environment for Python
# We put it in /opt/venv and add it to PATH so 'python3' and 'pip' commands use it automatically
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy package files first for better caching
COPY package.json package-lock.json* ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm install

# Install Python dependencies inside the venv
RUN pip install -r requirements.txt

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# This will generate the .next folder
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "start"]
