import { ethers } from 'hardhat';
import { getProxyFactoryDeployment, getSafeSingletonDeployment } from '@safe-global/safe-deployments';
import EthersAdapter from '@safe-global/safe-ethers-lib';
import { SafeFactory } from '@safe-global/safe-core-sdk';
import { Create2Deployer } from '../build/types';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);
  const owners = [deployer.address, '0x7053e25f7076F4986D632A3C04313C81831e0d55', '0x77B65c68E52C31eb844fb3b4864B91133e2C1308']; // Replace with actual addresses
  const threshold = 2; // Require 2 out of 3 approvals
  const network = await ethers.provider.getNetwork();
  console.log('Network:', network);
  
  
  const proxyFactoryDeployment = getProxyFactoryDeployment({ network: String(network.chainId) });
  if (!proxyFactoryDeployment) {
    throw new Error(`No Proxy Factory deployment found for network ${network.chainId}`);
  }

  const proxyFactoryAddress = proxyFactoryDeployment.defaultAddress;
  const proxyFactoryAbi = proxyFactoryDeployment.abi;
  console.log('ProxyFactory:', proxyFactoryAddress);
  const proxyFactory = new ethers.Contract(proxyFactoryAddress, proxyFactoryAbi, deployer);
  console.log('Using Safe Proxy Factory at address:', proxyFactoryAddress);
  
  const safeDeployment = getSafeSingletonDeployment({ network: String(network.chainId) });
  const safeSingletonAddress = safeDeployment.defaultAddress;
  const safeSingletonAbi = safeDeployment.abi;
  console.log('Safe Singleton Address:', safeSingletonAddress);

  const safeContract = new ethers.Contract(safeSingletonAddress, safeSingletonAbi, deployer);
  const initializer = safeContract.interface.encodeFunctionData('setup', [
    owners,  // owners of the Safe
    threshold,  // number of required confirmations
    ethers.constants.AddressZero,  // Contract address for optional delegate call.
    '0x',  // Data payload for optional delegate call.
    ethers.constants.AddressZero,  // Handler for fallback calls to this contract
    ethers.constants.AddressZero,  // Token that should be used for the payment (0 is ETH)
    0,  // payment: Value that should be paid
    ethers.constants.AddressZero,  // payment receiver: Address that should receive the payment (or 0 if tx.origin)
  ]);
  
  const create2DeployerAddress = '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2';
  const create2Deployer = await ethers.getContractAt('Create2Deployer', create2DeployerAddress) as Create2Deployer;

  const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('deterministic-safe1'));

  const tx = await proxyFactory.createProxyWithNonce(safeSingletonAddress, initializer, salt);
  const receipt = await tx.wait(); // Wait for the transaction to be mined

  // The deployed contract address is in the logs
  const proxyDeployedEvent = receipt.events.find(event => event.event === 'ProxyCreation');
  const deployedAddress = proxyDeployedEvent.args.proxy;

  console.log('Safe deployed at:', deployedAddress);
  
  
  const ethAdapter = new EthersAdapter({ethers, signerOrProvider:deployer});
  const safeFactory = await SafeFactory.create({ ethAdapter: ethAdapter });

  const saltNonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('deterministic-safe1'));

  const safeDeploymentConfig = {
    saltNonce
  };

  const safeAccountConfig = {
    owners,
    threshold
  };

  // predict deployed address
  console.log("predict deploy address..");
  
  const predictedDeployAddress = await safeFactory.predictSafeAddress({
    safeAccountConfig,
    safeDeploymentConfig
  });
  
  console.log('Predicted deployed address:', predictedDeployAddress);
   
 
  const protocolKit = await safeFactory.deploySafe({ safeAccountConfig, safeDeploymentConfig });
  const safeAddress = await protocolKit.getAddress();
  console.log('Safe deployed at:', safeAddress);
  
  const balance = await protocolKit.getBalance();
  console.log('Safe balance:', balance.toString());
  
  const chainId = await protocolKit.getChainId();
  console.log('Safe chainId:', chainId);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
