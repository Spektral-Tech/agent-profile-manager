#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  agp — Agent Profile Manager${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ensure ~/.local/bin exists
mkdir -p ~/.local/bin

# Function to install from source
install_from_source() {
    echo -e "${YELLOW}Cloning agp repository...${NC}"

    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT

    # Clone the repository
    if git clone --depth 1 https://github.com/Spektral-Tech/agent-profile-manager.git "$TEMP_DIR" 2>/dev/null; then
        echo -e "${GREEN}✓ Repository cloned${NC}"
    else
        echo -e "${RED}✗ Failed to clone repository${NC}"
        exit 1
    fi

    # Copy agp script
    if [ -f "$TEMP_DIR/agp" ]; then
        cp "$TEMP_DIR/agp" ~/.local/bin/agp
        chmod +x ~/.local/bin/agp
        echo -e "${GREEN}✓ Script installed to ~/.local/bin/agp${NC}"
    else
        echo -e "${RED}✗ agp script not found in repository${NC}"
        exit 1
    fi
}

# Function to download binary directly
download_binary() {
    echo -e "${YELLOW}Downloading agp binary...${NC}"

    RELEASE_URL="https://github.com/Spektral-Tech/agent-profile-manager/releases/latest/download/agp-macos"

    if curl -fL "$RELEASE_URL" -o ~/.local/bin/agp 2>/dev/null; then
        chmod +x ~/.local/bin/agp
        echo -e "${GREEN}✓ Binary downloaded to ~/.local/bin/agp${NC}"
    else
        echo -e "${RED}✗ Failed to download binary${NC}"
        echo -e "${YELLOW}Falling back to clone method...${NC}"
        install_from_source
        return
    fi
}

# Main prompt
echo -e "${BLUE}How would you like to install agp?${NC}"
echo ""
echo "  1) Clone repository and use source"
echo "  2) Download pre-built binary (faster)"
echo ""
read -p "Choose an option (1 or 2): " CHOICE

case $CHOICE in
    1)
        install_from_source
        ;;
    2)
        download_binary
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Verify PATH
echo ""
echo -e "${BLUE}Checking PATH configuration...${NC}"

if echo "$PATH" | grep -q "$HOME/.local/bin"; then
    echo -e "${GREEN}✓ ~/.local/bin is in your PATH${NC}"
else
    echo -e "${YELLOW}⚠ ~/.local/bin is NOT in your PATH${NC}"
    echo ""
    echo "Add this line to ~/.zshrc or ~/.bashrc:"
    echo -e "${YELLOW}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
    echo ""
    echo "Then run: source ~/.zshrc"
fi

# Verify installation
echo ""
echo -e "${BLUE}Verifying installation...${NC}"

if ~/.local/bin/agp help &>/dev/null; then
    echo -e "${GREEN}✓ agp is ready to use!${NC}"
    echo ""
    echo -e "${GREEN}Quick start:${NC}"
    echo "  agp create personal --desc \"Personal workspace\""
    echo "  agp create work --desc \"Work account\""
    echo "  agp list"
    echo ""
    echo "Run 'agp help' for more commands"
else
    echo -e "${RED}✗ Installation verification failed${NC}"
    exit 1
fi
