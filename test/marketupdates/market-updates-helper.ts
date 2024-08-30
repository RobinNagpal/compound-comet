import { SimpleTimelock__factory } from './../../build/types';
import hre from 'hardhat';
import { ethers, expect } from './../helpers';

export async function makeMarketAdmin() {
  const {
    signer: governorTimelockSigner,
    timelock: governorTimelock
  } = await initializeAndFundGovernorTimelock();

  const signers = await ethers.getSigners();

  const marketUpdateMultiSig = signers[3];

  const markerUpdaterProposerFactory = await ethers.getContractFactory(
    'MarketUpdateProposer'
  );

  // Fund the impersonated account
  await signers[0].sendTransaction({
    to: marketUpdateMultiSig.address,
    value: ethers.utils.parseEther('1.0') // Sending 1 Ether to cover gas fees
  });

  // This sets the owner of the MarketUpdateProposer to the marketUpdateMultiSig
  const marketUpdateProposer = await markerUpdaterProposerFactory
    .connect(marketUpdateMultiSig)
    .deploy();

  expect(await marketUpdateProposer.owner()).to.be.equal(
    marketUpdateMultiSig.address
  );

  const marketAdminTimelockFactory = await ethers.getContractFactory(
    'MarketUpdateTimelock'
  );

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
    marketUpdateProposer
  };
}

export async function initializeAndFundGovernorTimelock() {
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
