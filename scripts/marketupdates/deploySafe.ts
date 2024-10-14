import {SafeAccountConfig, SafeFactory} from '@safe-global/protocol-kit';
import {ethers} from 'hardhat';

async function deploySafe(owners:string[], threshold:number, salt:string){
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
  
  let signer;
  let deployerAddress;
  if (process.env.PRIVATE_KEY) {
    signer = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    deployerAddress = await wallet.getAddress();
    owners.push(deployerAddress);
  } else{
    throw new Error('Signer private key not available in env');
  }
  
  const safeFactory = await SafeFactory.init({ provider: rpcUrl, signer: signer, safeVersion:'1.4.1' });

  const safeAccountConfig: SafeAccountConfig = {
    owners:[...owners],
    threshold: threshold
  };

  console.log('Predicting safe address..');
  const predictedDeployAddress = await safeFactory.predictSafeAddress(safeAccountConfig,salt);
  console.log('Predicted deployed address:', predictedDeployAddress);
   
  const safe = await safeFactory.deploySafe({ safeAccountConfig: safeAccountConfig, saltNonce: salt });
  const safeAddress = await safe.getAddress();
  console.log('Safe deployed at:', safeAddress);
  
  return {safe, safeAddress};
}

async function main() {
  const owners = [];
  const threshold = 1;
  const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('deterministic-safe-200'));

  const {safe} = await deploySafe(owners, threshold, salt);
  
  const chainId = await safe.getChainId();
  console.log('Safe chainId:', chainId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
