import { MarketUpdateProposalStruct } from '../build/types/MarketAdminTimelock';
import { ethers, event, expect, makeConfigurator, wait } from './helpers';
import {
  MarketAdminTimelock__factory,
  SimpleTimelock__factory
} from '../build/types';
import hre from 'hardhat';
import { network } from 'hardhat';

async function initializeMarketAdminTimelock() {
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

  const {
    signer: governorTimelockSigner,
    timelock: governorTimelock
  } = await initializeAndFundGovernorTimelock();
  const signers = await ethers.getSigners();
  const gov = signers[0];
  const marketAdmin = signers[2];
  const MarketAdminTimelockFactory = (await ethers.getContractFactory(
    'MarketAdminTimelock'
  )) as MarketAdminTimelock__factory;
  const marketAdminTimelock = await MarketAdminTimelockFactory.deploy(
    governorTimelock.address,
    0
  );
  const marketAdminTimelockAddress = await marketAdminTimelock.deployed();

  // Impersonate the account
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [marketAdminTimelockAddress.address]
  });

  // Fund the impersonated account
  await gov.sendTransaction({
    to: marketAdminTimelock.address,
    value: ethers.utils.parseEther('1.0') // Sending 1 Ether to cover gas fees
  });

  // Get the signer from the impersonated account
  const marketAdminTimelockSigner = await ethers.getSigner(
    marketAdminTimelockAddress.address
  );

  await marketAdminTimelock
    .connect(governorTimelockSigner)
    .setMarketAdmin(marketAdmin.address);

  return {
    governorTimelockSigner,
    governorTimelock,
    marketAdmin,
    marketAdminTimelockSigner,
    marketAdminTimelock
  };
}

function createMarketUpdateProposalStruct(
  targets: string[],
  values: number[],
  signatures: string[],
  calldatas: string[]
): MarketUpdateProposalStruct {
  return {
    id: 2,
    targets,
    values,
    calldatas,
    signatures,
    description: 'Test Proposal'
  };
}

describe.only('configuration market admin', function() {
  it("New CometProxyAdmin's marketAdmin is market-admin-timelock - Test for access", async () => {
    const {
      governorTimelockSigner,
      governorTimelock,

      marketAdmin,
      marketAdminTimelock
    } = await initializeMarketAdminTimelock();

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

    let setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [marketAdminTimelock.address]
    );
    await governorTimelock.executeTransactions(
      [proxyAdmin.address, configuratorProxy.address],
      [0, 0],
      ['setMarketAdmin(address)', 'setMarketAdmin(address)'],
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
      ['address', 'uint64'],
      [cometProxy.address, newKink]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [configuratorProxy.address, cometProxy.address]
    );

    const eta = (await ethers.provider.getBlock('latest')).timestamp + 1000;
    await marketAdminTimelock
      .connect(marketAdmin)
      .executeProposal(
        createMarketUpdateProposalStruct(
          [configuratorProxy.address, proxyAdmin.address],
          [0, 0],
          [
            'setSupplyKink(address,uint64)',
            'deployAndUpgradeTo(address,address)'
          ],
          [setSupplyKinkCalldata, deployAndUpgradeToCalldata]
        ),
        eta
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

      marketAdmin,
      marketAdminTimelock
    } = await initializeMarketAdminTimelock();
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
      [marketAdminTimelock.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address, proxyAdmin.address],
      [0, 0],
      ['setMarketAdmin(address)', 'setMarketAdmin(address)'],
      [setMarketAdminCalldata, setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdminTimelock.address
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
    const eta = (await ethers.provider.getBlock('latest')).timestamp + 1000;
    await marketAdminTimelock.connect(marketAdmin).executeProposal(
      createMarketUpdateProposalStruct(
        [configuratorProxy.address, proxyAdmin.address],
        [0, 0], // no Ether to be sent
        [
          'setSupplyKink(address,uint64)',
          'deployAndUpgradeTo(address,address)'
        ],
        [setSupplyKinkCalldata, deployAndUpgradeToCalldata]
      ),
      eta
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
      marketAdmin,
      marketAdminTimelock,
      governorTimelockSigner,
      governorTimelock
    } = await initializeMarketAdminTimelock();
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
      [marketAdmin.address]
    );

    await governorTimelock.executeTransactions(
      [configuratorProxy.address],
      [0],
      ['setMarketAdmin(address)'],
      [setMarketAdminCalldata]
    );
    expect(await configuratorAsProxy.marketAdmin()).to.be.equal(
      marketAdmin.address
    );

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    const eta = (await ethers.provider.getBlock('latest')).timestamp + 1000;
    // This will revert as calling with the market admin timelock which doesnt have access
    await expect(
      marketAdminTimelock.executeProposal(
        createMarketUpdateProposalStruct(
          [configuratorProxy.address],
          [0], // no Ether to be sent
          ['setPauseGuardian(address,address)'],
          [setPauseGuardianCalldata]
        ),
        eta
      )
    ).to.be.revertedWithCustomError(marketAdminTimelock, 'Unauthorized');
  });
  it("governor-timelock's admin is set as Governor - Test for access", async () => {
    const {
      governorTimelockSigner,
      governorTimelock
    } = await initializeMarketAdminTimelock();
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
    } = await initializeMarketAdminTimelock();
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

      marketAdmin,
      marketAdminTimelock
    } = await initializeMarketAdminTimelock();
    const {
      users: [alice]
    } = await makeConfigurator({
      governor: governorTimelockSigner
    });

    expect(await marketAdminTimelock.admin()).to.be.equal(
      governorTimelockSigner.address
    );

    expect(await marketAdminTimelock.marketAdmin()).to.be.equal(
      marketAdmin.address
    );

    const setMarketAdminCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [alice.address]
    );

    marketAdminTimelock.connect(alice.address);
    await governorTimelock
      .connect(governorTimelockSigner)
      .executeTransactions(
        [marketAdminTimelock.address],
        [0],
        ['setMarketAdmin(address)'],
        [setMarketAdminCalldata]
      );
    expect(await marketAdminTimelock.marketAdmin()).to.be.equal(alice.address);
  });

  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for access", async () => {
    const {
      marketAdminTimelock,
      governorTimelockSigner
    } = await initializeMarketAdminTimelock();
    const {
      users: [newAdmin]
    } = await makeConfigurator({
      governor: governorTimelockSigner
    });
    const oldAdmin = await marketAdminTimelock.admin();
    const txn = await wait(
      marketAdminTimelock
        .connect(governorTimelockSigner)
        .setAdmin(newAdmin.address)
    );

    expect(event(txn, 0)).to.be.deep.equal({
      NewAdmin: {
        oldAdmin: oldAdmin,
        newAdmin: newAdmin.address
      }
    });

    expect(await marketAdminTimelock.admin()).to.be.equal(newAdmin.address);
  });
  it("Ensure only governor's timelock can set a new admin for marketAdminTimelock - Test for non-access", async () => {
    const {
      marketAdmin,
      marketAdminTimelock,
      governorTimelockSigner
    } = await initializeMarketAdminTimelock();
    const {
      users: [nonAdmin]
    } = await makeConfigurator({
      governor: governorTimelockSigner
    });

    await expect(
      marketAdminTimelock.connect(marketAdmin).setAdmin(nonAdmin.address)
    ).to.be.revertedWith('Timelock::setAdmin: Call must come from admin.');
  });
  it('Ensure governor or market admin can call the queue, cancel or execute transaction on marketAdminTimelock - Test for access', async () => {
    const {
      marketAdminTimelock,
      governorTimelockSigner
    } = await initializeMarketAdminTimelock();
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
      .setMarketAdmin(marketAdminTimelock.address);

    const newKink = 100n;
    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, newKink]
    );

    const eta = (await ethers.provider.getBlock('latest')).timestamp + 1000;

    await marketAdminTimelock
      .connect(governorTimelockSigner)
      .queueTransaction(
        configuratorProxy.address,
        0,
        'setSupplyKink(address,uint64)',
        setSupplyKinkCalldata,
        eta
      );
    await marketAdminTimelock
      .connect(governorTimelockSigner)
      .cancelTransaction(
        configuratorProxy.address,
        0,
        'setSupplyKink(address,uint64)',
        setSupplyKinkCalldata,
        eta
      );
    await marketAdminTimelock
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

    await marketAdminTimelock
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
      marketAdminTimelock,
      governorTimelockSigner
    } = await initializeMarketAdminTimelock();
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
      marketAdminTimelock
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
      marketAdminTimelock
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
      marketAdminTimelock
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
