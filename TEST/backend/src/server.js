const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');
const NodeCache = require('node-cache');
const winston = require('winston');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Cache for DNS records (TTL: 5 minutes)
const cache = new NodeCache({ stdTTL: 300 });

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ddns-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Blockchain connection
let provider;
let contract;
let contractAddress;

// Contract ABI (simplified for key functions)
const contractABI = [
  "function resolveDomain(string memory _domain) external view returns (tuple(uint256 id, string domain, string ipAddress, address owner, uint256 timestamp, uint256 expirationTime, bool isActive, string recordType, string additionalData))",
  "function isDomainAvailable(string memory _domain) external view returns (bool)",
  "function getTotalDomains() external view returns (uint256)",
  "function domainExists(string memory _domain) external view returns (bool)",
  "function getOwnerDomains(address _owner) external view returns (string[] memory)"
];

// Initialize blockchain connection
async function initializeBlockchain() {
  try {
    // Connect to local Hardhat network or specified RPC
    const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Contract address should be set after deployment
    contractAddress = process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      logger.warn('Contract address not set. Some features may not work.');
      return;
    }
    
    contract = new ethers.Contract(contractAddress, contractABI, provider);
    logger.info(`Connected to blockchain at ${rpcUrl}`);
    logger.info(`Contract address: ${contractAddress}`);
    
    // Test connection
    const totalDomains = await contract.getTotalDomains();
    logger.info(`Total domains registered: ${totalDomains.toString()}`);
    
  } catch (error) {
    logger.error('Failed to initialize blockchain connection:', error);
  }
}

// Validation schemas
const domainSchema = Joi.string().min(1).max(255).required();
const addressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    blockchain: {
      connected: !!contract,
      contractAddress: contractAddress || 'Not set'
    }
  });
});

// DNS Resolution endpoint
app.get('/api/resolve/:domain', async (req, res) => {
  try {
    const { error, value: domain } = domainSchema.validate(req.params.domain);
    if (error) {
      return res.status(400).json({
        error: 'Invalid domain format',
        details: error.details[0].message
      });
    }

    // Check cache first
    const cacheKey = `resolve_${domain}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info(`Cache hit for domain: ${domain}`);
      return res.json({
        ...cachedResult,
        cached: true
      });
    }

    if (!contract) {
      return res.status(503).json({
        error: 'Blockchain connection not available'
      });
    }

    // Resolve domain from blockchain
    const record = await contract.resolveDomain(domain);
    
    const result = {
      domain: record.domain,
      ipAddress: record.ipAddress,
      owner: record.owner,
      timestamp: new Date(record.timestamp.toNumber() * 1000).toISOString(),
      expirationTime: new Date(record.expirationTime.toNumber() * 1000).toISOString(),
      isActive: record.isActive,
      recordType: record.recordType,
      additionalData: record.additionalData,
      resolved: true,
      cached: false
    };

    // Cache the result
    cache.set(cacheKey, result);
    
    logger.info(`Successfully resolved domain: ${domain}`);
    res.json(result);

  } catch (error) {
    logger.error(`Error resolving domain ${req.params.domain}:`, error);
    
    if (error.message.includes('Domain does not exist')) {
      return res.status(404).json({
        error: 'Domain not found',
        domain: req.params.domain,
        resolved: false
      });
    }
    
    if (error.message.includes('Domain expired')) {
      return res.status(410).json({
        error: 'Domain expired',
        domain: req.params.domain,
        resolved: false
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to resolve domain'
    });
  }
});

// Check domain availability
app.get('/api/available/:domain', async (req, res) => {
  try {
    const { error, value: domain } = domainSchema.validate(req.params.domain);
    if (error) {
      return res.status(400).json({
        error: 'Invalid domain format',
        details: error.details[0].message
      });
    }

    if (!contract) {
      return res.status(503).json({
        error: 'Blockchain connection not available'
      });
    }

    const isAvailable = await contract.isDomainAvailable(domain);
    
    res.json({
      domain,
      available: isAvailable,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error checking availability for domain ${req.params.domain}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to check domain availability'
    });
  }
});

// Get domains owned by an address
app.get('/api/domains/:address', async (req, res) => {
  try {
    const { error, value: address } = addressSchema.validate(req.params.address);
    if (error) {
      return res.status(400).json({
        error: 'Invalid address format',
        details: error.details[0].message
      });
    }

    if (!contract) {
      return res.status(503).json({
        error: 'Blockchain connection not available'
      });
    }

    const domains = await contract.getOwnerDomains(address);
    
    res.json({
      owner: address,
      domains: domains,
      count: domains.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error getting domains for address ${req.params.address}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get domains'
    });
  }
});

// Get blockchain stats
app.get('/api/stats', async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: 'Blockchain connection not available'
      });
    }

    const totalDomains = await contract.getTotalDomains();
    
    res.json({
      totalDomains: totalDomains.toNumber(),
      contractAddress,
      network: await provider.getNetwork(),
      blockNumber: await provider.getBlockNumber(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting blockchain stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get stats'
    });
  }
});

// Batch resolve multiple domains
app.post('/api/resolve/batch', async (req, res) => {
  try {
    const { domains } = req.body;
    
    if (!Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({
        error: 'Invalid request. Expected array of domains.'
      });
    }

    if (domains.length > 10) {
      return res.status(400).json({
        error: 'Too many domains. Maximum 10 domains per batch request.'
      });
    }

    if (!contract) {
      return res.status(503).json({
        error: 'Blockchain connection not available'
      });
    }

    const results = [];
    
    for (const domain of domains) {
      try {
        const { error } = domainSchema.validate(domain);
        if (error) {
          results.push({
            domain,
            error: 'Invalid domain format',
            resolved: false
          });
          continue;
        }

        // Check cache first
        const cacheKey = `resolve_${domain}`;
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
          results.push({
            ...cachedResult,
            cached: true
          });
          continue;
        }

        const record = await contract.resolveDomain(domain);
        
        const result = {
          domain: record.domain,
          ipAddress: record.ipAddress,
          owner: record.owner,
          timestamp: new Date(record.timestamp.toNumber() * 1000).toISOString(),
          expirationTime: new Date(record.expirationTime.toNumber() * 1000).toISOString(),
          isActive: record.isActive,
          recordType: record.recordType,
          additionalData: record.additionalData,
          resolved: true,
          cached: false
        };

        // Cache the result
        cache.set(cacheKey, result);
        results.push(result);

      } catch (error) {
        results.push({
          domain,
          error: error.message.includes('Domain does not exist') ? 'Domain not found' : 'Resolution failed',
          resolved: false
        });
      }
    }

    res.json({
      results,
      total: domains.length,
      resolved: results.filter(r => r.resolved).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in batch resolve:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Batch resolve failed'
    });
  }
});

// Clear cache endpoint (for development)
app.delete('/api/cache', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      error: 'Cache clearing only available in development mode'
    });
  }
  
  cache.flushAll();
  res.json({
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeBlockchain();
    
    app.listen(PORT, () => {
      logger.info(`dDNS Backend server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
