#!/bin/bash

# Stoping the container
sudo docker stop prompt-builder

# Removing the container
sudo docker rm prompt-builder

## Running the build script again to rebuild the image
sudo ./docker-build.sh