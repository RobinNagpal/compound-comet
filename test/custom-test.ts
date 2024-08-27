import { ethers, event, expect, makeConfigurator, wait } from "./helpers";
import {
  CometProxyAdmin__factory,
  SimpleTimelock__factory,
  TransparentUpgradeableProxy__factory,
} from "../build/types";

describe("configuration market admin", function() {
  it("Comet's Proxy's admin is set as CometProxyAdmin", async () => {
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

    const ProxyAdmin = (await ethers.getContractFactory(
      "CometProxyAdmin"
    )) as CometProxyAdmin__factory;
    const proxyAdminTemp = await ProxyAdmin.connect(bob).deploy();
    await proxyAdminTemp.deployed();

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
    await wait(
      proxyAdmin.deployAndUpgradeTo(
        configuratorProxy.address,
        cometProxy.address
      )
    );
  });
  // it("New CometProxyAdmin's owner is governor-timelock - Add two(access and not access) test for it.", async () => {
  //   const {
  //     configurator,
  //     configuratorProxy,
  //     proxyAdmin,
  //     comet,
  //     cometProxy,
  //     users: [alice],
  //   } = await makeConfigurator();
  // });
  // it("New CometProxyAdmin's owner is governor-timelock - Test for non-access.", async () => {
  //   const {
  //     configurator,
  //     configuratorProxy,
  //     proxyAdmin,
  //     comet,
  //     users: [alice, bob],
  //   } = await makeConfigurator();
  // });
  // it("New CometProxyAdmin's marketAdmin is market-admin-timelock - Add two(access and not access) test for it.", async () => {
  //   const {
  //     configurator,
  //     configuratorProxy,
  //     proxyAdmin,
  //     comet,
  //     cometProxy,
  //     users: [alice],
  //   } = await makeConfigurator();
  // });
  // it("New CometProxyAdmin's marketAdmin is market-admin-timelock - Test for non-access.", async () => {
  //   const {
  //     configurator,
  //     configuratorProxy,
  //     proxyAdmin,
  //     comet,
  //     users: [alice, bob],
  //   } = await makeConfigurator();
  // });
  it("Configurator's governor is set as governor-timelock - Add two(access and not access) test for it.", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();
    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(governor.address);
    await governorTimelock.deployed();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(governorTimelock.address); // set timelock as governor of Configurator

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
  });
  it("Configurator's governor is set as governor-timelock - Test for non-access.", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();
    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(governor.address);
    await governorTimelock.deployed();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(alice.address); // set alice as governor of Configurator


    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This will revert as configurator's governor is set as Alice
    await expect(
      governorTimelock.executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWith("failed to call");
  });
  it("Configurator's marketAdmin is set as marker-admin-timelock - Add two(access and not access) test for it.", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const marketAdmin = alice;

    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(
      governor.address
    );
    await governorTimelock.deployed();

    const MarketAdminTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const marketAdminTimelock = await MarketAdminTimelockFactory.deploy(
      marketAdmin.address
    );
    await marketAdminTimelock.deployed();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(governorTimelock.address); // set timelock as governor of Configurator

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
    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );

    await
      marketAdminTimelock.executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setSupplyKink(address,uint64)"],
        [setSupplyKinkCalldata]
      );
      const deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "address"],
        [configuratorProxy.address, cometProxy.address]
      );
      await marketAdminTimelock.executeTransactions(
        [proxyAdmin.address],
        [0],
        ["deployAndUpgradeTo(address,address)"],
        [deployAndUpgradeToCalldata]
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
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const marketAdmin = alice;

    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(
      governor.address
    );
    await governorTimelock.deployed();

    const MarketAdminTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const marketAdminTimelock = await MarketAdminTimelockFactory.deploy(
      marketAdmin.address
    );
    await marketAdminTimelock.deployed();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(governorTimelock.address); // set timelock as governor of Configurator

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
      marketAdminTimelock.executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(marketAdminTimelock, "Unauthorized");
  });
  it("governor-timelock's admin is set as Governor - Add two(access and not access) test for it.", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();
    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(governor.address);
    await governorTimelock.deployed();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(governorTimelock.address); // set timelock as governor of Configurator


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
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();
    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(governor.address);
    await governorTimelock.deployed();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(governorTimelock.address); // set timelock as governor of Configurator

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
  it("market-admin-timelock's admin is set as market-admin - Add two(access and not access) test for it.", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const marketAdmin = alice;

    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(
      governor.address
    );
    await governorTimelock.deployed();

    const MarketAdminTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const marketAdminTimelock = await MarketAdminTimelockFactory.deploy(
      marketAdmin.address
    );
    await marketAdminTimelock.deployed();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(governorTimelock.address); // set timelock as governor of Configurator

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

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );

    // This works fine as market admin is set as timelock's admin
    await marketAdminTimelock.executeTransactions(
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
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const marketAdmin = alice;

    const GovernorTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const governorTimelock = await GovernorTimelockFactory.deploy(
      governor.address
    );
    await governorTimelock.deployed();

    const MarketAdminTimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const marketAdminTimelock = await MarketAdminTimelockFactory.deploy(
      marketAdmin.address
    );
    await marketAdminTimelock.deployed();

    expect(await marketAdminTimelock.admin()).to.be.equal(marketAdmin.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(governorTimelock.address); // set timelock as governor of Configurator

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
      marketAdminTimelock.executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(marketAdminTimelock, "Unauthorized");
  });
});
