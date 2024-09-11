import { ethers } from 'hardhat';
import Safe, { SafeFactory, SafeAccountConfig, PredictedSafeProps } from '@safe-global/protocol-kit';
import { getProxyFactoryDeployment, getSafeSingletonDeployment } from '@safe-global/safe-deployments';

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance));
  const network = await ethers.provider.getNetwork();
  console.log('Network:', network);
  let rpcUrl: string;
  if (network.chainId === 11155420) {
    rpcUrl = process.env.OP_SEPOLIA_RPC!;
  } else if (network.chainId === 421614) {
    rpcUrl = process.env.ARB_SEPOLIA_RPC!;
  } else if (network.chainId === 11155111) {
    rpcUrl = process.env.ETH_SEPOLIA_RPC!;
  } else {
    throw new Error('Unsupported network');
  }

  console.log('Deploying contracts with the account:', deployer.address);
  const owners = [deployer.address, '0x7053e25f7076F4986D632A3C04313C81831e0d55', '0x77B65c68E52C31eb844fb3b4864B91133e2C1308']; // Replace with actual addresses
  const threshold = 2; // Require 2 out of 3 approvals
  const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('deterministic-safe-5'));

  
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


  const tx = await proxyFactory.createProxyWithNonce(safeSingletonAddress, initializer, salt);
  const receipt = await tx.wait(); // Wait for the transaction to be mined

  // The deployed contract address is in the logs
  const proxyDeployedEvent = receipt.events.find(event => event.event === 'ProxyCreation');
  const deployedAddress = proxyDeployedEvent.args.proxy;

  console.log('Safe deployed at:', deployedAddress);
  
  // const safeFactory = await SafeFactory.init({ provider: 'https://sepolia.optimism.io', signer: process.env.PRIVATE_KEY });
  const safeFactory = await SafeFactory.init({ provider: rpcUrl, signer: process.env.PRIVATE_KEY });
  // const safeFactory = await SafeFactory.init({ provider: 'https://ethereum-sepolia.blockpi.network/v1/rpc/public', signer: process.env.PRIVATE_KEY });
  console.log('safe factory: ', safeFactory);

  const safeAccountConfig: SafeAccountConfig = {
    owners,
    threshold
  };

  // predict deployed address
  console.log('predict deploy address..');
  
  const predictedDeployAddress = await safeFactory.predictSafeAddress(safeAccountConfig,salt);
  
  console.log('Predicted deployed address:', predictedDeployAddress);
   
 
  const protocolKit = await safeFactory.deploySafe({ safeAccountConfig: safeAccountConfig, saltNonce: salt });
  const safeAddress = await protocolKit.getAddress();
  console.log('Safe deployed at:', safeAddress);
  
  const safeBalance = await protocolKit.getBalance();
  console.log('Safe balance:', safeBalance.toString());
  
  const chainId = await protocolKit.getChainId();
  console.log('Safe chainId:', chainId);
  
  // loading already deployed safe
  
  // const predictedSafe: PredictedSafeProps = {
  //   safeAccountConfig,
  //   safeDeploymentConfig
  // };
  
  // const protocolKit = await Safe.init({
  //   provider,
  //   signer,
  //   safeAddress
  // });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
