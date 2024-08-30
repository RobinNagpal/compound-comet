import {initializeAndFundGovernorTimelock} from "./market-updates-helper";
import {
  CometFactory__factory,
  CometProxyAdmin__factory,
  Configurator__factory,
  ConfiguratorProxy__factory, TransparentUpgradeableProxy__factory
} from "./../../build/types";
import {defaultAssets, makeProtocol, dfn, exp, ONE} from "./../helpers";
import { ethers } from 'hardhat';

describe('MarketUpdateDeployment', function() {
  /*

    Mainner Timelock - https://etherscan.io/address/0x6d903f6003cca6255D85CcA4D3B5E5146dC33925

    Existing Setup Steps:
    1) Deploy CometProxyAdmin with Governor Timelock. The owner of the CometProxyAdmin should be the Governor Timelock
       See the owner here on mainnet -https://etherscan.io/address/0x1ec63b5883c3481134fd50d5daebc83ecd2e8779#readContract
       The owner should be the Governor Timelock
    2) Deploy the Configurator with Admin as CometProxyAdmin
       See the admin of the Proxy contact https://etherscan.io/address/0x316f9708bb98af7da9c68c1c3b5e79039cd336e3
       The admin should be the CometProxyAdmin
    3) Deploy the Comet's Proxy with Admin as CometProxyAdmin
       See the admin of the Proxy contact https://etherscan.io/address/0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840
       The admin should be the CometProxyAdmin

    New Setup Steps:
    -------   Deploy New Contracts -----------
    1) Note down the address of MarketAdminMultiSig

    2) Deploy MarketUpdateProposer with MarketAdminMultiSig as the owner

    3) Deploy MarketUpdateTimelock with Governor Timelock as the owner

    4) Initialize the MarketUpdateProposer with MarketUpdateTimelock

    5) Deploy the new CometProxyAdmin

    6) Set MainGovernorTimelock as the owner of new CometProxyAdmin by calling transferOwnership

    7) Deploy the new Congigurator's Implementation

    -------   Update Existing Contracts -----------
    All actions to be done by timelock proposals

    1) Call Old CometProxyAdmin and call `upgrade` function to set Comet Proxy's admin as the new CometProxyAdmin // This will allow the new CometProxyAdmin to upgrade the Comet's implementation

    2) Call Old CometProxyAdmin and call `upgrade` fucntion to set Configurator's Proxy's admin as the new CometProxyAdmin // This will allow the new CometProxyAdmin to upgrade the Configurator's implementation if needed in future

    3) Set marketUpdateAdmin on Configurator

    4) Set marketUpdateAdmin on CometProxyAdmin

    5) Set marketAdminPauseGuardian on Configurator

    6) Set marketAdminPauseGuardian on CometProxyAdmin

    7) Deploy market update   // This will make sure existing functionality is working fine
          - setSupplyCap
          - deployAndUpgrade
   */


  /*
    Market Updates

    1) propose a new market update on MarketUpdateProposer using MarketAdminMultiSig

    2) Call the execute function on MarketUpdateProposer to execute the proposal
   */

  it('should be able to deploy MarketUpdates in the proper sequence', async () => {
    const assets =  defaultAssets();
    const opts: any = {};
    const {
      governor,
      pauseGuardian,
      extensionDelegate,
      users,
      base,
      reward,
      comet,
      tokens,
      unsupportedToken,
      priceFeeds,
    } = await makeProtocol({});

    const {
      signer: governorTimelockSigner,
      timelock: governorTimelock
    } = await initializeAndFundGovernorTimelock();



    // Deploy ProxyAdmin
    const ProxyAdmin = (await ethers.getContractFactory('CometProxyAdminOld')) as CometProxyAdmin__factory;
    const proxyAdmin = await ProxyAdmin.connect(governorTimelockSigner).deploy();
    await proxyAdmin.deployed();

    // Deploy Comet proxy
    const CometProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
    const cometProxy = await CometProxy.deploy(
      comet.address,
      proxyAdmin.address,
      (await comet.populateTransaction.initializeStorage()).data,
    );
    await cometProxy.deployed();

    // Derive the rest of the Configurator configuration values
    const supplyKink = dfn(opts.supplyKink, exp(0.8, 18));
    const supplyPerYearInterestRateBase = dfn(opts.supplyInterestRateBase, exp(0.0, 18));
    const supplyPerYearInterestRateSlopeLow = dfn(opts.supplyInterestRateSlopeLow, exp(0.05, 18));
    const supplyPerYearInterestRateSlopeHigh = dfn(opts.supplyInterestRateSlopeHigh, exp(2, 18));
    const borrowKink = dfn(opts.borrowKink, exp(0.8, 18));
    const borrowPerYearInterestRateBase = dfn(opts.borrowInterestRateBase, exp(0.005, 18));
    const borrowPerYearInterestRateSlopeLow = dfn(opts.borrowInterestRateSlopeLow, exp(0.1, 18));
    const borrowPerYearInterestRateSlopeHigh = dfn(opts.borrowInterestRateSlopeHigh, exp(3, 18));
    const storeFrontPriceFactor = await comet.storeFrontPriceFactor();
    const trackingIndexScale = await comet.trackingIndexScale();
    const baseTrackingSupplySpeed = await comet.baseTrackingSupplySpeed();
    const baseTrackingBorrowSpeed = await comet.baseTrackingBorrowSpeed();
    const baseMinForRewards = await comet.baseMinForRewards();
    const baseBorrowMin = await comet.baseBorrowMin();
    const targetReserves = await comet.targetReserves();

    // Deploy CometFactory
    const CometFactoryFactory = (await ethers.getContractFactory('CometFactory')) as CometFactory__factory;
    const cometFactory = await CometFactoryFactory.deploy();
    await cometFactory.deployed();

    // Deploy Configurator
    const ConfiguratorFactory = (await ethers.getContractFactory('Configurator')) as Configurator__factory;
    const configurator = await ConfiguratorFactory.deploy();
    await configurator.deployed();
    const configuration = {
      governor: governor.address,
      pauseGuardian: pauseGuardian.address,
      extensionDelegate: extensionDelegate.address,
      baseToken: tokens[base].address,
      baseTokenPriceFeed: priceFeeds[base].address,
      supplyKink,
      supplyPerYearInterestRateBase,
      supplyPerYearInterestRateSlopeLow,
      supplyPerYearInterestRateSlopeHigh,
      borrowKink,
      borrowPerYearInterestRateBase,
      borrowPerYearInterestRateSlopeLow,
      borrowPerYearInterestRateSlopeHigh,
      storeFrontPriceFactor,
      trackingIndexScale,
      baseTrackingSupplySpeed,
      baseTrackingBorrowSpeed,
      baseMinForRewards,
      baseBorrowMin,
      targetReserves,
      assetConfigs: Object.entries(assets).reduce((acc, [symbol, config], _i) => {
        if (symbol != base) {
          acc.push({
            asset: tokens[symbol].address,
            priceFeed: priceFeeds[symbol].address,
            decimals: dfn(assets[symbol].decimals, 18),
            borrowCollateralFactor: dfn(config.borrowCF, ONE - 1n),
            liquidateCollateralFactor: dfn(config.liquidateCF, ONE),
            liquidationFactor: dfn(config.liquidationFactor, ONE),
            supplyCap: dfn(config.supplyCap, exp(100, dfn(config.decimals, 18))),
          });
        }
        return acc;
      }, []),
    };

    // Deploy Configurator proxy
    const initializeCalldata = (await configurator.populateTransaction.initialize(governor.address)).data;
    const ConfiguratorProxy = (await ethers.getContractFactory('ConfiguratorProxy')) as ConfiguratorProxy__factory;
    const configuratorProxy = await ConfiguratorProxy.deploy(
      configurator.address,
      proxyAdmin.address,
      initializeCalldata,
    );
    await configuratorProxy.deployed();

    // Set the initial factory and configuration for Comet in Configurator
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy.connect(governor).setConfiguration(cometProxy.address, configuration);
    await configuratorAsProxy.connect(governor).setFactory(cometProxy.address, cometFactory.address);
  });
});
