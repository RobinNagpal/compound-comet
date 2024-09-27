// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";
import "./MarketUpdateConstants.sol";
import "../../contracts/marketupdates/MarketUpdateTimelock.sol";
import "../../contracts/marketupdates/MarketUpdateProposer.sol";
import "../../contracts/Configurator.sol";
import "../../contracts/CometProxyAdmin.sol";
import "../../contracts/marketupdates/MarketAdminPermissionChecker.sol";
import "../../contracts/Create2DeployerInterface.sol";

contract DeployContracts is Script {
    address[] public owners; // Dynamic array to store owners
    // Variable to store the deployed safe wallet address
    address public deployedWalletAddress;

    function run() external {
        address timelock = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Set up the owners array
        owners.push(MarketUpdateConstants.OWNER_1);
        owners.push(MarketUpdateConstants.OWNER_2);
        owners.push(msg.sender); // You can change to a specific deployer address

        bytes32 salt = keccak256(abi.encodePacked("Salt-31"));

        // Assuming that the Safe Wallet is already deployed
        deployedWalletAddress = MarketUpdateConstants.WALLET_ADDRESS; // Store the address in the variable

        // Continue with other contract deployments using CREATE2Deployer
        ICreate2Deployer create2Deployer = ICreate2Deployer(MarketUpdateConstants.CREATE2_DEPLOYER_ADDRESS);

        // Encode the constructor arguments into the bytecode
        bytes memory bytecodeMarketUpdateTimelock = abi.encodePacked(
            type(MarketUpdateTimelock).creationCode,
            abi.encode(MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS, MarketUpdateConstants.DELAY)
        );
        // Precomputing the address of MarketUpdateTimelock contract
        address computedMarketUpdateTimelockAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeMarketUpdateTimelock));
        console.log("computed MarketUpdateTimelockAddress: ", computedMarketUpdateTimelockAddress);

        bytes memory expectedBytecodeMarketUpdateTimelock = type(MarketUpdateTimelock).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeMarketUpdateTimelock, computedMarketUpdateTimelockAddress, expectedBytecodeMarketUpdateTimelock);

        // Encode the constructor arguments into the bytecode
        bytes memory bytecodeMarketUpdateProposer = abi.encodePacked(
            type(MarketUpdateProposer).creationCode,
            abi.encode(MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS, deployedWalletAddress, MarketUpdateConstants.PAUSE_GUARDIAN_ADDRESS, computedMarketUpdateTimelockAddress)
        );
        // Precompute the address of MarketUpdateProposer contract
        address computedMarketUpdateProposerAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeMarketUpdateProposer));
        console.log("computed MarketUpdateProposerAddress: ", computedMarketUpdateProposerAddress);

        bytes memory expectedBytecodeMarketUpdateProposer = type(MarketUpdateProposer).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeMarketUpdateProposer, computedMarketUpdateProposerAddress, expectedBytecodeMarketUpdateProposer);

        // Prepare bytecode for Configurator
        bytes memory bytecodeConfigurator = abi.encodePacked(
            type(Configurator).creationCode
        );
        // Precompute the address of Configurator contract
        address computedConfiguratorAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeConfigurator));
        console.log("computed ConfiguratorAddress: ", computedConfiguratorAddress);

        bytes memory expectedBytecodeConfigurator = type(Configurator).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeConfigurator, computedConfiguratorAddress, expectedBytecodeConfigurator);

        // Prepare bytecode for CometProxyAdmin
        bytes memory bytecodeCometProxyAdmin = abi.encodePacked(
            type(CometProxyAdmin).creationCode,
            abi.encode(timelock)
        );
        // Precompute the address of CometProxyAdmin contract
        address computedCometProxyAdminAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeCometProxyAdmin));
        console.log("computedCometProxyAdminAddress: ", computedCometProxyAdminAddress);

        bytes memory expectedBytecodeCometProxyAdmin = type(CometProxyAdmin).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeCometProxyAdmin, computedCometProxyAdminAddress, expectedBytecodeCometProxyAdmin);

        console.log("Owner of cometProxyAdmin: ", CometProxyAdmin(computedCometProxyAdminAddress).owner());

         // Prepare bytecode for MarketAdminPermissionChecker
        bytes memory bytecodeMarketAdminPermissionChecker = abi.encodePacked(
            type(MarketAdminPermissionChecker).creationCode,
            abi.encode(timelock, address(0), address(0))
        );
        // Precompute the address of MarketAdminPermissionChecker contract
        address computedMarketAdminPermissionCheckerAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeMarketAdminPermissionChecker));
        console.log("computed MarketAdminPermissionCheckerAddress: ", computedMarketAdminPermissionCheckerAddress);

        bytes memory expectedBytecodeMarketAdminPermissionChecker = type(MarketAdminPermissionChecker).runtimeCode;

//        create2Deployer.deploy(0, salt, bytecodeMarketAdminPermissionChecker);

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeMarketAdminPermissionChecker, computedMarketAdminPermissionCheckerAddress, expectedBytecodeMarketAdminPermissionChecker);

        vm.stopBroadcast();
    }

    function deployAndCompareBytecodes(ICreate2Deployer create2Deployer, bytes32 salt, bytes memory actualBytecode, address computedAddress, bytes memory expectedBytecode) internal {
        uint256 size;

        // Deploy the contract using CREATE2Deployer
        create2Deployer.deploy(0, salt, actualBytecode);

        // Check if the contract is deployed at the computed address
        assembly {
            size := extcodesize(computedAddress)
        }
        require(size > 0, "No contract deployed at this address");

        // Check if the bytecode matches the expected bytecode
        bytes memory deployedBytecode = new bytes(size); // Initialize a bytes array with the size of the contract code
        assembly {
            extcodecopy(computedAddress, add(deployedBytecode, 0x20), 0, size)
        }

        require(keccak256(deployedBytecode) == keccak256(expectedBytecode), "Deployed bytecode does not match the expected bytecode");
    }

    function checkOrDeployAndCompareBytecodes(ICreate2Deployer create2Deployer, bytes32 salt, bytes memory actualBytecode, address computedAddress, bytes memory expectedBytecode) internal {
        uint256 contractCodeSize = getContractCodeSizeAtAddress(computedAddress);

        if (contractCodeSize > 0) {
            // The contract is already deployed, skipping the deployment and comparing the bytecode
            bytes memory deployedBytecode = verifyDeployedBytecode(computedAddress, contractCodeSize);
            
            require(keccak256(deployedBytecode) == keccak256(expectedBytecode), "Deployed bytecode does not match the expected bytecode");
        } else {
            // Deploy the contract if it is not already deployed and compare the bytecodes
            deployAndCompareBytecodes(create2Deployer, salt, actualBytecode, computedAddress, expectedBytecode);
        }
    }

    function getContractCodeSizeAtAddress(address contractAddress) internal view returns (uint256) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        return size;
    }

    function verifyDeployedBytecode(address computedAddress, uint256 contractCodeSize) internal view returns (bytes memory) {
        bytes memory deployedBytecode = new bytes(contractCodeSize); // Initialize a bytes array with the size of the contract code
        assembly {
            extcodecopy(computedAddress, add(deployedBytecode, 0x20), 0, contractCodeSize)
        }
        return deployedBytecode;
    }
}
