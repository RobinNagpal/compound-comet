// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../../contracts/Create2Deployer.sol";
import "./contracts/MultiSigWallet.sol";
import "../../contracts/marketupdates/MarketUpdateTimelock.sol";
import "../../contracts/marketupdates/MarketUpdateProposer.sol";
import "../../contracts/Configurator.sol";
import "../../contracts/CometProxyAdmin.sol";

contract DeployContracts is Script {
    address[] public owners; // Dynamic array to store owners
    // Variable to store the deployed multisig wallet address
    address public deployedWalletAddress;

    function run() external {
        // Load environment variables (if using `.env`)
        string memory opSepoliaRpc = vm.envString("OP_SEPOLIA_RPC");
        string memory arbSepoliaRpc = vm.envString("ARB_SEPOLIA_RPC");
        string memory ethSepoliaRpc = vm.envString("ETH_SEPOLIA_RPC");
        // string memory privateKey = vm.envString("PRIVATE_KEY");

        // Set up deployer and RPC URL
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Set up the owners array
        owners.push(0x7053e25f7076F4986D632A3C04313C81831e0d55);
        owners.push(0x77B65c68E52C31eb844fb3b4864B91133e2C1308);
        owners.push(msg.sender); // You can change to a specific deployer address

        uint256 threshold = 2; // Required number of approvals
        bytes32 salt = keccak256(abi.encodePacked("Salt-25"));

        // Deploy MultiSigWallet
        MultiSigWallet wallet = new MultiSigWallet(owners, threshold);
        deployedWalletAddress = address(wallet); // Store the address in the variable

        // Continue with other contract deployments using CREATE2Deployer
        Create2Deployer create2Deployer = new Create2Deployer();

        // Prepare constructor arguments for MarketUpdateTimelock
        address governorTimelockAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
        uint256 delay = 360000; // Set the desired delay (e.g., 3600 seconds)

        // Encode the constructor arguments into the bytecode
        bytes memory bytecode1 = abi.encodePacked(
            type(MarketUpdateTimelock).creationCode,
            abi.encode(governorTimelockAddress, delay)
        );
        // Precomputing the address of MarketUpdateTimelock contract
        address marketUpdateTimelockAddress = create2Deployer.computeAddress(salt, keccak256(bytecode1));
        address marketUpdateTimelockDeployedAddress = create2Deployer.deploy(0, salt, bytecode1);

        require(marketUpdateTimelockDeployedAddress == marketUpdateTimelockAddress, "Deployed address does not match the computed address");

        // Prepare constructor arguments for MarketUpdateProposer
        address pauseGuardianAddr = 0x7053e25f7076F4986D632A3C04313C81831e0d55;
        // Encode the constructor arguments into the bytecode
        bytes memory bytecode2 = abi.encodePacked(
            type(MarketUpdateProposer).creationCode,
            abi.encode(governorTimelockAddress, deployedWalletAddress, pauseGuardianAddr, marketUpdateTimelockAddress)
        );
        // Precompute the address of MarketUpdateProposer contract
        address MarketUpdateProposerAddress = create2Deployer.computeAddress(salt, keccak256(bytecode2));
        address marketUpdateProposerDeployedAddress = create2Deployer.deploy(0, salt, bytecode2);
        require(marketUpdateProposerDeployedAddress == MarketUpdateProposerAddress, "Deployed address does not match the computed address");

        // Prepare bytecode for Configurator
        bytes memory bytecode3 = abi.encodePacked(
            type(Configurator).creationCode
        );
        // Precompute the address of Configurator contract
        address ConfiguratorAddress = create2Deployer.computeAddress(salt, keccak256(bytecode3));

        address ConfiguratorDeployedAddress = create2Deployer.deploy(0, salt, bytecode3);
        require(ConfiguratorDeployedAddress == ConfiguratorAddress, "Deployed address does not match the computed address");

        // Prepare bytecode for CometProxyAdmin
        bytes memory bytecode4 = abi.encodePacked(
            type(CometProxyAdmin).creationCode
        );
        // Precompute the address of CometProxyAdmin contract
        address CometProxyAdminAddress = create2Deployer.computeAddress(salt, keccak256(bytecode4));
        address CometProxyAdminDeployedAddress = create2Deployer.deploy(0, salt, bytecode4);
        require(CometProxyAdminDeployedAddress == CometProxyAdminAddress, "Deployed address does not match the computed address");

        vm.stopBroadcast();
    }
}
