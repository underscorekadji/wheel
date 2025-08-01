#!/bin/bash

# Generate self-signed SSL certificates for development/testing
# This script creates a self-signed certificate valid for localhost

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR"

echo "🔐 Generating self-signed SSL certificates..."

# Create certificate directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/localhost.key" 2048

# Generate certificate signing request
openssl req -new -key "$CERT_DIR/localhost.key" -out "$CERT_DIR/localhost.csr" -subj "/C=US/ST=Dev/L=Dev/O=Wheel App/OU=Development/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -in "$CERT_DIR/localhost.csr" -signkey "$CERT_DIR/localhost.key" -out "$CERT_DIR/localhost.crt" -days 365 -extensions v3_req -extfile <(echo -e "
[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
")

# Clean up CSR file
rm "$CERT_DIR/localhost.csr"

# Set appropriate permissions
chmod 600 "$CERT_DIR/localhost.key"
chmod 644 "$CERT_DIR/localhost.crt"

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate files:"
echo "   - Private key: $CERT_DIR/localhost.key"
echo "   - Certificate: $CERT_DIR/localhost.crt"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "    Your browser will show a security warning - this is expected."