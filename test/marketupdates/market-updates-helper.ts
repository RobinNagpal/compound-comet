import {
  SimpleTimelock__factory,
  MarketUpdateTimelock__factory,
  MarketUpdateProposer__factory,
} from './../../build/types';
import hre from 'hardhat';
import { ethers, expect } from './../helpers';

export async function makeMarketAdmin() {
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
  const marketUpdateTimelockAddress = await marketUpdateTimelock.deployed();

  // Impersonate the account
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [marketUpdateTimelockAddress.address],
  });

  // Fund the impersonated account
  await signers[0].sendTransaction({
    to: marketUpdateTimelock.address,
    value: ethers.utils.parseEther('1.0'), // Sending 1 Ether to cover gas fees
  });

  // Get the signer from the impersonated account
  const marketUpdateTimelockSigner = await ethers.getSigner(
    marketUpdateTimelockAddress.address
  );

  marketUpdateProposer
    .connect(marketUpdateMultiSig)
    .initialize(marketUpdateTimelock.address);

  await marketUpdateTimelock
    .connect(governorTimelockSigner)
    .setMarketUpdateProposer(marketUpdateProposer.address);

  // Impersonate the account
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [marketUpdateProposer.address],
  });

  // Fund the impersonated account
  await signers[0].sendTransaction({
    to: marketUpdateProposer.address,
    value: ethers.utils.parseEther('1.0'), // Sending 1 Ether to cover gas fees
    gasLimit: 2100000,
  });

  const marketUpdateProposerSigner = await ethers.getSigner(
    marketUpdateProposer.address
  );

  return {
    governorTimelockSigner,
    governorTimelock,
    marketUpdateMultiSig,
    marketUpdateTimelock,
    marketUpdateTimelockSigner,
    marketUpdateProposer,
    marketUpdateProposerSigner,
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
