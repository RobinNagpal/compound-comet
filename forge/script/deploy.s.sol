// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../../contracts/Create2Deployer.sol";
import "./contracts/MultiSigWallet.sol";
import "../../contracts/marketupdates/MarketUpdateTimelock.sol";
import {console} from "forge-std/console.sol";

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
        bytes32 salt = keccak256(abi.encodePacked("Salt-15"));

        // Deploy MultiSigWallet
        MultiSigWallet wallet = new MultiSigWallet(owners, threshold);
        deployedWalletAddress = address(wallet); // Store the address in the variable
        console.log("Deployed wallet address:", deployedWalletAddress);

        // Continue with other contract deployments using CREATE2Deployer
        Create2Deployer create2Deployer = Create2Deployer(payable(0x13b0D85CcB8bf860b6b79AF3029fCA081AE9beF2));

               // Prepare constructor arguments for MarketUpdateTimelock
        address governorAddress = deployedWalletAddress; // Use the deployed wallet address as governor
        uint256 delay = 360000; // Set the desired delay (e.g., 3600 seconds)

        // Encode the constructor arguments into the bytecode
        bytes memory bytecode = abi.encodePacked(
            type(MarketUpdateTimelock).creationCode,
            abi.encode(governorAddress, delay)
        );
        create2Deployer.deploy(0, salt, bytecode);
        // console.log("MarketUpdateTimelock deployed at:", marketUpdateTimelockAddress);

        // Repeat similar steps for other contracts
        // ...

        vm.stopBroadcast();
    }
}
