import {Provider} from '@ethersproject/providers';
import {Create2Deployer} from './../build/types';
import {ethers} from 'hardhat';
import hre from 'hardhat';

async function main() {
  const deployedBytecode = await ethers.provider.getCode('0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2');
  const localBytecode = (await ethers.getContractFactory('Create2Deployer')).bytecode;
    
  console.log(deployedBytecode === localBytecode); // Should be true if they match
  
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  const balance = await deployer.getBalance();
  console.log('Account balance:', balance.toString());
    
  // Get the Create2 Deployer contract at its known address
  const create2DeployerAddress = '0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2';
  const create2Deployer = await ethers.getContractAt('Create2Deployer', create2DeployerAddress) as Create2Deployer;

  // Define your contract bytecode
  const ContractFactory = await ethers.getContractFactory('MarketUpdateProposer');


  const creationBytecode = await ContractFactory.getDeployTransaction();

  const artifact = hre.artifacts.readArtifact('MarketUpdateProposer');
  const bytecode = (await artifact).bytecode;
  const deployedByteCode = (await artifact).deployedBytecode;
  // console.log('bytecode: ', bytecode);

  // Define your salt
  const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('my-salt-string'));
  console.log('salt: ', salt);

  const contractAddress = await create2Deployer.computeAddress(salt, ethers.utils.keccak256(bytecode));

  console.log('Deterministic Address of MarketUpdateProposer:', contractAddress);

  const marketProposer =  await ethers.getContractAt('MarketUpdateProposer', contractAddress);

  if(marketProposer) {
    const marketProposerByteCode = await marketProposer.provider.getCode(marketProposer.address);
    console.log('MarketUpdateProposer already deployed at address: ', contractAddress);

    console.log('MarketUpdateProposer ByteCode is Same? : ', marketProposerByteCode.toLowerCase() == deployedByteCode.toLowerCase());
    return;
  } else {
    // Deploy using CREATE2
    const tx = await create2Deployer.deploy(0, salt, creationBytecode.data); // value = 0 for no ether transfer
    console.log('txn: ', tx);

    // console.log('Deployment Transaction:', tx);
    await tx.wait();

    // Compute the deterministic address using the same salt and bytecode
    const expectedAddress = await create2Deployer.computeAddress(salt, ethers.utils.keccak256(bytecode));

    console.log('Deployed Contract Address (Deterministic):', expectedAddress);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
