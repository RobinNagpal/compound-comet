import {ethers} from 'hardhat';
import hre from 'hardhat';
import { ContractDeployTransaction } from "ethers";

async function main() {
  const deployedBytecode = await ethers.provider.getCode('0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2');
  const localBytecode = (await ethers.getContractFactory('Create2Deployer')).bytecode;
    
  console.log(deployedBytecode === localBytecode); // Should be true if they match
  
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("Account balance:", balance.toString());
    
  // Get the Create2 Deployer contract at its known address
  const create2DeployerAddress = "0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2";
  const Create2Deployer = await ethers.getContractAt("Create2Deployer", create2DeployerAddress);

  // Define your contract bytecode
  const ContractFactory = await ethers.getContractFactory('MarketUpdateProposer');
  let creationBytecode: ContractDeployTransaction;
//   let initCodehash: string;

  creationBytecode = await ContractFactory.getDeployTransaction();
//   initCodehash = hre.ethers.keccak256(creationBytecode.data);
  
  const artifact = hre.artifacts.readArtifact('MarketUpdateProposer');
  const bytecode = (await artifact).bytecode;
  console.log('bytecode: ', bytecode);

  // Define your salt
  const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("my-salt-string"));
  console.log('salt: ', salt);
  // Deploy using CREATE2
  const tx = await Create2Deployer.deploy(0, salt, creationBytecode.data); // value = 0 for no ether transfer
  console.log('txn: ', tx);

  console.log("Deployment Transaction:", tx);
  await tx.wait();

  // Compute the deterministic address using the same salt and bytecode
  const expectedAddress = await Create2Deployer.computeAddress(salt, ethers.utils.keccak256(bytecode));

  console.log("Deployed Contract Address (Deterministic):", expectedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
