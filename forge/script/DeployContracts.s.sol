// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/forge-std/src/Script.sol";
import "../../contracts/Create2Deployer.sol";
import "./MarketUpdateConstants.sol";
import "../../contracts/marketupdates/MarketUpdateTimelock.sol";
import "../../contracts/marketupdates/MarketUpdateProposer.sol";
import "../../contracts/Configurator.sol";
import "../../contracts/CometProxyAdmin.sol";

contract DeployContracts is Script {
    address[] public owners; // Dynamic array to store owners
    // Variable to store the deployed safe wallet address
    address public deployedWalletAddress;

    function run() external {
        // Load environment variables
        string memory opSepoliaRpc = vm.envString("OP_SEPOLIA_RPC");
        string memory arbSepoliaRpc = vm.envString("ARB_SEPOLIA_RPC");
        string memory ethSepoliaRpc = vm.envString("ETH_SEPOLIA_RPC");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Set up the owners array
        owners.push(MarketUpdateConstants.OWNER_1);
        owners.push(MarketUpdateConstants.OWNER_2);
        owners.push(msg.sender); // You can change to a specific deployer address

        bytes32 salt = keccak256(abi.encodePacked("Salt-25"));

        // Assuming that the Safe Wallet is already deployed
        deployedWalletAddress = MarketUpdateConstants.WALLET_ADDRESS; // Store the address in the variable

        // Continue with other contract deployments using CREATE2Deployer
        Create2Deployer create2Deployer = new Create2Deployer();

        // Encode the constructor arguments into the bytecode
        bytes memory bytecode1 = abi.encodePacked(
            type(MarketUpdateTimelock).creationCode,
            abi.encode(MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS, MarketUpdateConstants.DELAY)
        );
        // Precomputing the address of MarketUpdateTimelock contract
        address marketUpdateTimelockAddress = create2Deployer.computeAddress(salt, keccak256(bytecode1));
        address marketUpdateTimelockDeployedAddress = create2Deployer.deploy(0, salt, bytecode1);

        require(marketUpdateTimelockDeployedAddress == marketUpdateTimelockAddress, "Deployed address does not match the computed address");

        // Encode the constructor arguments into the bytecode
        bytes memory bytecode2 = abi.encodePacked(
            type(MarketUpdateProposer).creationCode,
            abi.encode(MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS, deployedWalletAddress, MarketUpdateConstants.PAUSE_GUARDIAN_ADDRESS, marketUpdateTimelockAddress)
        );
        // Precompute the address of MarketUpdateProposer contract
        address marketUpdateProposerAddress = create2Deployer.computeAddress(salt, keccak256(bytecode2));
        address marketUpdateProposerDeployedAddress = create2Deployer.deploy(0, salt, bytecode2);
        require(marketUpdateProposerDeployedAddress == marketUpdateProposerAddress, "Deployed address does not match the computed address");

        // Prepare bytecode for Configurator
        bytes memory bytecode3 = abi.encodePacked(
            type(Configurator).creationCode
        );
        // Precompute the address of Configurator contract
        address configuratorAddress = create2Deployer.computeAddress(salt, keccak256(bytecode3));

        address configuratorDeployedAddress = create2Deployer.deploy(0, salt, bytecode3);
        require(configuratorDeployedAddress == configuratorAddress, "Deployed address does not match the computed address");

        // Prepare bytecode for CometProxyAdmin
        bytes memory bytecode4 = abi.encodePacked(
            type(CometProxyAdmin).creationCode
        );
        // Precompute the address of CometProxyAdmin contract
        address cometProxyAdminAddress = create2Deployer.computeAddress(salt, keccak256(bytecode4));
        address cometProxyAdminDeployedAddress = create2Deployer.deploy(0, salt, bytecode4);
        require(cometProxyAdminDeployedAddress == cometProxyAdminAddress, "Deployed address does not match the computed address");

        vm.stopBroadcast();
    }
}
