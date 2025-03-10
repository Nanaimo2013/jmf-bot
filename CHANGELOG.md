# JMF Hosting Discord Bot Changelog

All notable changes to the JMF Hosting Discord Bot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-03-10

### Changed
- Improved leveling system with more balanced progression
- Reduced XP gain rates (message XP from 5 to 3, voice XP from 2 to 1)
- Increased message reward frequency from every 3rd message to every 5th message
- Increased voice reward frequency from every 5 minutes to every 10 minutes
- Made level curve steeper with updated formula (150 * (level ^ 1.8))
- Added better logging for XP rewards and level progression
- Added tracking for total voice minutes in the database

## [1.1.0] - 2025-03-10

### Added
- Unified database schema that works with both SQLite and MySQL
- New script `apply-unified-schema.js` to apply the unified schema
- Enhanced ticket system with categories, priorities, and contact info
- Improved economy system with transaction history and user ranks
- Interactive mining game with inventory, shop, and selling features
- Server statistics feature with member, server, and node stats
- Auto-updating statistics channel
- Enhanced embeds with interactive buttons and select menus
- Comprehensive API documentation with Pterodactyl API integration
- Additional API endpoints for user account linking
- Economy and mining API endpoints
- Server statistics API endpoints

### Changed
- Consolidated database schemas into a single unified schema
- Improved ticket panel with better visual design
- Enhanced mining command with subcommands and interactive UI
- Updated documentation to reflect new features and changes
- Improved error handling throughout the bot
- Reorganized API documentation with clearer categorization

### Fixed
- Fixed missing `button_id` column in `button_usage` table
- Fixed database schema inconsistencies between SQLite and MySQL
- Fixed ticket creation and management issues
- Fixed economy transaction tracking
- Fixed mining game resource collection and selling

## [1.0.0] - 2025-03-09

### Added
- Initial release of the JMF Hosting Discord Bot
- Discord.js v14 integration
- Command handler system
- Event handler system
- Logging system
- Configuration management
- User verification system
- Role management
- Support ticket system
- Pterodactyl API integration
- Server status monitoring
- Server control commands
- Economy system
- Mining game basics
- Leveling system

### Changed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Build Information
- Type: Release
- Build Number: 001
- Architecture: Node.js 18.x

### Added
- Discord.js v14 integration with slash command support
- Comprehensive command handler system with category organization
- Event handler system with automatic registration
- Database integration with MySQL for persistent storage
- User verification system with role assignment
- Support ticket system with categories and staff assignment
- Leveling system with XP, levels, and rewards
- Economy system with virtual currency and shop
- Interactive mining game with upgrades and resources
- Moderation tools (ban, kick, mute, warn)
- Pterodactyl Panel integration for game server management
- Server status monitoring with real-time updates
- API endpoints for external integrations
- Logging system with rotating file logs
- Web dashboard integration
- Docker support with multi-architecture builds
- Comprehensive documentation

### Changed
- Migrated from Discord.js v13 to v14
- Improved command structure for better organization
- Enhanced error handling with detailed logging
- Optimized database queries for better performance
- Streamlined configuration with environment variables

### Technical Details
#### Bot Architecture
- Modular command system with automatic registration
- Event-driven architecture for Discord events
- Database abstraction layer for easy switching
- Caching system for frequently accessed data
- Rate limiting protection for API endpoints

#### System Components
- Command handler with permission checking
- Event system with priority handling
- Database models with validation
- Utility functions for common operations
- API server with authentication

#### User Interface
- Embedded messages with consistent styling
- Interactive buttons and select menus
- Paginated responses for large data sets
- Custom emojis and reactions
- Modal forms for data collection

### Known Issues
- Rate limiting on high-traffic servers
- Occasional connection issues with Pterodactyl API
- Memory usage increases over time (planned optimization)

### Development Notes
- Node.js 16.9.0 or higher required
- MySQL 5.7+ or MongoDB 6.0+ required
- Discord Developer Portal setup needed
- Environment variables must be configured

### References
- [Discord.js Documentation](https://discord.js.org/)
- [Pterodactyl API Documentation](https://dashflo.net/docs/api/pterodactyl/v1/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

## Version [0.9.0] - 2025-03-09

### Build Information
- Type: Development
- Build Number: 098
- Architecture: Node.js 18.x

### Added
- Initial implementation of all core features
- Basic testing framework
- CI/CD pipeline with GitHub Actions
- Docker containerization

### Changed
- Refactored command structure
- Improved error handling
- Enhanced database models

### Known Issues
- Incomplete documentation
- Some features not fully tested
- Performance optimizations needed

---

<div align="center">

© 2025 JMFHosting. All Rights Reserved.  
Developed by [Nanaimo2013](https://github.com/Nanaimo2013)

</div> 