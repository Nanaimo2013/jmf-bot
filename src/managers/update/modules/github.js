/**
 * JMF Hosting Discord Bot - GitHub Update Module
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This module provides GitHub repository integration for the update manager,
 * including fetching releases, downloading assets, and checking for updates.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseModule = require('../../base/base.module');
const path = require('path');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const https = require('https');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

class GitHubModule extends BaseModule {
    /**
     * Create a new GitHub module
     * @param {Object} manager - The parent manager instance
     */
    constructor(manager) {
        super(manager, {
            name: 'github',
            version: '1.0.0',
            defaultConfig: {
                apiBaseUrl: 'https://api.github.com',
                apiTimeout: 10000,
                downloadTimeout: 300000, // 5 minutes
                headers: {
                    'User-Agent': 'JMF-Bot-Updater',
                    'Accept': 'application/vnd.github.v3+json'
                },
                auth: {
                    type: 'none', // none, token, basic
                    token: '',
                    username: '',
                    password: ''
                },
                rateLimitHandling: {
                    enabled: true,
                    retryCount: 3,
                    retryDelay: 5000
                }
            }
        });
        
        this._rateLimitRemaining = null;
        this._rateLimitReset = null;
    }

    /**
     * Initialize the module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        await super.initialize(config);
        
        // Create temp directory for downloads
        this._tempDir = path.join(process.cwd(), 'data', 'update', 'temp');
        await fs.mkdir(this._tempDir, { recursive: true });
        
        this.log('info', 'GitHub module initialized');
    }

    /**
     * Make a request to the GitHub API
     * @param {string} endpoint - API endpoint
     * @param {Object} [options] - Request options
     * @returns {Promise<Object>} Response data
     */
    async makeApiRequest(endpoint, options = {}) {
        return this.executeOperation('makeApiRequest', async () => {
            const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.getConfig('apiBaseUrl')}${endpoint}`);
            
            // Check if we're rate limited
            if (this._rateLimitRemaining !== null && this._rateLimitRemaining <= 0) {
                const now = Math.floor(Date.now() / 1000);
                const resetTime = this._rateLimitReset;
                
                if (resetTime > now) {
                    const waitTime = (resetTime - now) * 1000 + 1000; // Add 1 second buffer
                    this.log('warn', `Rate limit exceeded, waiting ${waitTime / 1000} seconds until reset`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            
            const requestOptions = {
                method: options.method || 'GET',
                headers: { ...this.getConfig('headers') },
                timeout: this.getConfig('apiTimeout')
            };
            
            // Add authentication if configured
            const auth = this.getConfig('auth');
            if (auth.type === 'token' && auth.token) {
                requestOptions.headers['Authorization'] = `token ${auth.token}`;
            } else if (auth.type === 'basic' && auth.username && auth.password) {
                const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                requestOptions.headers['Authorization'] = `Basic ${credentials}`;
            }
            
            // Add body if provided
            if (options.body) {
                requestOptions.headers['Content-Type'] = 'application/json';
                requestOptions.body = JSON.stringify(options.body);
            }
            
            try {
                const response = await fetch(url.toString(), requestOptions);
                
                // Store rate limit information
                this._rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining') || '60', 10);
                this._rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                    throw new Error(`GitHub API error (${response.status}): ${errorData.message}`);
                }
                
                return await response.json();
            } catch (error) {
                // Handle rate limiting
                if (error.message.includes('rate limit') && this.getConfig('rateLimitHandling.enabled')) {
                    const retryCount = options.retryCount || 0;
                    const maxRetries = this.getConfig('rateLimitHandling.retryCount');
                    
                    if (retryCount < maxRetries) {
                        const delay = this.getConfig('rateLimitHandling.retryDelay');
                        this.log('warn', `Rate limit hit, retrying in ${delay / 1000} seconds (${retryCount + 1}/${maxRetries})`);
                        
                        await new Promise(resolve => setTimeout(resolve, delay));
                        
                        return this.makeApiRequest(endpoint, {
                            ...options,
                            retryCount: retryCount + 1
                        });
                    }
                }
                
                throw error;
            }
        });
    }

    /**
     * Get repository information
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {Promise<Object>} Repository information
     */
    async getRepository(owner, repo) {
        return this.executeOperation('getRepository', async () => {
            return await this.makeApiRequest(`/repos/${owner}/${repo}`);
        });
    }

    /**
     * Get repository releases
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {Object} [options] - Options
     * @param {number} [options.limit=10] - Maximum number of releases to return
     * @param {boolean} [options.includePrerelease=false] - Whether to include pre-releases
     * @returns {Promise<Array>} Repository releases
     */
    async getReleases(owner, repo, options = {}) {
        return this.executeOperation('getReleases', async () => {
            const releases = await this.makeApiRequest(`/repos/${owner}/${repo}/releases`);
            
            // Filter pre-releases if needed
            let filteredReleases = releases;
            if (!options.includePrerelease) {
                filteredReleases = releases.filter(release => !release.prerelease);
            }
            
            // Limit the number of releases
            const limit = options.limit || 10;
            return filteredReleases.slice(0, limit);
        });
    }

    /**
     * Get the latest release
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {boolean} [includePrerelease=false] - Whether to include pre-releases
     * @returns {Promise<Object>} Latest release
     */
    async getLatestRelease(owner, repo, includePrerelease = false) {
        return this.executeOperation('getLatestRelease', async () => {
            try {
                if (includePrerelease) {
                    // If we include pre-releases, we need to get all releases and sort them
                    const releases = await this.getReleases(owner, repo, { limit: 10, includePrerelease: true });
                    
                    if (releases.length === 0) {
                        throw new Error('No releases found');
                    }
                    
                    return releases[0]; // GitHub API returns releases in descending order by date
                } else {
                    // Otherwise, we can use the latest release endpoint
                    return await this.makeApiRequest(`/repos/${owner}/${repo}/releases/latest`);
                }
            } catch (error) {
                if (error.message.includes('404')) {
                    throw new Error(`No releases found for ${owner}/${repo}`);
                }
                throw error;
            }
        });
    }

    /**
     * Compare two versions
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} base - Base version or commit
     * @param {string} head - Head version or commit
     * @returns {Promise<Object>} Comparison result
     */
    async compareVersions(owner, repo, base, head) {
        return this.executeOperation('compareVersions', async () => {
            return await this.makeApiRequest(`/repos/${owner}/${repo}/compare/${base}...${head}`);
        });
    }

    /**
     * Download a file from a URL
     * @param {string} url - URL to download from
     * @param {string} destination - Destination path
     * @returns {Promise<string>} Destination path
     */
    async downloadFile(url, destination) {
        return this.executeOperation('downloadFile', async () => {
            // Create directory if it doesn't exist
            await fs.mkdir(path.dirname(destination), { recursive: true });
            
            return new Promise((resolve, reject) => {
                const fileStream = createWriteStream(destination);
                
                https.get(url, { 
                    timeout: this.getConfig('downloadTimeout'),
                    headers: this.getConfig('headers')
                }, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download file: ${response.statusCode} ${response.statusMessage}`));
                        return;
                    }
                    
                    response.pipe(fileStream);
                    
                    fileStream.on('finish', () => {
                        fileStream.close();
                        resolve(destination);
                    });
                }).on('error', (error) => {
                    fs.unlink(destination).catch(() => {});
                    reject(error);
                });
            });
        });
    }

    /**
     * Download a release asset
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {number} releaseId - Release ID
     * @param {number} assetId - Asset ID
     * @param {string} [destination] - Destination path (optional)
     * @returns {Promise<string>} Destination path
     */
    async downloadReleaseAsset(owner, repo, releaseId, assetId, destination) {
        return this.executeOperation('downloadReleaseAsset', async () => {
            const asset = await this.makeApiRequest(`/repos/${owner}/${repo}/releases/assets/${assetId}`);
            
            if (!destination) {
                destination = path.join(this._tempDir, asset.name);
            }
            
            return await this.downloadFile(asset.browser_download_url, destination);
        });
    }

    /**
     * Clone a repository
     * @param {string} url - Repository URL
     * @param {string} destination - Destination path
     * @param {Object} [options] - Clone options
     * @param {string} [options.branch] - Branch to clone
     * @param {boolean} [options.shallow=false] - Whether to do a shallow clone
     * @returns {Promise<string>} Destination path
     */
    async cloneRepository(url, destination, options = {}) {
        return this.executeOperation('cloneRepository', async () => {
            let command = `git clone`;
            
            if (options.shallow) {
                command += ' --depth 1';
            }
            
            if (options.branch) {
                command += ` -b ${options.branch}`;
            }
            
            command += ` ${url} ${destination}`;
            
            try {
                execSync(command, { stdio: 'pipe' });
                this.log('info', `Cloned repository ${url} to ${destination}`);
                return destination;
            } catch (error) {
                throw new Error(`Failed to clone repository: ${error.message}`);
            }
        });
    }

    /**
     * Check if a repository has updates
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} currentVersion - Current version or commit
     * @param {Object} [options] - Options
     * @param {string} [options.branch='main'] - Branch to check
     * @param {boolean} [options.includePrerelease=false] - Whether to include pre-releases
     * @returns {Promise<Object>} Update information
     */
    async checkForUpdates(owner, repo, currentVersion, options = {}) {
        return this.executeOperation('checkForUpdates', async () => {
            try {
                // Get the latest release
                const latestRelease = await this.getLatestRelease(owner, repo, options.includePrerelease);
                const latestVersion = latestRelease.tag_name;
                
                // Compare versions
                const comparison = await this.compareVersions(owner, repo, currentVersion, latestVersion);
                
                const updateAvailable = comparison.ahead_by > 0;
                
                return {
                    currentVersion,
                    latestVersion,
                    updateAvailable,
                    releaseUrl: latestRelease.html_url,
                    releaseNotes: latestRelease.body,
                    publishedAt: latestRelease.published_at,
                    assets: latestRelease.assets,
                    comparison: {
                        aheadBy: comparison.ahead_by,
                        behindBy: comparison.behind_by,
                        totalCommits: comparison.total_commits,
                        changedFiles: comparison.files.length,
                        diffUrl: comparison.html_url
                    }
                };
            } catch (error) {
                // If we can't get the latest release, try comparing with the default branch
                try {
                    const branch = options.branch || 'main';
                    const comparison = await this.compareVersions(owner, repo, currentVersion, branch);
                    
                    const updateAvailable = comparison.ahead_by > 0;
                    
                    return {
                        currentVersion,
                        latestVersion: branch,
                        updateAvailable,
                        releaseUrl: null,
                        releaseNotes: null,
                        publishedAt: null,
                        assets: [],
                        comparison: {
                            aheadBy: comparison.ahead_by,
                            behindBy: comparison.behind_by,
                            totalCommits: comparison.total_commits,
                            changedFiles: comparison.files.length,
                            diffUrl: comparison.html_url
                        }
                    };
                } catch (branchError) {
                    throw new Error(`Failed to check for updates: ${error.message}, ${branchError.message}`);
                }
            }
        });
    }

    /**
     * Update a repository to the latest version
     * @param {string} repoPath - Repository path
     * @param {Object} [options] - Update options
     * @param {string} [options.branch='main'] - Branch to update to
     * @param {boolean} [options.force=false] - Whether to force update
     * @returns {Promise<Object>} Update result
     */
    async updateRepository(repoPath, options = {}) {
        return this.executeOperation('updateRepository', async () => {
            const branch = options.branch || 'main';
            
            try {
                // Check if the path is a git repository
                if (!this._isGitRepository(repoPath)) {
                    throw new Error(`${repoPath} is not a Git repository`);
                }
                
                // Get the current commit hash
                const currentCommit = execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();
                
                // Fetch the latest changes
                execSync(`git fetch origin ${branch}`, { cwd: repoPath });
                
                // Get the latest commit hash from the remote
                const latestCommit = execSync(`git rev-parse origin/${branch}`, { cwd: repoPath }).toString().trim();
                
                // Check if there are any changes
                if (currentCommit === latestCommit && !options.force) {
                    return {
                        success: true,
                        message: 'Already up to date',
                        currentCommit,
                        latestCommit,
                        changedFiles: []
                    };
                }
                
                // Get the list of changed files
                const changedFiles = execSync(
                    `git diff --name-only ${currentCommit}..origin/${branch}`,
                    { cwd: repoPath }
                ).toString().trim().split('\n').filter(Boolean);
                
                // Pull the latest changes
                const pullCommand = options.force ? `git reset --hard origin/${branch}` : `git pull origin ${branch}`;
                execSync(pullCommand, { cwd: repoPath });
                
                return {
                    success: true,
                    message: `Updated from ${currentCommit.substring(0, 8)} to ${latestCommit.substring(0, 8)}`,
                    currentCommit,
                    latestCommit,
                    changedFiles
                };
            } catch (error) {
                throw new Error(`Failed to update repository: ${error.message}`);
            }
        });
    }

    /**
     * Check if a path is a Git repository
     * @param {string} repoPath - Path to check
     * @returns {boolean} Whether the path is a Git repository
     * @private
     */
    _isGitRepository(repoPath) {
        try {
            execSync('git rev-parse --is-inside-work-tree', { cwd: repoPath, stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clean up resources when shutting down
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.log('debug', 'Shutting down GitHub module');
        
        // Clean up temp directory
        try {
            const tempFiles = await fs.readdir(this._tempDir);
            for (const file of tempFiles) {
                await fs.unlink(path.join(this._tempDir, file));
            }
        } catch (error) {
            this.log('warn', `Failed to clean up temp directory: ${error.message}`);
        }
        
        await super.shutdown();
    }
}

module.exports = GitHubModule; 