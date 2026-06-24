#!/bin/bash

# Stoping the container
sudo podman stop prompt-builder

# Removing the container
sudo podman rm prompt-builder

## Running the build script again to rebuild the image
sudo ./podman-build.sh