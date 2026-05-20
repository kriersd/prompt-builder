#!/bin/bash
cp .env ../.env-saved
cd ..
rm -Rf prompt-builder
gh repo clone kriersd/prompt-builder
mv ./env-saved ./prompt-builder/.env
cd prompt-builder
