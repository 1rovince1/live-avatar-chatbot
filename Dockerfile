# Use official Python runtime as a parent image
FROM python:3.12-slim

# Install FFmpeg and tools needed to download Rhubarb
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download and setup the Linux version of Rhubarb Lip Sync
WORKDIR /opt
RUN wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip \
    && unzip rhubarb-lip-sync-1.13.0-linux.zip \
    && mv Rhubarb-Lip-Sync-1.13.0-Linux rhubarb \
    && rm rhubarb-lip-sync-1.13.0-linux.zip

# Set the working directory for the app
WORKDIR /app

# Copy the requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create the generated directory and give it wide-open permissions
RUN mkdir -p generated && chmod 777 generated

# Tell the Python app where to find the Rhubarb binary we downloaded earlier
ENV RHUBARB_PATH="/opt/rhubarb/rhubarb"

# Change to the backend directory to run the server
WORKDIR /app/backend

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the application using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8015", "--reload"]