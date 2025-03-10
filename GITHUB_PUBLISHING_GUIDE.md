# GitHub & Docker Publishing Guide for JMF Hosting Discord Bot

This guide provides step-by-step instructions for publishing your JMF Hosting Discord Bot to GitHub and setting up Docker with GitHub Packages.

## 1. GitHub Repository Setup

### 1.1 Create a New Repository
1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right and select "New repository"
3. Name it "Jmf-Bot"
4. Add a description: "Custom Discord bot for JMF Hosting server"
5. Choose "Private" or "Public" visibility
6. Check "Add a README file"
7. Choose "MIT License"
8. Click "Create repository"

### 1.2 Initial Commit
```bash
# Clone the repository
git clone https://github.com/Nanaimo2013/Jmf-Bot.git
cd Jmf-Bot

# Copy your project files
# (Copy all your files to this directory)

# Add all files
git add .

# Commit with the sample commit message
git commit -m "feat(release): Initial release of JMF Hosting Discord Bot v1.0.0

This commit represents the initial release of the JMF Hosting Discord Bot v1.0.0. The bot provides a comprehensive solution for managing the JMF Hosting Discord server, including user verification, support tickets, game server management via Pterodactyl integration, economy system, and more."

# Push to GitHub
git push origin main
```

### 1.3 Set Up GitHub Templates
The following templates have been created for you:
- Pull Request Template: `.github/PULL_REQUEST_TEMPLATE.md`
- Issue Templates:
  - Bug Report: `.github/ISSUE_TEMPLATE/bug_report.md`
  - Feature Request: `.github/ISSUE_TEMPLATE/feature_request.md`
- Commit Template: `COMMIT_TEMPLATE.md`

To use the commit template:
```bash
git config --local commit.template COMMIT_TEMPLATE.md
```

## 2. GitHub Actions CI/CD

### 2.1 Workflow Setup
The GitHub Actions workflow is already set up in `.github/workflows/main.yml`. It includes:
- Testing with Node.js 16.x, 18.x, and 20.x
- Security scanning with Snyk and CodeQL
- Building and pushing Docker images to GitHub Packages
- Deployment (commented out, enable when ready)

### 2.2 Repository Secrets
You need to add the following secrets to your GitHub repository:
1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `SNYK_TOKEN`: Your Snyk API token (for security scanning)
   - For deployment (when ready):
     - `SSH_HOST`: Your server hostname
     - `SSH_USERNAME`: Your server username
     - `SSH_KEY`: Your private SSH key

## 3. Docker & GitHub Packages

### 3.1 Docker Image Setup
The Dockerfile has been enhanced with:
- GitHub Container Registry labels
- Health checks
- Optimized dependencies
- Security improvements

### 3.2 Publishing to GitHub Packages
The GitHub Actions workflow will automatically build and publish your Docker image to GitHub Packages when you push to main or create a tag.

To manually publish:
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build the image
docker build -t ghcr.io/nanaimo2013/jmf-bot:latest .

# Push the image
docker push ghcr.io/nanaimo2013/jmf-bot:latest
```

### 3.3 Using the Docker Image
```bash
# Pull the image
docker pull ghcr.io/nanaimo2013/jmf-bot:latest

# Run with environment variables
docker run -d \
  --name jmf-bot \
  -v $(pwd)/config.json:/usr/src/app/config.json \
  -v $(pwd)/logs:/usr/src/app/logs \
  --env-file .env \
  ghcr.io/nanaimo2013/jmf-bot:latest
```

### 3.4 Docker Compose
The docker-compose.yml file has been updated to use GitHub Packages:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 4. Versioning & Releases

### 4.1 Creating a Release
1. Create and push a tag:
```bash
git tag -a v1.0.0 -m "Initial release v1.0.0"
git push origin v1.0.0
```

2. On GitHub, go to Releases → Draft a new release
3. Choose the tag you just pushed
4. Title: "JMF Hosting Discord Bot v1.0.0"
5. Description: Copy from CHANGELOG.md
6. Publish the release

### 4.2 Semantic Versioning
Follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Incompatible API changes
- MINOR: Add functionality in a backward-compatible manner
- PATCH: Backward-compatible bug fixes

## 5. Documentation

The following documentation has been created:
- `README.md`: Main project documentation
- `CHANGELOG.md`: Version history
- `docs/ARCHITECTURE.md`: System architecture
- `docs/BUILDING.md`: Build instructions
- `docs/ROADMAP.md`: Development roadmap
- `docs/README.md`: Documentation index

## 6. Next Steps

1. Enable GitHub Pages for documentation (Settings → Pages)
2. Set up branch protection rules (Settings → Branches)
3. Configure Dependabot for dependency updates
4. Set up project boards for task management
5. Uncomment the deployment section in the GitHub Actions workflow when ready

---

© 2025 JMFHosting. All Rights Reserved.  
Developed by [Nanaimo2013](https://github.com/Nanaimo2013) 