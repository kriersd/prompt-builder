#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -euo pipefail

IMAGE_NAME="localhost/prompt-builder"
TAG="latest"
# The dot (.) specifies that the Dockerfile is in the current directory
podman build --no-cache -t "${IMAGE_NAME}:${TAG}" .

echo "Successfully built Podman image: ${IMAGE_NAME}:${TAG}"