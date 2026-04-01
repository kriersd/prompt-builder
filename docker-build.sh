#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -euo pipefail

IMAGE_NAME="localhost/prompt-builder"
TAG="latest"
# The dot (.) specifies that the Dockerfile is in the current directory
docker build -t "${IMAGE_NAME}:${TAG}" .

echo "Successfully built Docker image: ${IMAGE_NAME}:${TAG}"