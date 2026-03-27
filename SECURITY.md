# Security Policy

Security matters in Schema Pad. If you discover a vulnerability, do not open a public issue. Please report it privately.

## Supported Versions

Only the latest version of Schema Pad (`main`/`master` branch + latest deployment) receives security updates.

## Reporting a Vulnerability

If you find an issue that could expose user data, credentials, or security-sensitive infrastructure, contact the maintainer privately:

- Email: `webdev.byhari@gmail.com`
- GitHub: https://github.com/dev-hari-prasad

Please include:

- A clear description of the vulnerability
- Steps to reproduce
- Expected impact
- Any suggested fixes (optional)

You will receive a response within 48 hours.

## Security Notes

- Schema Pad is designed with a privacy-first approach; sensitive data should be protected both in transit and at rest.
- Analytics, if enabled, should remain minimal and privacy-safe, and must not collect secrets, raw credentials, or sensitive query data.
- Self-hosting or forking users are responsible for reviewing and configuring their own security settings.
- Never share exported config files, environment variables, API keys, database credentials, or encryption keys.

Thank you for helping keep Schema Pad secure.
