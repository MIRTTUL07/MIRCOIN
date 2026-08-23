const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DNSRegistry", function () {
  let DNSRegistry;
  let dnsRegistry;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    DNSRegistry = await ethers.getContractFactory("DNSRegistry");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy a new DNSRegistry contract for each test
    dnsRegistry = await DNSRegistry.deploy();
    await dnsRegistry.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await dnsRegistry.owner()).to.equal(owner.address);
    });

    it("Should set the correct registration fee", async function () {
      expect(await dnsRegistry.registrationFee()).to.equal(ethers.utils.parseEther("0.01"));
    });

    it("Should start with zero domains", async function () {
      expect(await dnsRegistry.getTotalDomains()).to.equal(0);
    });
  });

  describe("Domain Registration", function () {
    it("Should register a new domain", async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await expect(
        dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
          value: registrationFee
        })
      )
        .to.emit(dnsRegistry, "DomainRegistered")
        .withArgs(1, domain, addr1.address, ipAddress, await getExpirationTime());

      expect(await dnsRegistry.domainExists(domain)).to.be.true;
      expect(await dnsRegistry.getTotalDomains()).to.equal(1);
    });

    it("Should fail to register domain with insufficient fee", async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const insufficientFee = ethers.utils.parseEther("0.005");

      await expect(
        dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
          value: insufficientFee
        })
      ).to.be.revertedWith("Insufficient registration fee");
    });

    it("Should fail to register already existing domain", async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      // Register domain first time
      await dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
        value: registrationFee
      });

      // Try to register same domain again
      await expect(
        dnsRegistry.connect(addr2).registerDomain(domain, ipAddress, recordType, additionalData, {
          value: registrationFee
        })
      ).to.be.revertedWith("Domain already registered");
    });

    it("Should fail to register empty domain", async function () {
      const domain = "";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await expect(
        dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
          value: registrationFee
        })
      ).to.be.revertedWith("Domain cannot be empty");
    });
  });

  describe("Domain Resolution", function () {
    beforeEach(async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
        value: registrationFee
      });
    });

    it("Should resolve existing domain", async function () {
      const domain = "example.ddns";
      const record = await dnsRegistry.resolveDomain(domain);

      expect(record.domain).to.equal(domain);
      expect(record.ipAddress).to.equal("192.168.1.1");
      expect(record.owner).to.equal(addr1.address);
      expect(record.recordType).to.equal("A");
      expect(record.isActive).to.be.true;
    });

    it("Should fail to resolve non-existing domain", async function () {
      await expect(dnsRegistry.resolveDomain("nonexistent.ddns")).to.be.revertedWith("Domain does not exist");
    });
  });

  describe("Domain Updates", function () {
    beforeEach(async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
        value: registrationFee
      });
    });

    it("Should update domain by owner", async function () {
      const domain = "example.ddns";
      const newIpAddress = "192.168.1.2";
      const newRecordType = "AAAA";
      const newAdditionalData = "updated";

      await expect(
        dnsRegistry.connect(addr1).updateDomain(domain, newIpAddress, newRecordType, newAdditionalData)
      )
        .to.emit(dnsRegistry, "DomainUpdated")
        .withArgs(domain, addr1.address, newIpAddress, newRecordType);

      const record = await dnsRegistry.resolveDomain(domain);
      expect(record.ipAddress).to.equal(newIpAddress);
      expect(record.recordType).to.equal(newRecordType);
      expect(record.additionalData).to.equal(newAdditionalData);
    });

    it("Should fail to update domain by non-owner", async function () {
      const domain = "example.ddns";
      const newIpAddress = "192.168.1.2";
      const newRecordType = "AAAA";
      const newAdditionalData = "updated";

      await expect(
        dnsRegistry.connect(addr2).updateDomain(domain, newIpAddress, newRecordType, newAdditionalData)
      ).to.be.revertedWith("Not domain owner");
    });
  });

  describe("Domain Transfer", function () {
    beforeEach(async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
        value: registrationFee
      });
    });

    it("Should transfer domain ownership", async function () {
      const domain = "example.ddns";

      await expect(dnsRegistry.connect(addr1).transferDomain(domain, addr2.address))
        .to.emit(dnsRegistry, "DomainTransferred")
        .withArgs(domain, addr1.address, addr2.address);

      const record = await dnsRegistry.resolveDomain(domain);
      expect(record.owner).to.equal(addr2.address);

      const addr1Domains = await dnsRegistry.getOwnerDomains(addr1.address);
      const addr2Domains = await dnsRegistry.getOwnerDomains(addr2.address);

      expect(addr1Domains.length).to.equal(0);
      expect(addr2Domains.length).to.equal(1);
      expect(addr2Domains[0]).to.equal(domain);
    });

    it("Should fail to transfer domain by non-owner", async function () {
      const domain = "example.ddns";

      await expect(
        dnsRegistry.connect(addr2).transferDomain(domain, addr2.address)
      ).to.be.revertedWith("Not domain owner");
    });
  });

  describe("Domain Renewal", function () {
    beforeEach(async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
        value: registrationFee
      });
    });

    it("Should renew domain", async function () {
      const domain = "example.ddns";
      const registrationFee = await dnsRegistry.registrationFee();

      const recordBefore = await dnsRegistry.resolveDomain(domain);
      const expirationBefore = recordBefore.expirationTime;

      await expect(
        dnsRegistry.connect(addr1).renewDomain(domain, { value: registrationFee })
      ).to.emit(dnsRegistry, "DomainRenewed");

      const recordAfter = await dnsRegistry.resolveDomain(domain);
      const expirationAfter = recordAfter.expirationTime;

      expect(expirationAfter.gt(expirationBefore)).to.be.true;
    });

    it("Should fail to renew with insufficient fee", async function () {
      const domain = "example.ddns";
      const insufficientFee = ethers.utils.parseEther("0.005");

      await expect(
        dnsRegistry.connect(addr1).renewDomain(domain, { value: insufficientFee })
      ).to.be.revertedWith("Insufficient renewal fee");
    });
  });

  describe("Domain Availability", function () {
    it("Should return true for available domain", async function () {
      const domain = "available.ddns";
      expect(await dnsRegistry.isDomainAvailable(domain)).to.be.true;
    });

    it("Should return false for registered domain", async function () {
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
        value: registrationFee
      });

      expect(await dnsRegistry.isDomainAvailable(domain)).to.be.false;
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to set registration fee", async function () {
      const newFee = ethers.utils.parseEther("0.02");
      await dnsRegistry.setRegistrationFee(newFee);
      expect(await dnsRegistry.registrationFee()).to.equal(newFee);
    });

    it("Should fail to set registration fee by non-owner", async function () {
      const newFee = ethers.utils.parseEther("0.02");
      await expect(
        dnsRegistry.connect(addr1).setRegistrationFee(newFee)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to withdraw funds", async function () {
      // Register a domain to add funds to contract
      const domain = "example.ddns";
      const ipAddress = "192.168.1.1";
      const recordType = "A";
      const additionalData = "";
      const registrationFee = await dnsRegistry.registrationFee();

      await dnsRegistry.connect(addr1).registerDomain(domain, ipAddress, recordType, additionalData, {
        value: registrationFee
      });

      const ownerBalanceBefore = await owner.getBalance();
      const contractBalance = await ethers.provider.getBalance(dnsRegistry.address);

      const tx = await dnsRegistry.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const ownerBalanceAfter = await owner.getBalance();
      const expectedBalance = ownerBalanceBefore.add(contractBalance).sub(gasUsed);

      expect(ownerBalanceAfter).to.equal(expectedBalance);
    });
  });

  // Helper function to get expected expiration time
  async function getExpirationTime() {
    const block = await ethers.provider.getBlock("latest");
    const REGISTRATION_PERIOD = 365 * 24 * 60 * 60; // 1 year in seconds
    return block.timestamp + REGISTRATION_PERIOD;
  }
});
