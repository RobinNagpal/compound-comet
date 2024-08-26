import {
  annualize,
  defactor,
  defaultAssets,
  ethers,
  event,
  exp,
  expect,
  factor,
  makeConfigurator,
  Numeric,
  truncateDecimals,
  wait,
} from "./helpers";
import {
  CometModifiedFactory__factory,
  SimplePriceFeed__factory,
  SimpleTimelock__factory,
  GovernorSimple__factory,
  SimpleTimelock,
  TransparentUpgradeableProxy__factory,
  CometProxyAdmin__factory,
} from "../build/types";
import { AssetInfoStructOutput } from "../build/types/CometHarnessInterface";
import { ConfigurationStructOutput } from "../build/types/Configurator";
import { BigNumber } from "ethers";

type ConfiguratorAssetConfig = {
  asset: string;
  priceFeed: string;
  decimals: Numeric;
  borrowCollateralFactor: Numeric;
  liquidateCollateralFactor: Numeric;
  liquidationFactor: Numeric;
  supplyCap: Numeric;
};

function convertToEventAssetConfig(assetConfig: ConfiguratorAssetConfig) {
  return [
    assetConfig.asset,
    assetConfig.priceFeed,
    assetConfig.decimals,
    assetConfig.borrowCollateralFactor,
    assetConfig.liquidateCollateralFactor,
    assetConfig.liquidationFactor,
    assetConfig.supplyCap,
  ];
}

function convertToEventConfiguration(configuration: ConfigurationStructOutput) {
  return [
    configuration.governor,
    configuration.pauseGuardian,
    configuration.baseToken,
    configuration.baseTokenPriceFeed,
    configuration.extensionDelegate,
    configuration.supplyKink.toBigInt(),
    configuration.supplyPerYearInterestRateSlopeLow.toBigInt(),
    configuration.supplyPerYearInterestRateSlopeHigh.toBigInt(),
    configuration.supplyPerYearInterestRateBase.toBigInt(),
    configuration.borrowKink.toBigInt(),
    configuration.borrowPerYearInterestRateSlopeLow.toBigInt(),
    configuration.borrowPerYearInterestRateSlopeHigh.toBigInt(),
    configuration.borrowPerYearInterestRateBase.toBigInt(),
    configuration.storeFrontPriceFactor.toBigInt(),
    configuration.trackingIndexScale.toBigInt(),
    configuration.baseTrackingSupplySpeed.toBigInt(),
    configuration.baseTrackingBorrowSpeed.toBigInt(),
    configuration.baseMinForRewards.toBigInt(),
    configuration.baseBorrowMin.toBigInt(),
    configuration.targetReserves.toBigInt(),
    [], // leave asset configs empty for simplicity
  ];
}

// Checks that the Configurator asset config matches the Comet asset info
function expectAssetConfigsToMatch(
  configuratorAssetConfigs: ConfiguratorAssetConfig,
  cometAssetInfo: AssetInfoStructOutput
) {
  expect(configuratorAssetConfigs.asset).to.be.equal(cometAssetInfo.asset);
  expect(configuratorAssetConfigs.priceFeed).to.be.equal(
    cometAssetInfo.priceFeed
  );
  expect(exp(1, configuratorAssetConfigs.decimals)).to.be.equal(
    cometAssetInfo.scale
  );
  expect(configuratorAssetConfigs.borrowCollateralFactor).to.be.equal(
    cometAssetInfo.borrowCollateralFactor
  );
  expect(configuratorAssetConfigs.liquidateCollateralFactor).to.be.equal(
    cometAssetInfo.liquidateCollateralFactor
  );
  expect(configuratorAssetConfigs.liquidationFactor).to.be.equal(
    cometAssetInfo.liquidationFactor
  );
  expect(configuratorAssetConfigs.supplyCap).to.be.equal(
    cometAssetInfo.supplyCap
  );
}

describe("configurator", function() {
  it("Ensure - timelock's admin is set as Governor - Add two(access and not access) test for it.", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();
    const TimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const timelock = await TimelockFactory.deploy(governor.address);
    await timelock.deployed();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(timelock.address); // set timelock as admin of Configurator

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This works fine as governor is set as timelock's admin
    await timelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ["setPauseGuardian(address,address)"],
      [setPauseGuardianCalldata]
    );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .pauseGuardian
    ).to.be.equal(alice.address);

    // This will revert as alice is calling the timelock
    await expect(
      timelock.connect(alice).executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(timelock, "Unauthorized");
  });

  it("Ensure - Configurator's governor is set as timelock - Add two(access and not access) test for it", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();
    const TimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const timelock = await TimelockFactory.deploy(governor.address);
    await timelock.deployed();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(timelock.address); // set timelock as admin of Configurator

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This works fine as configurator's governor is set as timelock
    await timelock.executeTransactions(
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

  it("Ensure - Configurator's governor is set as timelock - Test for not access", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();
    const TimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const timelock = await TimelockFactory.deploy(governor.address);
    await timelock.deployed();

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(alice.address); // set timelock as admin of Configurator

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // This will revert as configurator's governor is set as Alice
    await expect(
      timelock.executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWith("failed to call");
  });

  it("Ensure - CometProxyAdmin's owner is timelock - Test for access", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const TimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;

    const timelock = await TimelockFactory.deploy(governor.address);
    await timelock.deployed();
    await proxyAdmin.transferOwnership(timelock.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(timelock.address); // set timelock as admin of Configurator

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governor.address);

    // 1. SetGovernor
    // 2. DeployAndUpgradeTo
    let setGovernorCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );
    await timelock.executeTransactions(
      [configuratorProxy.address, proxyAdmin.address],
      [0, 0],
      ["setGovernor(address,address)", "deployAndUpgradeTo(address,address)"],
      [setGovernorCalldata, deployAndUpgradeToCalldata]
    );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(alice.address);
  });

  it("Ensure - CometProxyAdmin's owner is timelock - Test for non-access", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    const TimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;

    const timelock = await TimelockFactory.deploy(governor.address);
    await timelock.deployed();
    await proxyAdmin.transferOwnership(alice.address); // Transferred ownership to alice instead of timelock

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(timelock.address); // set timelock as admin of Configurator

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governor.address);

    // 1. SetGovernor
    // 2. DeployAndUpgradeTo
    let setGovernorCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );

    expect(
      timelock.executeTransactions(
        [configuratorProxy.address, proxyAdmin.address],
        [0, 0],
        ["setGovernor(address,address)", "deployAndUpgradeTo(address,address)"],
        [setGovernorCalldata, deployAndUpgradeToCalldata]
      )
    ).to.be.revertedWith("failed to call");
  });

  it("Ensure - Comet's Proxy's admin is set as CometProxyAdmin - Add two(access and not access) test for it.", async () => {
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

  it("Ensure - Comet's Proxy's admin is set as CometProxyAdmin - Test for non-access.", async () => {
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
    await wait(
      proxyAdmin.deployAndUpgradeTo(
        configuratorProxy.address,
        cometProxy.address
      )
    );
  });
  it("Add a test to create a proposal and execute it. This proposal should update something simple on Comet's asset", async () => {
    const {
      governor,
      configurator,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      comet,
      users: [alice],
    } = await makeConfigurator();
    const TimelockFactory = (await ethers.getContractFactory(
      "SimpleTimelock"
    )) as SimpleTimelock__factory;
    const timelock = await TimelockFactory.deploy(governor.address);
    await timelock.deployed();
    // await proxyAdmin.transferOwnership(timelock.address);
    const GovernorFactory = (await ethers.getContractFactory(
      "GovernorSimple"
    )) as GovernorSimple__factory;
    const governorBravo = await GovernorFactory.deploy();
    await governorBravo.deployed();
    governorBravo.initialize(timelock.address, [governor.address]);

    let setGovernorCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );

    const proposal = await governorBravo.propose(
      [configuratorProxy.address, proxyAdmin.address],
      [0, 0],
      ["setGovernor(address,address)", "deployAndUpgradeTo(address,address)"],
      [setGovernorCalldata, deployAndUpgradeToCalldata],
      "Proposal to update Comet's governor"
    );

    governorBravo.queue(proposal);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(timelock.address); // set timelock as admin of Configurator
  });
});
