/**
 * JMF Hosting Discord Bot - API Manager
 * Version: 1.0.0
 * Last Updated: 03/12/2025
 * 
 * This manager handles the REST API for the bot, providing endpoints
 * for external services to interact with the bot. It includes authentication,
 * rate limiting, and route management for secure API access.
 * 
 * © 2025 JMFHosting. All Rights Reserved.
 * Developed by Nanaimo2013 (https://github.com/Nanaimo2013)
 */

const BaseManager = require('../base/base.manager');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

class ApiManager extends BaseManager {
    constructor() {
        super('api');
        
        // Set dependencies - make all dependencies optional
        this.setOptionalDependencies(['database', 'logger']);
        
        // API-specific properties
        this.app = null;
        this.server = null;
        this.routes = new Map();
        this.middlewares = new Map();
    }

    /**
     * Initialize the API manager
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        // Call parent initialize
        await super.initialize(config);
        
        try {
            // Create Express app
            this.app = express();
            
            // Apply default middlewares
            this._setupMiddlewares();
            
            // Load routes
            await this._loadRoutes();
            
            // Start server if autoStart is enabled (default to false)
            const autoStart = this.config && typeof this.config.autoStart !== 'undefined' ? 
                this.config.autoStart : false;
                
            if (autoStart) {
                await this.start();
            }
            
            // Use safe logging that doesn't depend on defaultIcons
            this.logger.success(this.name, `API manager initialized successfully`);
        } catch (error) {
            this.logger.error(this.name, `Failed to initialize API manager:`, error);
            throw error;
        }
    }
    
    /**
     * Start the API server
     * @returns {Promise<void>}
     */
    async start() {
        // Default port and host if config is not available
        let port = this.config && this.config.port ? this.config.port : 3560;
        const host = this.config && this.config.host ? this.config.host : '0.0.0.0';
        const maxRetries = this.config && this.config.maxPortRetries ? this.config.maxPortRetries : 3;
        let retries = 0;
        
        const startServer = (currentPort) => {
            return new Promise((resolve, reject) => {
                try {
                    this.server = this.app.listen(currentPort, host, () => {
                        this.logger.success(this.name, `API server started on http://${host}:${currentPort}`);
                        // Update the port in the config if it's different from the original
                        if (currentPort !== port) {
                            // Ensure config object exists before setting properties
                            if (!this.config) {
                                this.config = {};
                            }
                            this.config.port = currentPort;
                            this.logger.info(this.name, `Updated API port to ${currentPort} due to conflict`);
                        }
                        resolve();
                    });
                    
                    // Handle server errors
                    this.server.on('error', (error) => {
                        if (error.code === 'EADDRINUSE' && retries < maxRetries) {
                            retries++;
                            const newPort = currentPort + 1;
                            this.logger.warn(this.name, `Port ${currentPort} is in use, trying port ${newPort}...`);
                            this.server.close();
                            resolve(startServer(newPort));
                        } else {
                            this.logger.error(this.name, `Server error:`, error);
                            reject(error);
                        }
                    });
                } catch (error) {
                    this.logger.error(this.name, `Failed to start server:`, error);
                    reject(error);
                }
            });
        };
        
        return startServer(port);
    }
    
    /**
     * Stop the API server
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.server) {
            this.logger.warn(this.name, `Server not running`);
            return;
        }
        
        return new Promise((resolve, reject) => {
            try {
                // Set a timeout to force close if it takes too long
                const forceCloseTimeout = setTimeout(() => {
                    this.logger.warn(this.name, `Server close operation timed out, forcing close`);
                    this.server = null;
                    resolve();
                }, 5000);
                
                this.server.close(() => {
                    clearTimeout(forceCloseTimeout);
                    this.server = null;
                    this.logger.success(this.name, `API server stopped`);
                    resolve();
                });
            } catch (error) {
                this.logger.error(this.name, `Failed to stop server:`, error);
                // Still clear the server reference
                this.server = null;
                reject(error);
            }
        });
    }
    
    /**
     * Set up default middlewares
     * @private
     */
    _setupMiddlewares() {
        // Security middlewares
        this.app.use(helmet());
        
        // Set up CORS with default options if not provided
        const corsOptions = this.config && this.config.cors ? this.config.cors : {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        };
        this.app.use(cors(corsOptions));
        
        // Rate limiting with default options if not provided
        const rateLimitOptions = this.config && this.config.rateLimit ? this.config.rateLimit : {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            standardHeaders: true,
            legacyHeaders: false,
            message: 'Too many requests from this IP, please try again later'
        };
        this.app.use(rateLimit(rateLimitOptions));
        
        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
                
                if (res.statusCode >= 500) {
                    this.logger.error(this.name, message);
                } else if (res.statusCode >= 400) {
                    this.logger.warn(this.name, message);
                } else {
                    this.logger.info(this.name, message);
                }
            });
            
            next();
        });
        
        // Error handling middleware (must be last)
        this.app.use((err, req, res, next) => {
            this.logger.error(this.name, `API Error:`, err);
            
            res.status(err.status || 500).json({
                error: {
                    message: err.message || 'Internal Server Error',
                    status: err.status || 500
                }
            });
        });
    }
    
    /**
     * Load all route modules
     * @private
     * @returns {Promise<void>}
     */
    async _loadRoutes() {
        try {
            // Ensure modulesPath is defined
            if (!this.modulesPath) {
                this.modulesPath = path.join(__dirname, 'modules');
                this.logger.warn(this.name, `modulesPath not defined, using default: ${this.modulesPath}`);
            }
            
            const routesPath = path.join(this.modulesPath, 'routes');
            
            // Create routes directory if it doesn't exist
            await fs.mkdir(routesPath, { recursive: true });
            
            this.logger.info(this.name, `Loading API routes from ${routesPath}...`);
            
            // Check if directory exists and is accessible
            try {
                await fs.access(routesPath);
            } catch (error) {
                this.logger.warn(this.name, `Routes directory not accessible: ${error.message}`);
                // Create an empty array of route files since the directory doesn't exist or isn't accessible
                return;
            }
            
            // Get all route files
            let routeFiles = [];
            try {
                routeFiles = (await fs.readdir(routesPath))
                    .filter(file => file.endsWith('.js'));
            } catch (error) {
                this.logger.warn(this.name, `Failed to read routes directory: ${error.message}`);
                return;
            }
            
            if (routeFiles.length === 0) {
                this.logger.info(this.name, `No route files found in ${routesPath}`);
            }
            
            for (const file of routeFiles) {
                const filePath = path.join(routesPath, file);
                try {
                    const routeModule = require(filePath);
                    const routePath = routeModule.path || `/${file.replace('.js', '')}`;
                    
                    // Register route
                    this.app.use(routePath, routeModule.router);
                    this.routes.set(routePath, routeModule);
                    
                    this.logger.info(this.name, `Loaded route: ${routePath}`);
                } catch (error) {
                    this.logger.error(this.name, `Failed to load route ${file}:`, error);
                }
            }
            
            // Set up 404 handler
            this.app.use((req, res) => {
                res.status(404).json({
                    error: {
                        message: 'Not Found',
                        status: 404
                    }
                });
            });
            
            this.logger.success(this.name, `Loaded ${this.routes.size} API routes`);
        } catch (error) {
            this.logger.error(this.name, `Error loading API routes:`, error);
            // Don't throw the error, just log it and continue
        }
    }
    
    /**
     * Create a JWT token
     * @param {Object} payload - Token payload
     * @param {Object} options - JWT options
     * @returns {string} JWT token
     */
    createToken(payload, options = {}) {
        if (!this.config.jwtSecret) {
            throw new Error('JWT secret not configured');
        }
        
        const defaultOptions = {
            expiresIn: '1h'
        };
        
        return jwt.sign(payload, this.config.jwtSecret, { ...defaultOptions, ...options });
    }
    
    /**
     * Verify a JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} Decoded token payload
     */
    verifyToken(token) {
        if (!this.config.jwtSecret) {
            throw new Error('JWT secret not configured');
        }
        
        return jwt.verify(token, this.config.jwtSecret);
    }
    
    /**
     * Create an authentication middleware
     * @returns {Function} Express middleware
     */
    authMiddleware() {
        return (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({
                        error: {
                            message: 'Authentication required',
                            status: 401
                        }
                    });
                }
                
                const token = authHeader.split(' ')[1];
                const decoded = this.verifyToken(token);
                
                // Attach user to request
                req.user = decoded;
                next();
            } catch (error) {
                return res.status(401).json({
                    error: {
                        message: 'Invalid or expired token',
                        status: 401
                    }
                });
            }
        };
    }
    
    /**
     * Register a middleware
     * @param {string} name - Middleware name
     * @param {Function} middleware - Express middleware function
     */
    registerMiddleware(name, middleware) {
        this.middlewares.set(name, middleware);
        this.logger.debug(this.name, `Registered middleware: ${name}`);
    }
    
    /**
     * Get a registered middleware
     * @param {string} name - Middleware name
     * @returns {Function} Express middleware
     */
    getMiddleware(name) {
        const middleware = this.middlewares.get(name);
        
        if (!middleware) {
            throw new Error(`Middleware '${name}' not found`);
        }
        
        return middleware;
    }
    
    /**
     * Get the status of the API manager
     * @returns {Promise<Object>} Status object
     */
    async getStatus() {
        const status = await super.getStatus();
        
        // Add API-specific status information
        status.isRunning = !!this.server;
        status.port = this.config.port || 3000;
        status.host = this.config.host || 'localhost';
        status.routeCount = this.routes.size;
        status.middlewareCount = this.middlewares.size;
        
        return status;
    }
    
    /**
     * Shutdown the API manager
     * @returns {Promise<void>}
     */
    async shutdown() {
        if (this.server) {
            await this.stop();
        }
        
        // Don't overwrite the config file during shutdown
        this._saveConfigOnShutdown = false;
        
        // Call parent shutdown
        await super.shutdown();
    }
}

module.exports = ApiManager; 