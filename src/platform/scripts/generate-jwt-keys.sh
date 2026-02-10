#!/bin/bash

###
# Generate RS256 JWT Keys
# Creates private and public keys for JWT authentication
###

set -e

KEYS_DIR="./keys"

echo "🔐 Generating RS256 JWT Keys..."

# Create keys directory
mkdir -p "$KEYS_DIR"

# Generate private key
openssl genrsa -out "$KEYS_DIR/private.key" 4096
echo "✅ Private key generated: $KEYS_DIR/private.key"

# Generate public key
openssl rsa -in "$KEYS_DIR/private.key" -pubout -out "$KEYS_DIR/public.key"
echo "✅ Public key generated: $KEYS_DIR/public.key"

# Set appropriate permissions
chmod 600 "$KEYS_DIR/private.key"
chmod 644 "$KEYS_DIR/public.key"

echo ""
echo "🎉 JWT keys generated successfully!"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "  1. NEVER commit private.key to version control"
echo "  2. Add 'keys/' to your .gitignore"
echo "  3. Store private key securely (e.g., secret manager)"
echo "  4. Rotate keys periodically (every 90 days recommended)"
echo ""
echo "📝 Next steps:"
echo "  1. Set environment variables:"
echo "     export JWT_PRIVATE_KEY_PATH=$PWD/$KEYS_DIR/private.key"
echo "     export JWT_PUBLIC_KEY_PATH=$PWD/$KEYS_DIR/public.key"
echo ""
echo "  2. Start the API server:"
echo "     npm run api:start"
echo ""
