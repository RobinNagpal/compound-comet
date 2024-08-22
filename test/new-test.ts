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
  it("adds asset and deploys Comet with new configuration from the Configurator", async () => {
    const {
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      unsupportedToken,
      users: [alice],
    } = await makeConfigurator();

    const cometAsProxy = comet.attach(cometProxy.address);
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    const numAssetsFromComet = await comet.numAssets();
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .assetConfigs.length
    ).to.be.equal(numAssetsFromComet);

    const newAssetConfig: ConfiguratorAssetConfig = {
      asset: unsupportedToken.address,
      priceFeed: await comet.baseTokenPriceFeed(),
      decimals: await unsupportedToken.decimals(),
      borrowCollateralFactor: exp(0.9, 18),
      liquidateCollateralFactor: exp(1, 18),
      liquidationFactor: exp(0.95, 18),
      supplyCap: exp(1_000_000, 8),
    };
    const txn = await wait(
      configuratorAsProxy.addAsset(cometProxy.address, newAssetConfig)
    );

    const secondTrx = (await wait(
      configuratorAsProxy.deploy(cometProxy.address)
    )) as any;
    const [, newCometAddress] = secondTrx.receipt.events.find(
      (event) => event.event === "CometDeployed"
    ).args;

    proxyAdmin.upgrade(cometProxy.address, newCometAddress);

    // Extend this with non-admin role
    // proxyAdmin.connect(alice).upgrade(cometProxy.address, newCometAddress);

    expect(event(txn, 0)).to.be.deep.equal({
      AddAsset: {
        cometProxy: cometProxy.address,
        assetConfig: convertToEventAssetConfig(newAssetConfig),
      },
    });
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .assetConfigs.length
    ).to.be.equal(numAssetsFromComet + 1);
    expect(await cometAsProxy.numAssets()).to.be.equal(numAssetsFromComet + 1);
    expectAssetConfigsToMatch(
      newAssetConfig,
      await cometAsProxy.getAssetInfo(numAssetsFromComet)
    );
  });

  it("e2e governance actions from timelock", async () => {
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
    // await proxyAdmin.transferOwnership(timelock.address);

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.transferGovernor(timelock.address); // set timelock as admin of Configurator

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );
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
});
