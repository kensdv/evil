#!/bin/bash

# Change directory to evilginx.modified/bin
cd evilginx.modified/bin || { echo "Directory not found"; exit 1; }

# Execute the evilginx command with the specified parameters
./evilginx -p ../phishlets

# Indicate the script has finished
echo "evilginx executed with phishlets"
