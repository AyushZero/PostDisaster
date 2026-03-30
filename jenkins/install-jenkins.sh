#!/bin/bash
# =============================================================================
# Jenkins + Docker Installation Script for AWS EC2 (Amazon Linux 2023 / Ubuntu)
# Run this script on your EC2 instance after SSH'ing in
# =============================================================================

set -e

echo "=========================================="
echo "🚀 Jenkins + Docker Installation Script"
echo "=========================================="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
fi

echo "Detected OS: $OS"

# =============================================================================
# Install Docker
# =============================================================================
echo ""
echo "📦 Installing Docker..."

if [ "$OS" = "amzn" ]; then
    # Amazon Linux 2023
    sudo dnf update -y
    sudo dnf install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
elif [ "$OS" = "ubuntu" ]; then
    # Ubuntu
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ubuntu
else
    echo "Unsupported OS. Please install Docker manually."
    exit 1
fi

echo "✅ Docker installed successfully!"

# =============================================================================
# Install Jenkins
# =============================================================================
echo ""
echo "📦 Installing Jenkins..."

if [ "$OS" = "amzn" ]; then
    # Amazon Linux 2023
    sudo dnf install -y java-17-amazon-corretto
    sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
    sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
    sudo dnf install -y jenkins
elif [ "$OS" = "ubuntu" ]; then
    # Ubuntu
    sudo apt-get install -y fontconfig openjdk-17-jre
    sudo wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
    echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y jenkins
fi

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Add Jenkins user to docker group
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

echo "✅ Jenkins installed successfully!"

# =============================================================================
# Install Git
# =============================================================================
echo ""
echo "📦 Installing Git..."

if [ "$OS" = "amzn" ]; then
    sudo dnf install -y git
elif [ "$OS" = "ubuntu" ]; then
    sudo apt-get install -y git
fi

echo "✅ Git installed successfully!"

# =============================================================================
# Print Summary
# =============================================================================
echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Get Jenkins initial admin password:"
echo "   sudo cat /var/lib/jenkins/secrets/initialAdminPassword"
echo ""
echo "2. Access Jenkins at:"
echo "   http://<your-ec2-public-ip>:8080"
echo ""
echo "3. Configure Security Group to allow:"
echo "   - Port 8080 (Jenkins)"
echo "   - Port 3000 (Your Application)"
echo "   - Port 22 (SSH)"
echo ""
echo "4. IMPORTANT: Log out and back in for docker group to take effect"
echo "   Or run: newgrp docker"
echo ""
