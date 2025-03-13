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

const BaseManager = require('../base.manager');
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
            
            // Start server if autoStart is enabled (default to true)
            const autoStart = this.config && typeof this.config.autoStart !== 'undefined' ? 
                this.config.autoStart : true;
                
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
        const port = this.config && this.config.port ? this.config.port : 3000;
        const host = this.config && this.config.host ? this.config.host : 'localhost';
        
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(port, host, () => {
                    this.logger.success(this.name, `API server started on http://${host}:${port}`);
                    resolve();
                });
                
                // Handle server errors
                this.server.on('error', (error) => {
                    this.logger.error(this.name, `Server error:`, error);
                    reject(error);
                });
            } catch (error) {
                this.logger.error(this.name, `Failed to start server:`, error);
                reject(error);
            }
        });
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
                this.server.close(() => {
                    this.server = null;
                    this.logger.success(this.name, `API server stopped`);
                    resolve();
                });
            } catch (error) {
                this.logger.error(this.name, `Failed to stop server:`, error);
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
        const routesPath = path.join(this.modulesPath, 'routes');
        await fs.mkdir(routesPath, { recursive: true });
        
        try {
            this.logger.info(this.name, `Loading API routes...`);
            
            // Get all route files
            const routeFiles = (await fs.readdir(routesPath))
                .filter(file => file.endsWith('.js'));
            
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
            throw error;
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
        
        // Call parent shutdown
        await super.shutdown();
    }
}

module.exports = ApiManager; 