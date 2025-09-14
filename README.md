# 🪙 Mircoin

**Mircoin** is a lightweight, educational cryptocurrency and blockchain network built entirely in Python using Flask.  
It demonstrates the key building blocks of a decentralized crypto system—block creation, proof-of-work mining, transaction handling, peer-to-peer node synchronization, and now **an ICO (Initial Coin Offering) smart contract** for token distribution.

---

## ✨ Features

- **Blockchain Core**
  - Creates blocks with timestamp, proof, previous hash, and list of transactions
  - Uses SHA-256 hashing for integrity
  - Proof-of-work consensus with difficulty target (4 leading zeros)

- **Transactions**
  - Add sender/receiver/amount via REST
  - Automatic miner reward of **1 Mircoin** per mined block

- **Decentralized Network**
  - Register peer nodes (`/connect_node`)
  - Replace local chain with the longest valid one across the network (`/replace_chain`)

- **Mircoin ICO Smart Contract**
  - Added a simple **ICO (Initial Coin Offering)** smart contract for issuing Mircoin tokens
  - Enables token sale logic and distribution to early backers
  - Demonstrates integrating blockchain mining with a token launch mechanism

- **REST API Endpoints**
  | Endpoint | Method | Description |
  |----------|-------|-------------|
  | `/mine_block` | GET | Mine a new block and receive reward |
  | `/get_chain` | GET | Retrieve the entire blockchain |
  | `/is_valid` | GET | Validate chain integrity |
  | `/add_transaction` | POST | Add a new transaction |
  | `/connect_node` | POST | Register/Connect peer nodes |
  | `/replace_chain` | GET | Achieve consensus & sync with longest chain |
  | *ICO endpoints* | — | Expose smart contract functions for token sale (see `ico_smart_contract.sol`) |

- **Unique Node Address**
  - Each node gets an auto-generated UUID for mining rewards.

---

## 🛠 Tech Stack

- **Language:** Python 3
- **Framework:** Flask
- **Libraries:** `hashlib`, `datetime`, `requests`, `uuid`, `json`
- **Smart Contract:** Solidity (for the ICO)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/Mircoin.git
cd Mircoin
