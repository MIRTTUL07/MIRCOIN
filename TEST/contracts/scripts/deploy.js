const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying DNSRegistry contract...");

  // Get the contract factory
  const DNSRegistry = await ethers.getContractFactory("DNSRegistry");

  // Deploy the contract
  const dnsRegistry = await DNSRegistry.deploy();

  // Wait for deployment to complete
  await dnsRegistry.deployed();

  console.log("DNSRegistry deployed to:", dnsRegistry.address);
  console.log("Transaction hash:", dnsRegistry.deployTransaction.hash);

  // Save deployment info
  const deploymentInfo = {
    contractAddress: dnsRegistry.address,
    transactionHash: dnsRegistry.deployTransaction.hash,
    blockNumber: dnsRegistry.deployTransaction.blockNumber,
    deployer: (await ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    network: await ethers.provider.getNetwork()
  };

  console.log("Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  // Verify initial state
  const registrationFee = await dnsRegistry.registrationFee();
  const totalDomains = await dnsRegistry.getTotalDomains();
  
  console.log("Initial registration fee:", ethers.utils.formatEther(registrationFee), "ETH");
  console.log("Initial total domains:", totalDomains.toString());

  return dnsRegistry;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
