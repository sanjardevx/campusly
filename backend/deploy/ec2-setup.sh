#!/usr/bin/env bash
# One-time setup of a fresh EC2 box (Ubuntu 24.04 LTS, arm64 / t4g.small).
# What lessons 159–161 and 166 did by hand: swap, firewall, Docker — in one script.
# Safe to run again: every step checks first.
#
#   sudo bash ec2-setup.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash $0" >&2
  exit 1
fi
APP_USER=${SUDO_USER:-ubuntu}
export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl git ufw unzip

# 2 GB RAM is tight for `docker compose build` (pnpm install + webpack): swap stops the
# kernel from killing the build. swappiness 10 = use swap only when RAM is really full.
echo "==> 2 GB swap"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -q --system

# Lesson 161. The AWS Security Group is the outer firewall; UFW is the second one on the box.
# Docker publishes only Caddy's 80/443 (api and redis have no "ports"), so nothing else is open.
echo "==> UFW firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp   # HTTP: Let's Encrypt check + redirect to HTTPS
ufw allow 443/tcp  # HTTPS
ufw allow 443/udp  # HTTP/3 (Caddy)
ufw --force enable

# Lesson 166. Docker Engine + the compose plugin from Docker's own apt repository.
echo "==> Docker"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck disable=SC1091 # /etc/os-release exists on the server
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker # starts again after a reboot
usermod -aG docker "$APP_USER" # docker without sudo (after the next login)

# Reads the secrets from SSM Parameter Store with the EC2 IAM role (no access keys)
echo "==> AWS CLI"
command -v aws >/dev/null || snap install aws-cli --classic

echo
echo "Done. Log out and back in (docker group), then check:"
echo "  free -h            # Swap: 2.0Gi"
echo "  sudo ufw status    # 22, 80, 443 allowed"
echo "  docker compose version"
echo "  aws sts get-caller-identity   # shows the campusly-ec2 role"
