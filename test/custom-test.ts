import { ethers, event, expect, makeConfigurator, wait } from "./helpers";
import { SimpleTimelock__factory } from "../build/types";

describe("configuration market admin", function() {
  it("reverts if setter is called from non-governor", async () => {
    const {
      configurator,
      configuratorProxy,
      users: [alice],
    } = await makeConfigurator();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    await expect(
      configuratorAsProxy.connect(alice).setMarketUpdateAdmin(alice.address)
    ).to.be.revertedWithCustomError(configuratorAsProxy, "Unauthorized");
  });
  it("set market update admin", async () => {
    const {
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    const oldAdmin = await configuratorAsProxy.marketUpdateAdmin();
    const newAdmin = alice.address;
    const txn = await wait(configuratorAsProxy.setMarketUpdateAdmin(newAdmin));
    await wait(
      proxyAdmin.deployAndUpgradeTo(
        configuratorProxy.address,
        cometProxy.address
      )
    );
    expect(event(txn, 0)).to.be.deep.equal({
      SetMarketUpdateAdmin: {
        oldAdmin,
        newAdmin,
      },
    });
    expect(oldAdmin).to.be.not.equal(newAdmin);
    expect(await configuratorAsProxy.marketUpdateAdmin()).to.be.equal(newAdmin);
  });
  it("reverts if market admin tries accessing non-accessible function", async () => {
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.setMarketUpdateAdmin(alice.address);
    await expect(
      configuratorAsProxy
        .connect(alice)
        .setExtensionDelegate(cometProxy.address, alice.address)
    ).to.be.revertedWithCustomError(configuratorAsProxy, "Unauthorized");
  });
  it("set supplyKink through market update admin", async () => {
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
    await configuratorAsProxy.setMarketUpdateAdmin(alice.address);
    const currentMarketAdmin = await configuratorAsProxy.marketUpdateAdmin();
    expect(currentMarketAdmin).to.equal(alice.address);
    const oldKink = (await comet.supplyKink()).toBigInt();
    const newKink = 100n;
    const txn = await wait(
      configuratorAsProxy
        .connect(alice)
        .setSupplyKink(cometProxy.address, newKink)
    );
    await wait(
      proxyAdmin.deployAndUpgradeTo(
        configuratorProxy.address,
        cometProxy.address
      )
    );

    expect(event(txn, 0)).to.be.deep.equal({
      SetSupplyKink: {
        cometProxy: cometProxy.address,
        oldKink,
        newKink,
      },
    });
    expect(oldKink).to.be.not.equal(newKink);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
    expect(await cometAsProxy.supplyKink()).to.be.equal(newKink);
  });
  it("reverts if configurator is paused for market admin", async () => {
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.setMarketUpdateAdmin(alice.address);
    const currentMarketAdmin = await configuratorAsProxy.marketUpdateAdmin();
    expect(currentMarketAdmin).to.equal(alice.address);
    await configuratorAsProxy.pause();
    expect(await configuratorAsProxy.paused()).to.be.equal(true);
    const newKink = 100n;
    await expect(
      configuratorAsProxy
        .connect(alice)
        .setSupplyKink(cometProxy.address, newKink)
    ).to.be.revertedWith("Contract is paused");
  });
  it("set supplyKink through market update admin via timelock", async () => {
    const {
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      governor,
      users: [alice],
    } = await makeConfigurator();

    // Deploy the Timelock contract
    const TimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const timelock = await TimelockFactory.deploy(governor.address);
    await timelock.deployed();

    // Transfer ownership of proxyAdmin to timelock
    await proxyAdmin.transferOwnership(timelock.address);

    // Set timelock as governor of Configurator
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(timelock.address);

    // Set Market Update Admin via Timelock
    const setMarketUpdateAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [alice.address]
    );
    await timelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setMarketUpdateAdmin(address)"],
      [setMarketUpdateAdminCalldata]
    );

    const currentMarketAdmin = await configuratorAsProxy.marketUpdateAdmin();
    expect(currentMarketAdmin).to.equal(alice.address);

    const newKink = 100n;
    const setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint64"],
      [cometProxy.address, newKink]
    );

    await timelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setSupplyKink(address,uint64)"],
      [setSupplyKinkCalldata]
    );

    const deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );
    await timelock.executeTransactions(
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
  it("set supplyKink through market update admin and updated comet proxy admin", async () => {
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
    await configuratorAsProxy.setMarketUpdateAdmin(alice.address);
    const currentMarketAdmin = await configuratorAsProxy.marketUpdateAdmin();
    expect(currentMarketAdmin).to.equal(alice.address);
    const oldKink = (await comet.supplyKink()).toBigInt();
    const newKink = 100n;
    const txn = await wait(
      configuratorAsProxy
        .connect(alice)
        .setSupplyKink(cometProxy.address, newKink)
    );

    await proxyAdmin.setMarketUpdateAdmin(alice.address);
    const currentMarketAdminCP = await proxyAdmin.marketUpdateAdmin();
    expect(currentMarketAdminCP).to.equal(alice.address);
    await wait(
      proxyAdmin
        .connect(alice)
        .deployAndUpgradeTo(configuratorProxy.address, cometProxy.address)
    );

    expect(event(txn, 0)).to.be.deep.equal({
      SetSupplyKink: {
        cometProxy: cometProxy.address,
        oldKink,
        newKink,
      },
    });
    expect(oldKink).to.be.not.equal(newKink);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
    expect(await cometAsProxy.supplyKink()).to.be.equal(newKink);
  });
});
