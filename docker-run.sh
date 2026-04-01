#!/bin/bash
# Make sure you update the Dockerfile file with the host name 0.0.0.0 env variable and the data directory to /app/data before running this script
# Exit immediately if a command exits with a non-zero status
set -euo pipefail

# This uses a volume to externalize the data
sudo docker run -d -p 3002:3000 --mount type=volume,src=prompt-builder,dst=/app/data --name prompt-builder --env-file .env localhost/prompt-builder 