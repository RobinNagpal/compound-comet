import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {event, expect, wait} from "./../helpers";
import { initializeAndFundGovernorTimelock } from './market-updates-helper';
import {
  CometFactory__factory,
  CometProxyAdmin__factory, CometProxyAdminOld__factory, Configurator__factory,
  ConfiguratorOld__factory,
  ConfiguratorProxy__factory,
  SimpleTimelock,
  TransparentUpgradeableProxy__factory
} from './../../build/types';
import {makeProtocol, getConfigurationForConfigurator} from './../helpers';
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
    1) Deploy the address of MarketAdminMultiSig

    2) Deploy MarketUpdateProposer with MarketAdminMultiSig as the owner

    3) Deploy MarketUpdateTimelock with Governor Timelock as the owner

    4) Initialize the MarketUpdateProposer with MarketUpdateTimelock

    5) Deploy the new CometProxyAdmin

    6) Set MainGovernorTimelock as the owner of new CometProxyAdmin by calling transferOwnership

    7) Deploy the new Configurator's Implementation

    8) Initialize the new Configurator with Governor Timelock

    -------   Update Existing Contracts -----------

    All actions to be done by timelock proposals
    -- Update Admins ---
    1) Call Old CometProxyAdmin  via timelock and call `changeProxyAdmin` function to set Comet Proxy's admin as the new CometProxyAdmin // This will allow the new CometProxyAdmin to upgrade the Comet's implementation

    2) Call Old CometProxyAdmin and call `changeProxyAdmin` function to set Configurator's Proxy's admin as the new CometProxyAdmin // This will allow the new CometProxyAdmin to upgrade the Configurator's implementation if needed in future

    -- Set new configurator as implementation ---

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

    const {
      governorTimelockSigner: governorTimelockSigner,
      governorTimelock: governorTimelock,
      originalSigner
    } = await initializeAndFundGovernorTimelock();

    const {
      configuratorProxyContract,
      configuratorBehindProxy,
      cometBehindProxy,
      oldCometProxyAdmin,
      proxyOfComet
    } = await deployExistingContracts({
      governorTimelock,
      governorTimelockSigner,
      originalSigner
    });

    expect((await configuratorBehindProxy.governor())).to.be.equal(governorTimelock.address);
    // -------   Deploy New Contracts -----------

    const signers = await ethers.getSigners();

    // 1) Deploy the address of MarketAdminMultiSig
    const marketUpdateMultiSig = signers[3];

    const marketUpdaterProposerFactory = await ethers.getContractFactory(
      'MarketUpdateProposer'
    );

    // Fund the impersonated account
    await signers[0].sendTransaction({
      to: marketUpdateMultiSig.address,
      value: ethers.utils.parseEther('1.0'), // Sending 1 Ether to cover gas fees
    });

    // 2) Deploy MarketUpdateProposer with MarketAdminMultiSig as the owner
    const marketUpdateProposer = await marketUpdaterProposerFactory
      .connect(marketUpdateMultiSig)
      .deploy();

    expect(await marketUpdateProposer.owner()).to.be.equal(
      marketUpdateMultiSig.address
    );

    const marketAdminTimelockFactory = await ethers.getContractFactory(
      'MarketUpdateTimelock'
    );

    // 3) Deploy MarketUpdateTimelock with Governor Timelock as the owner
    const marketUpdateTimelock = await marketAdminTimelockFactory.deploy(
      governorTimelock.address,
      0
    );

    // Fund the impersonated account
    await signers[0].sendTransaction({
      to: marketUpdateTimelock.address,
      value: ethers.utils.parseEther('1.0'), // Sending 1 Ether to cover gas fees
    });

    // 4) Initialize the MarketUpdateProposer with MarketUpdateTimelock
    marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .initialize(marketUpdateTimelock.address);


    const ProxyAdmin = (await ethers.getContractFactory('CometProxyAdmin')) as CometProxyAdmin__factory;
    const proxyAdminNew = await ProxyAdmin.connect(marketUpdateMultiSig).deploy();

    // 6) Set MainGovernorTimelock as the owner of new CometProxyAdmin by calling transferOwnership
    await proxyAdminNew.connect(marketUpdateMultiSig).transferOwnership(governorTimelock.address);

    // 7) Deploy the new Configurator's Implementation
    const ConfiguratorFactory = (await ethers.getContractFactory('Configurator')) as Configurator__factory;
    const configuratorNew = await ConfiguratorFactory.connect(marketUpdateMultiSig).deploy();
    await configuratorNew.deployed();


    // -------   Update Existing Contracts -----------
    console.log('Updating the existing contracts');

    // Call Old CometProxyAdmin  via timelock and call `changeProxyAdmin` function to set Comet Proxy's admin as the new CometProxyAdmin // This will allow the new CometProxyAdmin to upgrade the Comet's implementation
    await governorTimelock.executeTransactions(
      [oldCometProxyAdmin.address],
      [0],
      ['changeProxyAdmin(address,address)'],
      [ethers.utils.defaultAbiCoder.encode(
        ['address', 'address'],
        [proxyOfComet.address, proxyAdminNew.address]
      )]
    );



    // Call Old CometProxyAdmin and call `changeProxyAdmin` function to set Configurator's Proxy's admin as the new CometProxyAdmin // This will allow the new CometProxyAdmin to upgrade the Configurator's implementation if needed in future
    await governorTimelock.executeTransactions(
      [oldCometProxyAdmin.address],
      [0],
      ['changeProxyAdmin(address,address)'],
      [ethers.utils.defaultAbiCoder.encode(
        ['address', 'address'],
        [configuratorProxyContract.address, proxyAdminNew.address]
      )]
    );


    //

    await governorTimelock.executeTransactions(
      [proxyAdminNew.address],
      [0],
      ['upgrade(address,address)'],
      [ethers.utils.defaultAbiCoder.encode(
        ['address', 'address'],
        [configuratorProxyContract.address, configuratorNew.address]
      )]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxyContract.address],
      [0],
      ['setMarketAdmin(address)'],
      [ethers.utils.defaultAbiCoder.encode(
        ['address'],
        [marketUpdateTimelock.address]
      )]
    );


    const newConfiguratorViaProxy = configuratorNew.attach(configuratorProxyContract.address);
    const oldSupplyKink = (
      await newConfiguratorViaProxy.getConfiguration(cometBehindProxy.address)
    ).supplyKink;
    expect(oldSupplyKink).to.be.equal(800000000000000000n);

    const newSupplyKink = 100n;

    const txnOfGovernorTimelock = await wait(
      newConfiguratorViaProxy
        .connect(governorTimelockSigner)
        .setSupplyKink(cometBehindProxy.address, newSupplyKink)
    );



    expect(event(txnOfGovernorTimelock, 0)).to.be.deep.equal({
      SetSupplyKink: {
        cometProxy: cometBehindProxy.address,
        oldKink: oldSupplyKink,
        newKink: newSupplyKink,
      },
    });
    expect(
      (await newConfiguratorViaProxy.getConfiguration(cometBehindProxy.address))
        .supplyKink
    ).to.be.equal(newSupplyKink);

  });

  async function deployExistingContracts(input: {
    governorTimelock: SimpleTimelock;
    governorTimelockSigner: SignerWithAddress;
    originalSigner: SignerWithAddress;
  }) {
    const {  governorTimelock, governorTimelockSigner } = input;
    const opts: any = {};

    const {
      governor,
      pauseGuardian,
      extensionDelegate,
      base,
      comet,
      tokens,
      priceFeeds
    } = await makeProtocol({
      governor: governorTimelockSigner
    });

    const configuration = await getConfigurationForConfigurator(
      opts,
      comet,
      governor,
      pauseGuardian,
      extensionDelegate,
      tokens,
      base,
      priceFeeds,
    );

    // Deploy ProxyAdmin
    const ProxyAdmin = (await ethers.getContractFactory('CometProxyAdminOld')) as CometProxyAdminOld__factory;
    const proxyAdmin = await ProxyAdmin.connect(governorTimelockSigner).deploy();

    // Deploy Comet proxy
    const CometProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
    const cometBehindProxy = await CometProxy.connect(governorTimelockSigner).deploy(comet.address, proxyAdmin.address, (await comet.populateTransaction.initializeStorage()).data);
    await cometBehindProxy.deployed();

    // Derive the rest of the Configurator configuration values

    // Deploy CometFactory
    const CometFactoryFactory = (await ethers.getContractFactory('CometFactory')) as CometFactory__factory;
    const cometFactory = await CometFactoryFactory.deploy();
    await cometFactory.deployed();

    // Deploy Configurator
    const ConfiguratorFactory = (await ethers.getContractFactory('ConfiguratorOld')) as ConfiguratorOld__factory;
    const configurator = await ConfiguratorFactory.deploy();
    await configurator.deployed();


    // Deploy Configurator proxy
    const initializeCalldata = (await configurator.populateTransaction.initialize(governor.address)).data;
    const ConfiguratorProxyContract = (await ethers.getContractFactory('ConfiguratorProxy')) as ConfiguratorProxy__factory;
    const configuratorProxyContract = await ConfiguratorProxyContract.deploy(configurator.address, proxyAdmin.address, initializeCalldata);
    await configuratorProxyContract.deployed();

    // Set the initial factory and configuration for Comet in Configurator
    const configuratorBehindProxy = configurator.attach(configuratorProxyContract.address);
    await configuratorBehindProxy.connect(governorTimelockSigner).setConfiguration(cometBehindProxy.address, configuration);
    await configuratorBehindProxy.connect(governorTimelockSigner).setFactory(cometBehindProxy.address, cometFactory.address);

    return {
      configuratorProxyContract,
      configuratorBehindProxy,
      cometBehindProxy,
      proxyOfComet: cometBehindProxy,
      oldCometProxyAdmin: proxyAdmin,
    };

  }
});
