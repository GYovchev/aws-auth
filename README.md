# AWS Auth CLI Tool

A TypeScript CLI tool for managing AWS credentials and profiles. Install with npm and easily manage multiple AWS accounts and regions.

## Installation

```bash
npm install -g aws-auth
```

## Usage

### Add a new profile
Add a new AWS profile with interactive prompts for credentials and region:

```bash
aws-auth add production
```

This will prompt you for:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., us-east-1)

### Use/Switch to a profile
Set a profile as the default AWS profile:

```bash
aws-auth production
# or
aws-auth use production
# or  
aws-auth set production
```

### List all profiles
Display all available AWS profiles:

```bash
aws-auth list
# or
aws-auth ls
```

### Remove a profile
Remove an AWS profile (with confirmation prompt):

```bash
aws-auth remove production
# or
aws-auth rm production
```

### Help
Display help information:

```bash
aws-auth --help
```

## Features

- ✅ Interactive prompts for secure credential entry
- ✅ Manages both `~/.aws/credentials` and `~/.aws/config` files
- ✅ Support for multiple AWS profiles
- ✅ Easy switching between profiles
- ✅ Input validation for AWS regions
- ✅ Confirmation prompts for destructive operations
- ✅ Clear success/error messaging
- ✅ TypeScript for type safety

## File Management

This tool manages the standard AWS configuration files:
- `~/.aws/credentials` - Contains AWS access keys and secrets
- `~/.aws/config` - Contains regions and other configuration

The files are created automatically if they don't exist, and the tool preserves existing profiles when adding new ones.

## Examples

```bash
# Add a production profile
aws-auth add production

# Add a development profile  
aws-auth add development

# Switch to production
aws-auth production

# List all profiles
aws-auth list

# Remove development profile
aws-auth rm development
```

## Development

To build from source:

```bash
npm install
npm run build
```

To run in development mode:

```bash
npm run dev
```

## Publishing

This package is automatically published to npm when a version tag is pushed to the repository. The GitHub Action workflow:

1. Triggers on version tags (e.g., `v1.0.1`)
2. Runs tests to ensure code quality
3. Builds the TypeScript code
4. Publishes to npm registry

To publish a new version:

```bash
npm version patch  # or minor/major
git push origin main --tags
```

## License

MIT