// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title DNSRegistry
 * @dev Decentralized DNS Registry for managing domain records on blockchain
 */
contract DNSRegistry is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Counter for domain IDs
    Counters.Counter private _domainIds;
    
    // Struct to represent a DNS record
    struct DNSRecord {
        uint256 id;
        string domain;
        string ipAddress;
        address owner;
        uint256 timestamp;
        uint256 expirationTime;
        bool isActive;
        string recordType; // A, AAAA, CNAME, MX, etc.
        string additionalData; // For complex record types
    }
    
    // Mapping from domain name to DNS record
    mapping(string => DNSRecord) public domainRecords;
    
    // Mapping from domain ID to domain name
    mapping(uint256 => string) public idToDomain;
    
    // Mapping from owner address to list of owned domains
    mapping(address => string[]) public ownerDomains;
    
    // Mapping to check if domain exists
    mapping(string => bool) public domainExists;
    
    // Registration fee in wei
    uint256 public registrationFee = 0.01 ether;
    
    // Domain registration period (1 year in seconds)
    uint256 public constant REGISTRATION_PERIOD = 365 days;
    
    // Events
    event DomainRegistered(
        uint256 indexed domainId,
        string indexed domain,
        address indexed owner,
        string ipAddress,
        uint256 expirationTime
    );
    
    event DomainUpdated(
        string indexed domain,
        address indexed owner,
        string newIpAddress,
        string recordType
    );
    
    event DomainTransferred(
        string indexed domain,
        address indexed fromOwner,
        address indexed toOwner
    );
    
    event DomainRenewed(
        string indexed domain,
        address indexed owner,
        uint256 newExpirationTime
    );
    
    event DomainRevoked(
        string indexed domain,
        address indexed owner
    );
    
    constructor() {}
    
    /**
     * @dev Register a new domain
     * @param _domain The domain name to register
     * @param _ipAddress The IP address to associate with the domain
     * @param _recordType The type of DNS record (A, AAAA, CNAME, etc.)
     * @param _additionalData Additional data for complex record types
     */
    function registerDomain(
        string memory _domain,
        string memory _ipAddress,
        string memory _recordType,
        string memory _additionalData
    ) external payable nonReentrant {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(!domainExists[_domain], "Domain already registered");
        require(bytes(_domain).length > 0, "Domain cannot be empty");
        require(bytes(_ipAddress).length > 0, "IP address cannot be empty");
        
        _domainIds.increment();
        uint256 newDomainId = _domainIds.current();
        
        uint256 expirationTime = block.timestamp + REGISTRATION_PERIOD;
        
        DNSRecord memory newRecord = DNSRecord({
            id: newDomainId,
            domain: _domain,
            ipAddress: _ipAddress,
            owner: msg.sender,
            timestamp: block.timestamp,
            expirationTime: expirationTime,
            isActive: true,
            recordType: _recordType,
            additionalData: _additionalData
        });
        
        domainRecords[_domain] = newRecord;
        idToDomain[newDomainId] = _domain;
        ownerDomains[msg.sender].push(_domain);
        domainExists[_domain] = true;
        
        emit DomainRegistered(newDomainId, _domain, msg.sender, _ipAddress, expirationTime);
    }
    
    /**
     * @dev Update an existing domain record
     * @param _domain The domain name to update
     * @param _ipAddress The new IP address
     * @param _recordType The new record type
     * @param _additionalData New additional data
     */
    function updateDomain(
        string memory _domain,
        string memory _ipAddress,
        string memory _recordType,
        string memory _additionalData
    ) external {
        require(domainExists[_domain], "Domain does not exist");
        require(domainRecords[_domain].owner == msg.sender, "Not domain owner");
        require(domainRecords[_domain].expirationTime > block.timestamp, "Domain expired");
        require(domainRecords[_domain].isActive, "Domain is not active");
        
        domainRecords[_domain].ipAddress = _ipAddress;
        domainRecords[_domain].recordType = _recordType;
        domainRecords[_domain].additionalData = _additionalData;
        domainRecords[_domain].timestamp = block.timestamp;
        
        emit DomainUpdated(_domain, msg.sender, _ipAddress, _recordType);
    }
    
    /**
     * @dev Transfer domain ownership
     * @param _domain The domain to transfer
     * @param _newOwner The new owner address
     */
    function transferDomain(string memory _domain, address _newOwner) external {
        require(domainExists[_domain], "Domain does not exist");
        require(domainRecords[_domain].owner == msg.sender, "Not domain owner");
        require(_newOwner != address(0), "Invalid new owner address");
        require(domainRecords[_domain].expirationTime > block.timestamp, "Domain expired");
        
        address oldOwner = domainRecords[_domain].owner;
        domainRecords[_domain].owner = _newOwner;
        
        // Remove from old owner's list
        _removeDomainFromOwner(oldOwner, _domain);
        
        // Add to new owner's list
        ownerDomains[_newOwner].push(_domain);
        
        emit DomainTransferred(_domain, oldOwner, _newOwner);
    }
    
    /**
     * @dev Renew domain registration
     * @param _domain The domain to renew
     */
    function renewDomain(string memory _domain) external payable nonReentrant {
        require(domainExists[_domain], "Domain does not exist");
        require(domainRecords[_domain].owner == msg.sender, "Not domain owner");
        require(msg.value >= registrationFee, "Insufficient renewal fee");
        
        domainRecords[_domain].expirationTime += REGISTRATION_PERIOD;
        
        emit DomainRenewed(_domain, msg.sender, domainRecords[_domain].expirationTime);
    }
    
    /**
     * @dev Resolve a domain to get its DNS record
     * @param _domain The domain to resolve
     * @return The DNS record for the domain
     */
    function resolveDomain(string memory _domain) external view returns (DNSRecord memory) {
        require(domainExists[_domain], "Domain does not exist");
        require(domainRecords[_domain].expirationTime > block.timestamp, "Domain expired");
        require(domainRecords[_domain].isActive, "Domain is not active");
        
        return domainRecords[_domain];
    }
    
    /**
     * @dev Get domains owned by an address
     * @param _owner The owner address
     * @return Array of domain names owned by the address
     */
    function getOwnerDomains(address _owner) external view returns (string[] memory) {
        return ownerDomains[_owner];
    }
    
    /**
     * @dev Check if a domain is available for registration
     * @param _domain The domain to check
     * @return True if domain is available, false otherwise
     */
    function isDomainAvailable(string memory _domain) external view returns (bool) {
        if (!domainExists[_domain]) {
            return true;
        }
        
        // Domain is available if it's expired
        return domainRecords[_domain].expirationTime <= block.timestamp;
    }
    
    /**
     * @dev Revoke a domain (only owner can do this)
     * @param _domain The domain to revoke
     */
    function revokeDomain(string memory _domain) external {
        require(domainExists[_domain], "Domain does not exist");
        require(domainRecords[_domain].owner == msg.sender, "Not domain owner");
        
        domainRecords[_domain].isActive = false;
        
        emit DomainRevoked(_domain, msg.sender);
    }
    
    /**
     * @dev Set registration fee (only owner)
     * @param _newFee The new registration fee in wei
     */
    function setRegistrationFee(uint256 _newFee) external onlyOwner {
        registrationFee = _newFee;
    }
    
    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Get total number of registered domains
     * @return The total count of domains
     */
    function getTotalDomains() external view returns (uint256) {
        return _domainIds.current();
    }
    
    /**
     * @dev Internal function to remove domain from owner's list
     * @param _owner The owner address
     * @param _domain The domain to remove
     */
    function _removeDomainFromOwner(address _owner, string memory _domain) internal {
        string[] storage domains = ownerDomains[_owner];
        for (uint256 i = 0; i < domains.length; i++) {
            if (keccak256(bytes(domains[i])) == keccak256(bytes(_domain))) {
                domains[i] = domains[domains.length - 1];
                domains.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Emergency function to clean up expired domains (only owner)
     * @param _domain The expired domain to clean up
     */
    function cleanupExpiredDomain(string memory _domain) external onlyOwner {
        require(domainExists[_domain], "Domain does not exist");
        require(domainRecords[_domain].expirationTime <= block.timestamp, "Domain not expired");
        
        address oldOwner = domainRecords[_domain].owner;
        
        // Remove from owner's list
        _removeDomainFromOwner(oldOwner, _domain);
        
        // Reset domain data
        delete domainRecords[_domain];
        delete idToDomain[domainRecords[_domain].id];
        domainExists[_domain] = false;
    }
}
