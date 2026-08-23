# Decentralized DNS Resolver (dDNS)

A Web3-inspired Decentralized DNS Resolver system that replaces centralized DNS with secure, user-owned blockchain-like records.

## 🌟 Features

- **Decentralized Domain Registration**: Register domains on blockchain with cryptographic ownership
- **Secure DNS Resolution**: Tamper-proof domain records stored on blockchain
- **User-Owned Records**: Complete control over your digital identity
- **Fast Resolution**: Intelligent caching and optimized blockchain queries
- **Web3 Integration**: MetaMask wallet connectivity
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## 🏗️ Architecture

The dDNS system consists of three main components:

1. **Smart Contracts** (`/contracts`): Solidity contracts for domain registration and management
2. **Backend API** (`/backend`): Node.js/Express server for DNS resolution and blockchain interaction
3. **Frontend** (`/frontend`): Next.js React application for user interface

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- MetaMask browser extension

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd decentralized-dns-resolver
```

2. Install all dependencies:
```bash
npm run install:all
```

### Development Setup

1. **Start the local blockchain**:
```bash
npm run start:hardhat
```

2. **Deploy smart contracts**:
```bash
npm run deploy:contracts
```

3. **Start the development servers**:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Hardhat Network: http://localhost:8545

## 📁 Project Structure

```
decentralized-dns-resolver/
├── contracts/                 # Smart contracts
│   ├── contracts/
│   │   └── DNSRegistry.sol    # Main DNS registry contract
│   ├── scripts/
│   │   └── deploy.js          # Deployment script
│   ├── test/
│   │   └── DNSRegistry.test.js # Contract tests
│   ├── hardhat.config.js      # Hardhat configuration
│   └── package.json
├── backend/                   # Backend API server
│   ├── src/
│   │   └── server.js          # Main server file
│   └── package.json
├── frontend/                  # Frontend React app
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx       # Main page
│   │       └── globals.css    # Global styles
│   ├── next.config.js         # Next.js configuration
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── tsconfig.json          # TypeScript configuration
│   └── package.json
└── package.json               # Root package.json
```

## 🔧 Smart Contract

The `DNSRegistry.sol` contract provides:

- **Domain Registration**: Register domains with IP addresses and metadata
- **Domain Resolution**: Resolve domains to IP addresses and owner information
- **Domain Management**: Update, transfer, and renew domain registrations
- **Access Control**: Owner-only functions for domain management
- **Expiration Handling**: Automatic domain expiration and renewal system

### Key Functions

- `registerDomain(domain, ipAddress, recordType, additionalData)`: Register a new domain
- `resolveDomain(domain)`: Resolve a domain to its DNS record
- `updateDomain(domain, ipAddress, recordType, additionalData)`: Update domain record
- `transferDomain(domain, newOwner)`: Transfer domain ownership
- `renewDomain(domain)`: Renew domain registration

## 🌐 API Endpoints

The backend provides RESTful API endpoints:

- `GET /api/resolve/:domain` - Resolve a domain
- `GET /api/available/:domain` - Check domain availability
- `GET /api/domains/:address` - Get domains owned by an address
- `GET /api/stats` - Get blockchain statistics
- `POST /api/resolve/batch` - Batch resolve multiple domains
- `GET /health` - Health check endpoint

## 🎨 Frontend Features

- **Domain Search**: Search and resolve decentralized domains
- **Wallet Integration**: Connect MetaMask wallet
- **Domain Display**: Beautiful display of resolved domain records
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Stats**: Live blockchain statistics

## 🧪 Testing

Run smart contract tests:
```bash
npm run test
```

## 🚀 Deployment

### Local Development
1. Start Hardhat network: `npm run start:hardhat`
2. Deploy contracts: `npm run deploy:contracts`
3. Start services: `npm run dev`

### Production Deployment
1. Configure environment variables
2. Deploy contracts to desired network
3. Update contract addresses in environment
4. Deploy backend and frontend services

## 🔐 Environment Variables

Create `.env` files in respective directories:

### Backend (.env)
```
PORT=3001
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<deployed_contract_address>
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed_contract_address>
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [Documentation](https://docs.example.com)
- [Community](https://discord.gg/example)
- [Issues](https://github.com/example/issues)

## ⚠️ Disclaimer

This is a demonstration project for educational purposes. Use at your own risk in production environments.
