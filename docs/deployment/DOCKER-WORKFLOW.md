# Docker Build Workflow

This repository includes a custom GitHub Actions workflow for building and publishing Docker images for the JMF Discord Bot.

## Features

- **Manual Triggering**: Build images on-demand with custom parameters
- **Automatic Builds**: Images are automatically built when releases are published or version tags are pushed
- **Multiple Image Types**: Build standard or lightweight versions of the bot
- **Multi-Platform Support**: Images are built for both AMD64 and ARM64 architectures
- **GitHub Container Registry**: Images are published to GitHub Container Registry (ghcr.io)

## How to Use the Workflow

### Manual Triggering

1. Go to the **Actions** tab in your GitHub repository
2. Select the **Docker Build and Publish** workflow
3. Click the **Run workflow** button
4. Configure the following options:
   - **Version tag**: The version to tag the image with (e.g., `1.0.0`, `latest`)
   - **Image type**: Choose between `standard`, `light`, or `both`
   - **Push to registry**: Whether to push the built image to GitHub Container Registry

![Manual Workflow Trigger](https://docs.github.com/assets/images/help/repository/workflow-dispatch.png)

### Automatic Triggering

The workflow will automatically run when:

1. A new release is published through the GitHub Releases interface
2. A tag matching the pattern `v*.*.*` is pushed (e.g., `v1.0.0`, `v2.3.1`)

## Image Types

### Standard Image

The standard image includes all dependencies, including:
- Node.js
- Canvas library (for image generation)
- Chart.js (for chart generation)
- All other bot dependencies

This image is larger but includes full functionality.

### Light Image

The light image excludes some dependencies to create a smaller image:
- Excludes Canvas library
- Excludes Chart.js
- Excludes chart generation capabilities

This image is smaller and more suitable for environments with limited resources.

## Using the Built Images

### Pulling Images

```bash
# Pull the standard image
docker pull ghcr.io/nanaimo2013/jmf-bot:latest

# Pull the light image
docker pull ghcr.io/nanaimo2013/jmf-bot:light

# Pull a specific version
docker pull ghcr.io/nanaimo2013/jmf-bot:1.0.0
```

### Running Images

```bash
# Run the standard image
docker run -d --name jmf-bot \
  -v $(pwd)/config.json:/usr/src/app/config.json \
  -v $(pwd)/logs:/usr/src/app/logs \
  --env-file .env \
  ghcr.io/nanaimo2013/jmf-bot:latest

# Run the light image
docker run -d --name jmf-bot \
  -v $(pwd)/config.json:/usr/src/app/config.json \
  -v $(pwd)/logs:/usr/src/app/logs \
  --env-file .env \
  ghcr.io/nanaimo2013/jmf-bot:light
```

## Required Permissions

For this workflow to function properly, your repository needs:

1. **Write packages** permission for the `GITHUB_TOKEN` to push to GitHub Container Registry
2. **Read/write contents** permission to checkout the code and read tags

These permissions are typically enabled by default for GitHub Actions.

## Troubleshooting

### Image Not Pushing

If the image builds but doesn't push to the registry:

1. Check that your repository has the correct permissions
2. Ensure the `GITHUB_TOKEN` has the `write:packages` scope
3. Verify that your repository is properly connected to the GitHub Container Registry

### Build Failures

If the build fails:

1. Check the workflow logs for specific error messages
2. Ensure your Dockerfile is valid and all dependencies are available
3. For canvas-related issues, consider using the light image which excludes these dependencies

## Customizing the Workflow

You can customize the workflow by editing the `.github/workflows/docker-build.yml` file in your repository.

---

© 2025 JMFHosting. All Rights Reserved.  
Developed by Nanaimo2013 (https://github.com/Nanaimo2013) 