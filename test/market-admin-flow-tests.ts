import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import { ethers, event, expect, makeConfigurator, wait } from './helpers';
import {
  MarketUpdateProposer__factory,
  MarketUpdateTimelock__factory,
  SimpleTimelock__factory
} from '../build/types';
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
    params: [timelockAddress.address]
  });

  // Fund the impersonated account
  await gov.sendTransaction({
    to: timelock.address,
    value: ethers.utils.parseEther('1.0') // Sending 1 Ether to cover gas fees
  });

  // Get the signer from the impersonated account
  const signer = await ethers.getSigner(timelockAddress.address);
  return { signer, timelock };
}

async function initializeTimelockSigner(currentSigner: SignerWithAddress, timelockAddress: string) {
  // Impersonate the account
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [timelockAddress]
  });

  // Fund the impersonated account
  await currentSigner.sendTransaction({
    to: timelockAddress,
    value: ethers.utils.parseEther('1.0') // Sending 1 Ether to cover gas fees
  });
}

async function makeMarketAdmin() {

  const {
    signer: governorTimelockSigner,
    timelock: governorTimelock
  } = await initializeAndFundGovernorTimelock();

  const signers = await ethers.getSigners();

  const marketUpdateMultiSig = signers[3];

  const markerUpdaterProposerFactory = (await ethers.getContractFactory(
    'MarketUpdateProposer'
  )) as MarketUpdateProposer__factory;


  // Fund the impersonated account
  await signers[0].sendTransaction({
    to: marketUpdateMultiSig.address,
    value: ethers.utils.parseEther('1.0') // Sending 1 Ether to cover gas fees
  });

  // This sets the owner of the MarketUpdateProposer to the marketUpdateMultiSig
  const marketUpdateProposer = await markerUpdaterProposerFactory.connect(marketUpdateMultiSig).deploy();

  expect(await marketUpdateProposer.owner()).to.be.equal(marketUpdateMultiSig.address);

  const marketAdminTimelockFactory = (await ethers.getContractFactory(
    'MarketUpdateTimelock'
  )) as MarketUpdateTimelock__factory;

  const marketUpdateTimelock = await marketAdminTimelockFactory.deploy(
    governorTimelock.address,
    0
  );


  await marketUpdateTimelock
    .connect(governorTimelockSigner)
    .setMarketUpdateProposer(marketUpdateProposer.address);

  return {
    governorTimelockSigner,
    governorTimelock,
    marketUpdateMultiSig,
    marketUpdateTimelock,
    marketUpdateProposer
  };
}

describe('configuration market admin', function() {
  it.only("New CometProxyAdmin's marketAdmin is market-admin-timelock - Test for access", async () => {
    const {
      governorTimelockSigner,
      governorTimelock,
      marketUpdateMultiSig,
      marketUpdateProposer,
      marketUpdateTimelock
    } = await makeMarketAdmin();

    const {
      governor,
      configurator,
      configuratorProxy,
      cometProxy,
      comet,
      proxyAdmin
    } = await makeConfigurator({
      governor: governorTimelockSigner
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(governor.address);

    console.log('proxyAdmin', proxyAdmin.address);

    const setMarketUpdateProposerCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [marketUpdateProposer.address]
    );

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

    expect(await proxyAdmin.marketAdmin()).to.be.equal(
      marketUpdateTimelock.address
    );
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

    expect(await marketUpdateProposer.owner()).to.be.equal(marketUpdateMultiSig.address);

    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address, proxyAdmin.address],
        [0, 0],
        [
          'setSupplyKink(address,uint64)',
          'deployAndUpgradeTo(address,address)'
        ],
        [setSupplyKinkCalldata, deployAndUpgradeToCalldata],
        'Test Proposal',

      );

    const cometAsProxy = comet.attach(cometProxy.address);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .supplyKink
    ).to.be.equal(newKink);
    expect(await cometAsProxy.supplyKink()).to.be.equal(newKink);

    // TODO: Add check to make sure no other user can call CometProxyAdmin
  });

  it("Configurator's marketAdmin is set as marker-admin-timelock - Test for access", async () => {
    const {
      governorTimelockSigner,
      governorTimelock,
      marketUpdateMultiSig,
      marketUpdateTimelock,
      marketUpdateProposer
    } = await makeMarketAdmin();
    const {
      proxyAdmin,
      configurator,
      configuratorProxy,
      cometProxy,
      comet
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
      [
        'setSupplyKink(address,uint64)',
        'deployAndUpgradeTo(address,address)'
      ],
      [setSupplyKinkCalldata, deployAndUpgradeToCalldata],
      'Test Proposal',
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
      governorTimelock
    } = await makeMarketAdmin();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice]
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
        'Test Proposal',
      )
    ).to.be.revertedWithCustomError(marketUpdateTimelock, 'Unauthorized');
  });
  it("governor-timelock's admin is set as Governor - Test for access", async () => {
    const {
      governorTimelockSigner,
      governorTimelock
    } = await makeMarketAdmin();
    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice]
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
      governorTimelock
    } = await makeMarketAdmin();
    const {
      configuratorProxy,
      cometProxy,
      users: [alice]
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
      marketUpdateTimelock
    } = await makeMarketAdmin();
    const {
      users: [alice]
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
    expect(await marketUpdateTimelock.marketUpdateProposer()).to.be.equal(alice.address);
  });

  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for access", async () => {
    const {
      marketUpdateTimelock,
      governorTimelockSigner
    } = await makeMarketAdmin();
    const {
      users: [newAdmin]
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
        newAdmin: newAdmin.address
      }
    });

    expect(await marketUpdateTimelock.admin()).to.be.equal(newAdmin.address);
  });
  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for non-access", async () => {
    const {
      marketUpdateMultiSig,
      marketUpdateTimelock,
      governorTimelockSigner
    } = await makeMarketAdmin();
    const {
      users: [nonAdmin]
    } = await makeConfigurator({
      governor: governorTimelockSigner
    });

    await expect(
      marketUpdateTimelock.connect(marketUpdateMultiSig).setAdmin(nonAdmin.address)
    ).to.be.revertedWith('Timelock::setAdmin: Call must come from admin.');
  });
  it('Ensure governor or market admin can call the queue, cancel or execute transaction on marketAdminTimelock - Test for access', async () => {
    const {
      marketUpdateTimelock,
      governorTimelockSigner
    } = await makeMarketAdmin();
    const {
      configurator,
      configuratorProxy,
      cometProxy
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
      governorTimelockSigner
    } = await makeMarketAdmin();
    const {
      configuratorProxy,
      cometProxy,
      users: [newPauseGuardian, nonAdmin]
    } = await makeConfigurator({
      governor: governorTimelockSigner
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
