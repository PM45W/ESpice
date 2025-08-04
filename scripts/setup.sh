#!/bin/bash

# ESpice Quick Setup Script for Linux/macOS
# This script automates the setup process for new developers

echo "🚀 ESpice Quick Setup Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
echo -e "${YELLOW}Checking Node.js...${NC}"
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
    
    # Check if version is 18 or higher
    VERSION=$(echo $NODE_VERSION | sed 's/v//')
    MAJOR_VERSION=$(echo $VERSION | cut -d. -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version 18 or higher required. Current: $VERSION${NC}"
        echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Check if Rust is installed
echo -e "${YELLOW}Checking Rust...${NC}"
if command_exists rustc; then
    RUST_VERSION=$(rustc --version)
    echo -e "${GREEN}✅ Rust found: $RUST_VERSION${NC}"
else
    echo -e "${RED}❌ Rust not found${NC}"
    echo -e "${YELLOW}Installing Rust...${NC}"
    
    # Install Rust using rustup
    if command_exists curl; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source ~/.cargo/env
        echo -e "${GREEN}✅ Rust installed successfully${NC}"
    else
        echo -e "${RED}❌ curl not found. Please install curl or Rust manually${NC}"
        echo -e "${YELLOW}Visit https://rustup.rs/ for manual installation${NC}"
        exit 1
    fi
fi

# Check if npm is available
echo -e "${YELLOW}Checking npm...${NC}"
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Install system dependencies based on OS
echo -e "${YELLOW}Checking system dependencies...${NC}"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command_exists apt; then
        # Ubuntu/Debian
        echo -e "${YELLOW}Installing Ubuntu/Debian dependencies...${NC}"
        sudo apt update
        sudo apt install -y build-essential libssl-dev pkg-config
    elif command_exists dnf; then
        # Fedora
        echo -e "${YELLOW}Installing Fedora dependencies...${NC}"
        sudo dnf install -y gcc-c++ openssl-devel
    elif command_exists yum; then
        # CentOS/RHEL
        echo -e "${YELLOW}Installing CentOS/RHEL dependencies...${NC}"
        sudo yum install -y gcc-c++ openssl-devel
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if ! command_exists xcode-select; then
        echo -e "${YELLOW}Installing Xcode Command Line Tools...${NC}"
        xcode-select --install
    fi
fi

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
    exit 1
fi

# Build Rust dependencies
echo -e "${YELLOW}Building Rust dependencies...${NC}"
if cd src-tauri && cargo build && cd ..; then
    echo -e "${GREEN}✅ Rust dependencies built${NC}"
else
    echo -e "${RED}❌ Failed to build Rust dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo "================================"
echo -e "${CYAN}To start the application, run:${NC}"
echo -e "  ${YELLOW}npm run tauri:dev${NC}"
echo ""
echo -e "${CYAN}For development, you can also run:${NC}"
echo -e "  ${YELLOW}npm run dev${NC}"
echo "" 