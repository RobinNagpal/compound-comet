import Safe from '@safe-global/protocol-kit';
import {ethers} from 'hardhat';

async function transferSafe(newOwners:string[], threshold:number, safeAddress: string){
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
  } else{
    throw new Error('Signer private key not available in env');
  }
  
  const safe = await Safe.init({ provider: rpcUrl, signer: signer, safeAddress });
  const isOwner = await safe.isOwner(deployerAddress);
  
  if(isOwner){
      for (const newOwner of newOwners) {
        console.log(`Proposing to add new owner: ${newOwner}`);
        const addOwnerTx = await safe.createAddOwnerTx({ownerAddress: newOwner});
        await safe.executeTransaction(addOwnerTx);
        console.log(`Owner ${newOwner} added.`);
      }
    
      console.log(`Proposing to remove old owner: ${deployerAddress}`);
      const removeOwnerTx = await safe.createRemoveOwnerTx({ownerAddress: deployerAddress, threshold});
      await safe.executeTransaction(removeOwnerTx);
      console.log(`Owner ${deployerAddress} removed.`);
    
      const updatedOwners = await safe.getOwners();
      console.log('Updated owners:', updatedOwners);
  }
}

async function main() {
    const safeAddress = '0xC9b21898E89C26B90627d4a429E02437BAa4E088'; 
    const newOwners = ['0x7053e25f7076F4986D632A3C04313C81831e0d55', '0x77B65c68E52C31eb844fb3b4864B91133e2C1308'];
    const threshold = 1; 
  
    await transferSafe(newOwners,threshold,safeAddress);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
