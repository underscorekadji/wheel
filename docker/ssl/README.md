# SSL Certificates

This directory contains self-signed SSL certificates for HTTPS support in development and testing.

## Files

- `generate-certs.sh` - Script to generate self-signed certificates
- `localhost.key` - Private key for SSL certificate
- `localhost.crt` - SSL certificate valid for localhost

## Usage

### Generate Certificates

```bash
./generate-certs.sh
```

### Certificate Details

- **Valid for**: localhost, `*.localhost`, `127.0.0.1`, `::1`
- **Validity**: 365 days from generation
- **Algorithm**: RSA 2048-bit
- **Type**: Self-signed (development only)

## Security Notes

⚠️ **Important**: These are self-signed certificates for development and testing only.

- Your browser will show security warnings - this is expected
- Do not use these certificates in production
- The private key should be kept secure (permissions set to 600)

## Regeneration

If certificates expire or you need to regenerate them:

```bash
rm localhost.key localhost.crt
./generate-certs.sh
```

## Docker Integration

These certificates are automatically mounted into the nginx containers via docker-compose configuration.
