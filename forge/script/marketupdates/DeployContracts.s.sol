// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";
import "./helpers/MarketUpdateAddresses.sol";
import "../../contracts/marketupdates/MarketUpdateTimelock.sol";
import "../../contracts/marketupdates/MarketUpdateProposer.sol";
import "../../contracts/Configurator.sol";
import "../../contracts/CometProxyAdmin.sol";
import "../../contracts/marketupdates/MarketAdminPermissionChecker.sol";
import "../../contracts/Create2DeployerInterface.sol";

contract DeployContracts is Script {
    address public deployedWalletAddress;

    struct ContractDeploymentParams {
        bytes creationCode;
        bytes constructorArgs;
        bytes expectedRuntimeCode;
        string contractName;
    }

    function run() external {
        address timelock = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        
        bytes32 salt = keccak256(abi.encodePacked("Salt-31"));

        /// Call library function
        /// Console log deployed contracts

        vm.stopBroadcast();
    }
}
`
