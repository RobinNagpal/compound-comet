import { ethers, event, expect, makeConfigurator, wait } from './../helpers';
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

describe('Configurator', function() {
  it.only('is initialized properly with main-governor-timelock as admin', async () => {
    // initialize configurator with main-governor-timelock
    // attach the configurator proxy
    // check configurator admin
    const {
      governorTimelockSigner,
      governorTimelock,
    } = await makeMarketAdmin();

    const { configurator, configuratorProxy } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);
    const configuratorAdmin = await configuratorAsProxy.governor();
    expect(configuratorAdmin).to.be.equal(governorTimelock.address);
    await expect(
      configuratorAsProxy.initialize(governorTimelock.address)
    ).to.be.revertedWith("custom error 'AlreadyInitialized()'");
  });

  it('only main-governor-timelock can set market admin', async () => {});

  it('market admin cannot set or update market admin', async () => {});

  it('only main-governor-timelock can set or update marketAdminPauseGuardian', async () => {});

  it('main-governor-timelock or marketAdminPauseGuardian can pause market admin', async () => {});

  it('main-governor-timelock can unpause market admin', async () => {});

  it('marketAdminPauseGuardian cannot unpause market admin', async () => {});

  it('only main-governor-timelock or market admain can call market update functions', async () => {});

  it('market admain cannot call NON market update functions', async () => {});

  it('market admain cannot call market update functions when marketAdminPaused', async () => {});

  it('main-governor-timelock can call market update functions when marketAdminPause', async () => {});

  it('governor cannot be updated by market admin', async () => {});
});
