#!/bin/bash

# Disable and stop systemd-resolved
echo "Disabling and stopping systemd-resolved..."
systemctl disable systemd-resolved
systemctl stop systemd-resolved

# Stop Apache2 and Nginx services
echo "Stopping Apache2 and Nginx services..."
systemctl stop apache2.service
systemctl stop nginx.service

# Modify /etc/resolv.conf to use Google's DNS server
echo "Changing nameserver to 8.8.8.8 in /etc/resolv.conf..."
cat <<EOL > /etc/resolv.conf
nameserver 8.8.8.8
EOL

# Ensure Apache2, Nginx, and systemd-resolved are stopped
echo "Ensuring ports 80, 443, and 53 are cleared..."
systemctl stop apache2.service
systemctl stop nginx.service
systemctl stop systemd-resolved.service

# Set capabilities for evilginx modified binary
echo "Setting capabilities for evilginx modified binary..."
setcap CAP_NET_BIND_SERVICE=+eip /root/evilginx.modified/bin/evilginx

echo "Setup completed."
