import { ethers, event, expect, makeConfigurator, wait } from './helpers';
import {
  MarketUpdateProposer__factory,
  MarketUpdateTimelock__factory,
  SimpleTimelock__factory,
} from '../../build/types';
import hre from 'hardhat';
import { network } from 'hardhat';

async function initializeAndFundGovernorTimelock() {
  const signers = await ethers.getSigners();
  const gov = signers[0];
  const TimelockFactory = (await ethers.getContractFactory(
    'SimpleTimelock'
  )) as SimpleTimelock__factory;
  const timelock = await TimelockFactory.deploy(gov.address);
  const timelockAddress = await timelock.deployed();

  // Impersonate the account
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [timelockAddress.address],
  });

  // Fund the impersonated account
  await gov.sendTransaction({
    to: timelock.address,
    value: ethers.utils.parseEther('1.0'), // Sending 1 Ether to cover gas fees
  });

  // Get the signer from the impersonated account
  const signer = await ethers.getSigner(timelockAddress.address);
  return { signer, timelock };
}

async function makeMarketAdmin() {
  const {
    signer: governorTimelockSigner,
    timelock: governorTimelock,
  } = await initializeAndFundGovernorTimelock();

  const signers = await ethers.getSigners();

  const marketUpdateMultiSig = signers[3];

  const markerUpdaterProposerFactory = (await ethers.getContractFactory(
    'MarketUpdateProposer'
  )) as MarketUpdateProposer__factory;

  // Fund the impersonated account
  await signers[0].sendTransaction({
    to: marketUpdateMultiSig.address,
    value: ethers.utils.parseEther('1.0'), // Sending 1 Ether to cover gas fees
  });

  // This sets the owner of the MarketUpdateProposer to the marketUpdateMultiSig
  const marketUpdateProposer = await markerUpdaterProposerFactory
    .connect(marketUpdateMultiSig)
    .deploy();

  expect(await marketUpdateProposer.owner()).to.be.equal(
    marketUpdateMultiSig.address
  );

  const marketAdminTimelockFactory = (await ethers.getContractFactory(
    'MarketUpdateTimelock'
  )) as MarketUpdateTimelock__factory;

  const marketUpdateTimelock = await marketAdminTimelockFactory.deploy(
    governorTimelock.address,
    0
  );

  marketUpdateProposer
    .connect(marketUpdateMultiSig)
    .initialize(marketUpdateTimelock.address);

  await marketUpdateTimelock
    .connect(governorTimelockSigner)
    .setMarketUpdateProposer(marketUpdateProposer.address);

  return {
    governorTimelockSigner,
    governorTimelock,
    marketUpdateMultiSig,
    marketUpdateTimelock,
    marketUpdateProposer,
  };
}

describe('MarketUpdates', function() {

  describe('MarketUpdateMultisig', function() {
    it('is the owner of MarketUpdateProposer', async () => {

    });

    it('can create the proposal', async () => {

    });
  });

  describe('MarketUpdateProposer', function() {
    // We are not checking market updates here. we are just checking interaction
    // between MarketUpdateMultisig and MarketUpdateProposer or checking interactions
    // on MarketUpdateProposer
    it('is the initialized properly with timelock', async () => {

    });

    it('revert if timelock is not initialized', async () => {

    });

    it('MarketUpdateMultisig is set as the owner of MarketUpdateProposer', async () => {

    });

    it('MarketUpdateMultisig can set a new owner for MarketUpdateProposer', async () => {

    });

    it('only allows MarketUpdateMultisig to create proposal', async () => {

    });

    it('keeps track of all the proposals', async () => {

    });

    it('keeps track of all the proposals', async () => {

    });

    it('can cancel the proposal', async () => {
      // Create a proposal
      // Cancel the proposal
      // Check if the proposal is cancelled
    });

    it('marks the proposal as expired after grace period', () => {

    });

  });

  describe('MarketUpdateTimelock', function() {
    it('is created properly with main-governor-timelock as admin', async () => {

    });

    it('only allows main-governor-timelock to set MarketUpdateProposer', async () => {

    });

    it('only MarketUpdateProposer or main-governor-timelock can queue transactions', async () => {

    });

    it('only MarketUpdateProposer or main-governor-timelock can execute transactions', async () => {

    });

    it('only MarketUpdateProposer or main-governor-timelock can cancel transactions', async () => {

    });

    it('only main-governor-timelock can set new admin', async () => {

    });

    it('MarketUpdateProposer cannot set or update MarketUpdateProposer', async () => {

    });

    it('MarketUpdateProposer cannot set or update main-governor-timelock', async () => {

    });
  });

  describe('Configurator', function() {
    it('is initialized properly with main-governor-timelock as admin', async () => {

    });

    it('only main-governor-timelock can set market admin', async () => {

    });

    it('market admin cannot set or update market admin', async () => {

    });

    it('only main-governor-timelock can set or update marketAdminPauseGuardian', async () => {

    });

    it('main-governor-timelock or marketAdminPauseGuardian can pause market admin', async () => {

    });

    it('main-governor-timelock can unpause market admin', async () => {

    });

    it('marketAdminPauseGuardian cannot unpause market admin', async () => {

    });

    it('only main-governor-timelock or market admain can call market update functions', async () => {
    });

    it('market admain cannot call NON market update functions', async () => {

    });

    it('market admain cannot call market update functions when marketAdminPaused', async () => {

    });

    it('main-governor-timelock can call market update functions when marketAdminPause', async () => {

    });

    it('governor cannot be updated by market admin', async () => {

    });
  });

  ;








  // initialize market admin flow and cofiguration
  // governor sets marketUpdateTimelock as marketAdmin in CometProxyAdmin & Configurator via governorTimelock
  // marketUpdateMultisig creates proposal using marketUpdateProposer & sets supplykink and calls deployAndUpgradeTo via marketUpdateTimelock
  // marketUpdateMultisig -> marketUpdateProposer -> marketUpdateTimelock -> configurator (setSupplyKink)
  // marketUpdateMultisig -> marketUpdateProposer -> marketUpdateTimelock -> cometProxyAdmin (deployAndUpgradeTo)
  it.only('can create and update market update proposal', async () => {
    const {
      governorTimelockSigner,
      governorTimelock,
      marketUpdateMultiSig,
      marketUpdateProposer,
      marketUpdateTimelock,
    } = await makeMarketAdmin();

    const {
      governor,
      configurator,
      configuratorProxy,
      cometProxy,
      comet,
      proxyAdmin,
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    // checking if configuration is initialized properly
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governor.address);

    const setMarketUpdateTimelockCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [marketUpdateTimelock.address]
    );
    await governorTimelock.executeTransactions(
      [proxyAdmin.address, configuratorProxy.address],
      [0, 0],
      ['setMarketAdmin(address)', 'setMarketAdmin(address)'],
      [setMarketUpdateTimelockCalldata, setMarketUpdateTimelockCalldata]
    );

    // checking if market admin has been set properly in CometProxyAdmin
    expect(await proxyAdmin.marketAdmin()).to.be.equal(
      marketUpdateTimelock.address
    );
    // checking if market admin has been set properly in Configurator
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketUpdateTimelock.address
    );

    const newKink = 100n;
    const setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, newKink]
    );
    const deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [configuratorProxy.address, cometProxy.address]
    );

    expect(await comet.supplyKink()).to.be.equal('800000000000000000');

    // marketUpdateMultisig create a proposal using marketUpdateProposer
    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address, proxyAdmin.address],
        [0, 0],
        [
          'setSupplyKink(address,uint64)',
          'deployAndUpgradeTo(address,address)',
        ],
        [setSupplyKinkCalldata, deployAndUpgradeToCalldata],
        'Test Proposal'
      );

    // marketUpdateMultisig invokes execution of proposal using marketUpdateProposer
    const txWithReceipt = await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .execute(1);

    const tx = (await wait(txWithReceipt)) as any;

    //expected events to be emitted from the proposal execution
    const abi = [
      'event CometDeployed(address indexed cometProxy, address indexed newComet)',
      'event Upgraded(address indexed implementation)',
      'event MarketUpdateProposalExecuted(uint id)',
      'event SetSupplyKink(address indexed cometProxy,uint64 oldKink, uint64 newKink)',
      'event ExecuteTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature,  bytes data, uint eta)',
    ];

    // Initialize the contract interface
    const iface = new ethers.utils.Interface(abi);
    const events = [];

    // parsing the transaction to get all the events
    tx.receipt.events.forEach((event) => {
      try {
        const decodedEvent = iface.parseLog(event);
        events.push(decodedEvent);
      } catch (error) {
        console.log('Failed to decode event:', event);
      }
    });

    console.log('events', events);

    // verify the expected event names in the parsed events
    // expect(events[0].name).to.be.equal('CometDeployed');
    // expect(events[1].name).to.be.equal('Upgraded');

    // checking if configurator's configuration has been updated with new value after proposal execution
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);

    const cometAsProxy = comet.attach(cometProxy.address);

    // checking if comet proxy has been updated with new value after proposal execution
    expect(await cometAsProxy.supplyKink()).to.be.equal(newKink);
  });



  it("Configurator's marketAdmin is set as marker-admin-timelock - Test for access", async () => {
    const {
      governorTimelockSigner,
      governorTimelock,
      marketUpdateMultiSig,
      marketUpdateTimelock,
      marketUpdateProposer,
    } = await makeMarketAdmin();
    const {
      proxyAdmin,
      configurator,
      configuratorProxy,
      cometProxy,
      comet,
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [marketUpdateTimelock.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address, proxyAdmin.address],
      [0, 0],
      ['setMarketAdmin(address)', 'setMarketAdmin(address)'],
      [setMarketAdminCalldata, setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketUpdateTimelock.address
    );
    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, newKink]
    );

    const deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [configuratorProxy.address, cometProxy.address]
    );
    await marketUpdateProposer.connect(marketUpdateMultiSig).propose(
      [configuratorProxy.address, proxyAdmin.address],
      [0, 0], // no Ether to be sent
      ['setSupplyKink(address,uint64)', 'deployAndUpgradeTo(address,address)'],
      [setSupplyKinkCalldata, deployAndUpgradeToCalldata],
      'Test Proposal'
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
      marketUpdateMultiSig,
      marketUpdateTimelock,
      marketUpdateProposer,
      governorTimelockSigner,
      governorTimelock,
    } = await makeMarketAdmin();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [marketUpdateMultiSig.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ['setMarketAdmin(address)'],
      [setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketUpdateMultiSig.address
    );

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    // This will revert as calling with the market admin timelock which doesnt have access
    await expect(
      marketUpdateProposer.propose(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ['setPauseGuardian(address,address)'],
        [setPauseGuardianCalldata],
        'Test Proposal'
      )
    ).to.be.revertedWithCustomError(marketUpdateTimelock, 'Unauthorized');
  });
  it("governor-timelock's admin is set as Governor - Test for access", async () => {
    const {
      governorTimelockSigner,
      governorTimelock,
    } = await makeMarketAdmin();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    // This works fine as governor is set as timelock's admin
    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ['setPauseGuardian(address,address)'],
      [setPauseGuardianCalldata]
    );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .pauseGuardian
    ).to.be.equal(alice.address);
  });
  it("governor-timelock's admin is set as Governor - Test for non-access.", async () => {
    const {
      governorTimelockSigner,
      governorTimelock,
    } = await makeMarketAdmin();
    const {
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    // This will revert as alice is calling the timelock
    await expect(
      governorTimelock.connect(alice).executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ['setPauseGuardian(address,address)'],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(governorTimelock, 'Unauthorized');
  });
  it("MarketAdmin's timelock is main governor timelock and only it can setAdmin", async () => {
    const {
      governorTimelockSigner,
      governorTimelock,

      marketUpdateMultiSig,
      marketUpdateTimelock,
    } = await makeMarketAdmin();
    const {
      users: [alice],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    expect(await marketUpdateTimelock.admin()).to.be.equal(
      governorTimelockSigner.address
    );

    expect(await marketUpdateTimelock.marketUpdateProposer()).to.be.equal(
      marketUpdateMultiSig.address
    );

    const setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [alice.address]
    );

    marketUpdateTimelock.connect(alice.address);
    await governorTimelock
      .connect(governorTimelockSigner)
      .executeTransactions(
        [marketUpdateTimelock.address],
        [0],
        ['setMarketAdmin(address)'],
        [setMarketAdminCalldata]
      );
    expect(await marketUpdateTimelock.marketUpdateProposer()).to.be.equal(
      alice.address
    );
  });

  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for access", async () => {
    const {
      marketUpdateTimelock,
      governorTimelockSigner,
    } = await makeMarketAdmin();
    const {
      users: [newAdmin],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });
    const oldAdmin = await marketUpdateTimelock.admin();
    const txn = await wait(
      marketUpdateTimelock
        .connect(governorTimelockSigner)
        .setAdmin(newAdmin.address)
    );

    expect(event(txn, 0)).to.be.deep.equal({
      NewAdmin: {
        oldAdmin: oldAdmin,
        newAdmin: newAdmin.address,
      },
    });

    expect(await marketUpdateTimelock.admin()).to.be.equal(newAdmin.address);
  });
  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for non-access", async () => {
    const {
      marketUpdateMultiSig,
      marketUpdateTimelock,
      governorTimelockSigner,
    } = await makeMarketAdmin();
    const {
      users: [nonAdmin],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    await expect(
      marketUpdateTimelock
        .connect(marketUpdateMultiSig)
        .setAdmin(nonAdmin.address)
    ).to.be.revertedWith('Timelock::setAdmin: Call must come from admin.');
  });
  it('Ensure governor or market admin can call the queue, cancel or execute transaction on marketAdminTimelock - Test for access', async () => {
    const {
      marketUpdateTimelock,
      governorTimelockSigner,
    } = await makeMarketAdmin();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    await configuratorAsProxy
      .connect(governorTimelockSigner)
      .setMarketAdmin(marketUpdateTimelock.address);

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, newKink]
    );

    const eta = (await ethers.provider.getBlock('latest')).timestamp + 1000;

    await marketUpdateTimelock
      .connect(governorTimelockSigner)
      .queueTransaction(
        configuratorProxy.address,
        0,
        'setSupplyKink(address,uint64)',
        setSupplyKinkCalldata,
        eta
      );
    await marketUpdateTimelock
      .connect(governorTimelockSigner)
      .cancelTransaction(
        configuratorProxy.address,
        0,
        'setSupplyKink(address,uint64)',
        setSupplyKinkCalldata,
        eta
      );
    await marketUpdateTimelock
      .connect(governorTimelockSigner)
      .queueTransaction(
        configuratorProxy.address,
        0,
        'setSupplyKink(address,uint64)',
        setSupplyKinkCalldata,
        eta
      );
    await network.provider.send('evm_increaseTime', [1000]);
    await network.provider.send('evm_mine');

    await marketUpdateTimelock
      .connect(governorTimelockSigner)
      .executeTransaction(
        configuratorProxy.address,
        0,
        'setSupplyKink(address,uint64)',
        setSupplyKinkCalldata,
        eta
      );

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
  });
  it('Ensure governor or market admin can call the queue, cancel or execute transaction on marketAdminTimelock - Test for non-access', async () => {
    const {
      marketUpdateTimelock,
      governorTimelockSigner,
    } = await makeMarketAdmin();
    const {
      configuratorProxy,
      cometProxy,
      users: [newPauseGuardian, nonAdmin],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, newPauseGuardian.address]
    );
    const eta = Math.floor(Date.now() / 1000);
    await expect(
      marketUpdateTimelock
        .connect(nonAdmin)
        .queueTransaction(
          configuratorProxy.address,
          0,
          'setPauseGuardian(address,address)',
          setPauseGuardianCalldata,
          eta
        )
    ).to.be.revertedWith(
      'Unauthorized: call must come from admin or marketAdmin'
    );
    await expect(
      marketUpdateTimelock
        .connect(nonAdmin)
        .cancelTransaction(
          configuratorProxy.address,
          0,
          'setPauseGuardian(address,address)',
          setPauseGuardianCalldata,
          eta
        )
    ).to.be.revertedWith(
      'Unauthorized: call must come from admin or marketAdmin'
    );
    await expect(
      marketUpdateTimelock
        .connect(nonAdmin)
        .executeTransaction(
          configuratorProxy.address,
          0,
          'setPauseGuardian(address,address)',
          setPauseGuardianCalldata,
          eta
        )
    ).to.be.revertedWith(
      'Unauthorized: call must come from admin or marketAdmin'
    );
  });
});
