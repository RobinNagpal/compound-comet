import { ethers, event, expect, makeConfigurator, wait } from "./helpers";
import {
  CometProxyAdmin__factory,
  SimpleTimelock__factory,
  TransparentUpgradeableProxy__factory,
} from "../build/types";
import hre from "hardhat";
import { network } from "hardhat";
async function initializeAndFundGovernorTimelock() {
  const signers = await ethers.getSigners();
  const gov = signers[0];
  const TimelockFactory = (await ethers.getContractFactory(
    "SimpleTimelock"
  )) as SimpleTimelock__factory;
  const timelock = await TimelockFactory.deploy(gov.address);
  const timelockAddress = await timelock.deployed();

  // Impersonate the account
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [timelockAddress.address],
  });

  // Fund the impersonated account
  await gov.sendTransaction({
    to: timelock.address,
    value: ethers.utils.parseEther("1.0"), // Sending 1 Ether to cover gas fees
  });

  // Get the signer from the impersonated account
  const signer = await ethers.getSigner(timelockAddress.address);
  return { signer, timelock };
}

async function initializeMarketAdminTimelock() {
  const {
    signer: governorSigner,
    timelock: governorTimelock,
  } = await initializeAndFundGovernorTimelock();
  const signers = await ethers.getSigners();
  const gov = signers[0];
  const marketAdmin = signers[2];
  const MarketAdminTimelockFactory = await ethers.getContractFactory(
    "MarketAdminTimelock"
  );
  const marketAdminTimelock = await MarketAdminTimelockFactory.deploy(
    governorTimelock.address,
    0
  );
  const marketAdminTimelockAddress = await marketAdminTimelock.deployed();

  // Impersonate the account
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [marketAdminTimelockAddress.address],
  });

  // Fund the impersonated account
  await gov.sendTransaction({
    to: marketAdminTimelock.address,
    value: ethers.utils.parseEther("1.0"), // Sending 1 Ether to cover gas fees
  });

  // Get the signer from the impersonated account
  const marketAdminSigner = await ethers.getSigner(
    marketAdminTimelockAddress.address
  );

  await marketAdminTimelock
    .connect(governorSigner)
    .setMarketAdmin(marketAdminTimelock.address);

  return {
    governorSigner,
    governorTimelock,
    marketAdmin,
    marketAdminSigner,
    marketAdminTimelock,
  };
}

describe.only("configuration market admin", function() {
  it("Comet's Proxy's admin is set as CometProxyAdmin - Test for access.", async () => {
    const {
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const cometAsProxy = comet.attach(cometProxy.address);
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(await comet.governor());

    const oldGovernor = await comet.governor();
    const newGovernor = alice.address;
    const txn = await wait(
      configuratorAsProxy.setGovernor(cometProxy.address, newGovernor)
    );
    await wait(
      proxyAdmin.deployAndUpgradeTo(
        configuratorProxy.address,
        cometProxy.address
      )
    );

    expect(event(txn, 0)).to.be.deep.equal({
      SetGovernor: {
        cometProxy: cometProxy.address,
        oldGovernor,
        newGovernor,
      },
    });
    expect(oldGovernor).to.be.not.equal(newGovernor);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(newGovernor);
    expect(await cometAsProxy.governor()).to.be.equal(newGovernor);
  });
  it("Comet's Proxy's admin is set as CometProxyAdmin - Test for non-access.", async () => {
    const {
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      users: [alice, bob],
    } = await makeConfigurator();

    // Deploy ProxyAdmin
    const ProxyAdmin = (await ethers.getContractFactory(
      "CometProxyAdmin"
    )) as CometProxyAdmin__factory;
    const proxyAdminTemp = await ProxyAdmin.connect(bob).deploy();
    await proxyAdminTemp.deployed();

    // Deploy Comet proxy
    const CometProxy = (await ethers.getContractFactory(
      "TransparentUpgradeableProxy"
    )) as TransparentUpgradeableProxy__factory;
    const cometProxy = await CometProxy.deploy(
      comet.address,
      proxyAdminTemp.address,
      (await comet.populateTransaction.initializeStorage()).data
    );
    await cometProxy.deployed();

    const cometAsProxy = comet.attach(cometProxy.address);
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    const oldGovernor = await comet.governor();
    const newGovernor = alice.address;
    const txn = await wait(
      configuratorAsProxy.setGovernor(cometProxy.address, newGovernor)
    );
    await expect(
      proxyAdmin.deployAndUpgradeTo(
        configuratorProxy.address,
        cometProxy.address
      )
    ).to.be.reverted;
  });
  it("New CometProxyAdmin's owner is governor-timelock - Test for access", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      governor,
      configurator,
      configuratorProxy,
      cometProxy,
      proxyAdmin,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governorTimelock.address);

    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );

    await governorTimelock.executeTransactions(
      [proxyAdmin.address],
      [0],
      ["deployAndUpgradeTo(address,address)"],
      [deployAndUpgradeToCalldata]
    );
  });

  it("New CometProxyAdmin's owner is governor-timelock - Test for non-access.", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      governor,
      configurator,
      configuratorProxy,
      cometProxy,
      proxyAdmin,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governor.address);

    let setGovernorCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );

    expect(
      governorTimelock
        .connect(alice)
        .executeTransactions(
          [configuratorProxy.address, proxyAdmin.address],
          [0, 0],
          [
            "setGovernor(address,address)",
            "deployAndUpgradeTo(address,address)",
          ],
          [setGovernorCalldata, deployAndUpgradeToCalldata]
        )
    ).to.be.revertedWithCustomError(governorTimelock, "Unauthorized");
  });
  it("New CometProxyAdmin's marketAdmin is market-admin-timelock - Test for access", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      governor,
      configurator,
      configuratorProxy,
      cometProxy,
      comet,
      proxyAdmin,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governor.address);

    const {
      marketAdmin,
      marketAdminTimelock,
    } = await initializeMarketAdminTimelock();

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [marketAdminTimelock.address]
    );
    await governorTimelock.executeTransactions(
      [proxyAdmin.address, configuratorProxy.address],
      [0, 0],
      ["setMarketAdmin(address)", "setMarketAdmin(address)"],
      [setMarketAdminCalldata, setMarketAdminCalldata]
    );
    expect(await proxyAdmin.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
    );

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );
    await marketAdminTimelock
      .connect(marketAdmin)
      .executeTransaction(
        [configuratorProxy.address, proxyAdmin.address],
        [0, 0],
        [
          "setSupplyKink(address,uint64)",
          "deployAndUpgradeTo(address,address)",
        ],
        [setSupplyKinkCalldata, deployAndUpgradeToCalldata]
      );

    const cometAsProxy = comet.attach(cometProxy.address);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
    expect(await cometAsProxy.supplyKink()).to.be.equal(newKink);
  });
  it("New CometProxyAdmin's marketAdmin is market-admin-timelock - Test for non-access.", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      governor,
      configurator,
      configuratorProxy,
      cometProxy,
      proxyAdmin,
      users: [alice, bob],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governor.address);

    const {
      marketAdmin,
      marketAdminTimelock,
    } = await initializeMarketAdminTimelock();
    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [marketAdminTimelock.address]
    );
    await governorTimelock.executeTransactions(
      [proxyAdmin.address, configuratorProxy.address],
      [0, 0],
      ["setMarketAdmin(address)", "setMarketAdmin(address)"],
      [setMarketAdminCalldata, setMarketAdminCalldata]
    );
    expect(await proxyAdmin.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
    );

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );
    await expect(
      marketAdminTimelock
        .connect(bob)
        .executeTransaction(
          [configuratorProxy.address, proxyAdmin.address],
          [0, 0],
          [
            "setSupplyKink(address,uint64)",
            "deployAndUpgradeTo(address,address)",
          ],
          [setSupplyKinkCalldata, deployAndUpgradeToCalldata]
        )
    ).to.be.revertedWithCustomError(marketAdminTimelock, "Unauthorized");
  });
  it("Configurator's governor is set as governor-timelock - Test for access", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This works fine as configurator's governor is set as timelock
    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setPauseGuardian(address,address)"],
      [setPauseGuardianCalldata]
    );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .pauseGuardian
    ).to.be.equal(alice.address);
  });
  it("Configurator's governor is set as governor-timelock - Test for non-access.", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    await expect(
      governorTimelock.connect(alice).executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(governorTimelock, "Unauthorized");
  });
  it("Configurator's marketAdmin is set as marker-admin-timelock - Test for access", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      proxyAdmin,
      configurator,
      configuratorProxy,
      cometProxy,
      comet,
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    const {
      marketAdmin,
      marketAdminTimelock,
    } = await initializeMarketAdminTimelock();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [marketAdminTimelock.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address, proxyAdmin.address],
      [0, 0],
      ["setMarketAdmin(address)", "setMarketAdmin(address)"],
      [setMarketAdminCalldata, setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
    );
    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );

    const deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );
    await marketAdminTimelock.connect(marketAdmin).executeTransaction(
      [configuratorProxy.address, proxyAdmin.address],
      [0, 0], // no Ether to be sent
      ["setSupplyKink(address,uint64)", "deployAndUpgradeTo(address,address)"],
      [setSupplyKinkCalldata, deployAndUpgradeToCalldata]
    );
    const cometAsProxy = comet.attach(cometProxy.address);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
    expect(await cometAsProxy.supplyKink()).to.be.equal(newKink);
  });
  it("Configurator's marketAdmin is set as marker-admin-timelock - Test for non-access.", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const {
      marketAdmin,
      marketAdminTimelock,
    } = await initializeMarketAdminTimelock();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [marketAdmin.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setMarketAdmin(address)"],
      [setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdmin.address
    );

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This will revert as calling with the market admin timelock which doesnt have access
    await expect(
      marketAdminTimelock.executeTransaction(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(marketAdminTimelock, "Unauthorized");
  });
  it("governor-timelock's admin is set as Governor - Test for access", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This works fine as governor is set as timelock's admin
    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setPauseGuardian(address,address)"],
      [setPauseGuardianCalldata]
    );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .pauseGuardian
    ).to.be.equal(alice.address);
  });
  it("governor-timelock's admin is set as Governor - Test for non-access.", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This will revert as alice is calling the timelock
    await expect(
      governorTimelock.connect(alice).executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(governorTimelock, "Unauthorized");
  });
  it("market-admin-timelock's admin is set as market-admin - Test for access", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
    } = await makeConfigurator({
      governor: signer,
    });

    const {
      marketAdmin,
      marketAdminTimelock,
    } = await initializeMarketAdminTimelock();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [marketAdminTimelock.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setMarketAdmin(address)"],
      [setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
    );

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );

    // This works fine as market admin is set as timelock's admin
    await marketAdminTimelock.connect(marketAdmin).executeTransaction(
      [configuratorProxy.address],
      [0], // no Ether to be sent
      ["setSupplyKink(address,uint64)"],
      [setSupplyKinkCalldata]
    );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
  });
  it("market-admin-timelock's admin is set as market-admin - Test for non-access.", async () => {
    const {
      signer,
      timelock: governorTimelock,
    } = await initializeAndFundGovernorTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [bob],
    } = await makeConfigurator({
      governor: signer,
    });

    const {
      marketAdmin,
      marketAdminTimelock,
    } = await initializeMarketAdminTimelock();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [marketAdminTimelock.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setMarketAdmin(address)"],
      [setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
    );

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );

    // This will revert cause bob doesnt have access
    await expect(
      marketAdminTimelock.connect(bob).executeTransaction(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setSupplyKink(address,uint64)"],
        [setSupplyKinkCalldata]
      )
    ).to.be.revertedWithCustomError(marketAdminTimelock, "Unauthorized");
  });
  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for access", async () => {
    const {
      marketAdmin,
      marketAdminTimelock,
      governorSigner,
    } = await initializeMarketAdminTimelock();
    const {
      users: [newAdmin],
    } = await makeConfigurator({
      governor: governorSigner,
    });
    const oldAdmin = await marketAdminTimelock.admin();
    const txn = await wait(
      marketAdminTimelock.connect(governorSigner).setAdmin(newAdmin.address)
    );

    expect(event(txn, 0)).to.be.deep.equal({
      NewAdmin: {
        oldAdmin: oldAdmin,
        newAdmin: newAdmin.address,
      },
    });

    expect(await marketAdminTimelock.admin()).to.be.equal(newAdmin.address);
  });
  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for non-access", async () => {
    const {
      marketAdmin,
      marketAdminTimelock,
      governorSigner,
    } = await initializeMarketAdminTimelock();
    const {
      users: [nonAdmin],
    } = await makeConfigurator({
      governor: governorSigner,
    });
    const oldAdmin = await marketAdminTimelock.admin();

    await expect(
      marketAdminTimelock.connect(marketAdmin).setAdmin(nonAdmin.address)
    ).to.be.revertedWith("Timelock::setAdmin: Call must come from admin.");
  });
  it("Ensure governor or market admin can call the queue, cancel or execure transaction on marketAdminTimelock - Test for access", async () => {
    const {
      marketAdmin,
      marketAdminSigner,
      marketAdminTimelock,
      governorSigner,
    } = await initializeMarketAdminTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
    } = await makeConfigurator({
      governor: governorSigner,
    });
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy
      .connect(governorSigner)
      .setMarketAdmin(marketAdminTimelock.address);

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );

    const eta = (await ethers.provider.getBlock("latest")).timestamp + 1000;

    await marketAdminTimelock
      .connect(governorSigner)
      .queueTransaction(
        configuratorProxy.address,
        0,
        "setSupplyKink(address,uint64)",
        setSupplyKinkCalldata,
        eta
      );
    await marketAdminTimelock
      .connect(governorSigner)
      .cancelTransaction(
        configuratorProxy.address,
        0,
        "setSupplyKink(address,uint64)",
        setSupplyKinkCalldata,
        eta
      );
    await marketAdminTimelock
      .connect(governorSigner)
      .queueTransaction(
        configuratorProxy.address,
        0,
        "setSupplyKink(address,uint64)",
        setSupplyKinkCalldata,
        eta
      );
    await network.provider.send("evm_increaseTime", [1000]);
    await network.provider.send("evm_mine");

    await marketAdminTimelock
      .connect(governorSigner)
      .executeTransaction(
        configuratorProxy.address,
        0,
        "setSupplyKink(address,uint64)",
        setSupplyKinkCalldata,
        eta
      );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
  });
  it("Ensure governor or market admin can call the queue, cancel or execute transaction on marketAdminTimelock - Test for non-access", async () => {
    const {
      marketAdmin,
      marketAdminSigner,
      marketAdminTimelock,
      governorSigner,
    } = await initializeMarketAdminTimelock();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [newPauseGuardian, nonAdmin],
    } = await makeConfigurator({
      governor: governorSigner,
    });
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, newPauseGuardian.address]
    );
    const eta = Math.floor(Date.now() / 1000);
    await expect(
      marketAdminTimelock
        .connect(nonAdmin)
        .queueTransaction(
          configuratorProxy.address,
          0,
          "setPauseGuardian(address,address)",
          setPauseGuardianCalldata,
          eta
        )
    ).to.be.revertedWith(
      "Unauthorized: call must come from admin or marketAdmin"
    );
    await expect(
      marketAdminTimelock
        .connect(nonAdmin)
        .cancelTransaction(
          configuratorProxy.address,
          0,
          "setPauseGuardian(address,address)",
          setPauseGuardianCalldata,
          eta
        )
    ).to.be.revertedWith(
      "Unauthorized: call must come from admin or marketAdmin"
    );
    await expect(
      marketAdminTimelock
        .connect(nonAdmin)
        .executeTransaction(
          configuratorProxy.address,
          0,
          "setPauseGuardian(address,address)",
          setPauseGuardianCalldata,
          eta
        )
    ).to.be.revertedWith(
      "Unauthorized: call must come from admin or marketAdmin"
    );
  });
});
