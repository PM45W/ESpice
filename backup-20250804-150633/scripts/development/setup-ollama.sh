#!/bin/bash

# ESpice Ollama Setup Script for macOS/Linux
# This script automates the installation and setup of Ollama for ESpice

echo "🚀 ESpice Ollama Setup Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Check if Ollama is already installed
echo -e "${YELLOW}Checking if Ollama is already installed...${NC}"
if command -v ollama &> /dev/null; then
    OLLAMA_VERSION=$(ollama --version 2>/dev/null)
    echo -e "${GREEN}✅ Ollama is already installed: $OLLAMA_VERSION${NC}"
    ALREADY_INSTALLED=true
else
    ALREADY_INSTALLED=false
fi

if [ "$ALREADY_INSTALLED" = false ]; then
    echo -e "${YELLOW}Installing Ollama...${NC}"
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo -e "${CYAN}Detected macOS, installing via Homebrew...${NC}"
        if command -v brew &> /dev/null; then
            brew install ollama
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Ollama installed successfully via Homebrew${NC}"
            else
                echo -e "${RED}❌ Homebrew installation failed${NC}"
                echo -e "${YELLOW}Please install Ollama manually:${NC}"
                echo -e "${CYAN}1. Visit https://ollama.ai/download${NC}"
                echo -e "${CYAN}2. Download the macOS installer${NC}"
                echo -e "${CYAN}3. Run the installer${NC}"
                echo -e "${CYAN}4. Restart this script${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Homebrew not found${NC}"
            echo -e "${YELLOW}Please install Homebrew first:${NC}"
            echo -e "${CYAN}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo -e "${CYAN}Detected Linux, installing via curl...${NC}"
        curl -fsSL https://ollama.ai/install.sh | sh
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Ollama installed successfully${NC}"
        else
            echo -e "${RED}❌ Installation failed${NC}"
            echo -e "${YELLOW}Please install Ollama manually:${NC}"
            echo -e "${CYAN}1. Visit https://ollama.ai/download${NC}"
            echo -e "${CYAN}2. Follow the Linux installation instructions${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported operating system${NC}"
        exit 1
    fi
fi

# Check if Ollama is running
echo -e "${YELLOW}Checking if Ollama server is running...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama server is already running${NC}"
    SERVER_RUNNING=true
else
    echo -e "${YELLOW}Starting Ollama server...${NC}"
    SERVER_RUNNING=false
fi

if [ "$SERVER_RUNNING" = false ]; then
    # Start Ollama in background
    nohup ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    
    # Wait for server to start
    echo -e "${YELLOW}Waiting for Ollama server to start...${NC}"
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Ollama server started successfully${NC}"
            SERVER_RUNNING=true
            break
        fi
        ATTEMPT=$((ATTEMPT + 1))
        sleep 1
        echo -e "${GRAY}Attempt $ATTEMPT/$MAX_ATTEMPTS...${NC}"
    done
    
    if [ "$SERVER_RUNNING" = false ]; then
        echo -e "${RED}❌ Server failed to start within 30 seconds${NC}"
        echo -e "${YELLOW}Please start it manually by running: ollama serve${NC}"
        exit 1
    fi
fi

# Check for available models
echo -e "${YELLOW}Checking available models...${NC}"
MODELS_RESPONSE=$(curl -s http://localhost:11434/api/tags 2>/dev/null)
if [ $? -eq 0 ]; then
    MODEL_COUNT=$(echo "$MODELS_RESPONSE" | jq '.models | length' 2>/dev/null || echo "0")
    
    if [ "$MODEL_COUNT" = "0" ] || [ "$MODEL_COUNT" = "null" ]; then
        echo -e "${YELLOW}No models found. Downloading default model...${NC}"
        echo -e "${CYAN}This may take several minutes depending on your internet connection...${NC}"
        
        # Pull default model
        ollama pull llama3.1:8b
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Default model downloaded successfully${NC}"
        else
            echo -e "${RED}❌ Failed to download default model${NC}"
            echo -e "${YELLOW}You can download models manually using: ollama pull <model-name>${NC}"
        fi
    else
        echo -e "${GREEN}✅ Found $MODEL_COUNT model(s):${NC}"
        echo "$MODELS_RESPONSE" | jq -r '.models[].name' 2>/dev/null | while read -r model; do
            echo -e "${CYAN}  - $model${NC}"
        done
    fi
else
    echo -e "${RED}❌ Failed to check models${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Ollama setup completed!${NC}"
echo -e "${CYAN}You can now use ESpice with enhanced LLM processing.${NC}"
echo ""
echo -e "${YELLOW}To manage Ollama models:${NC}"
echo -e "${GRAY}  - List models: ollama list${NC}"
echo -e "${GRAY}  - Pull new model: ollama pull <model-name>${NC}"
echo -e "${GRAY}  - Remove model: ollama rm <model-name>${NC}"
echo ""
echo -e "${GRAY}Press any key to exit...${NC}"
read -n 1 -s 