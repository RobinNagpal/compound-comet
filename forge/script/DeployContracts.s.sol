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
    address[] public owners;
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

        owners.push(MarketUpdateConstants.OWNER_1);
        owners.push(MarketUpdateConstants.OWNER_2);
        owners.push(msg.sender);

        bytes32 salt = keccak256(abi.encodePacked("Salt-31"));

        deployedWalletAddress = MarketUpdateConstants.WALLET_ADDRESS;

        ICreate2Deployer create2Deployer = ICreate2Deployer(MarketUpdateConstants.CREATE2_DEPLOYER_ADDRESS);

        // Prepare deployment parameters for each contract
        ContractDeploymentParams memory marketUpdateTimelockParams = ContractDeploymentParams({
            creationCode: type(MarketUpdateTimelock).creationCode,
            constructorArgs: abi.encode(MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS, MarketUpdateConstants.DELAY),
            expectedRuntimeCode: type(MarketUpdateTimelock).runtimeCode,
            contractName: "MarketUpdateTimelock"
        });

        address computedMarketUpdateTimelockAddress = deployContractWithCreate2(create2Deployer, salt, marketUpdateTimelockParams);

        ContractDeploymentParams memory marketUpdateProposerParams = ContractDeploymentParams({
            creationCode: type(MarketUpdateProposer).creationCode,
            constructorArgs: abi.encode(
                MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS,
                deployedWalletAddress,
                MarketUpdateConstants.PAUSE_GUARDIAN_ADDRESS,
                computedMarketUpdateTimelockAddress
            ),
            expectedRuntimeCode: type(MarketUpdateProposer).runtimeCode,
            contractName: "MarketUpdateProposer"
        });

        address computedMarketUpdateProposerAddress = deployContractWithCreate2(create2Deployer, salt, marketUpdateProposerParams);

        ContractDeploymentParams memory configuratorParams = ContractDeploymentParams({
            creationCode: type(Configurator).creationCode,
            constructorArgs: "",
            expectedRuntimeCode: type(Configurator).runtimeCode,
            contractName: "Configurator"
        });

        address computedConfiguratorAddress = deployContractWithCreate2(create2Deployer, salt, configuratorParams);

        ContractDeploymentParams memory cometProxyAdminParams = ContractDeploymentParams({
            creationCode: type(CometProxyAdmin).creationCode,
            constructorArgs: abi.encode(timelock),
            expectedRuntimeCode: type(CometProxyAdmin).runtimeCode,
            contractName: "CometProxyAdmin"
        });

        address computedCometProxyAdminAddress = deployContractWithCreate2(create2Deployer, salt, cometProxyAdminParams);

        console.log("Owner of cometProxyAdmin: ", CometProxyAdmin(computedCometProxyAdminAddress).owner());

        ContractDeploymentParams memory marketAdminPermissionCheckerParams = ContractDeploymentParams({
            creationCode: type(MarketAdminPermissionChecker).creationCode,
            constructorArgs: abi.encode(timelock, address(0), address(0)),
            expectedRuntimeCode: type(MarketAdminPermissionChecker).runtimeCode,
            contractName: "MarketAdminPermissionChecker"
        });

        address computedMarketAdminPermissionCheckerAddress = deployContractWithCreate2(create2Deployer, salt, marketAdminPermissionCheckerParams);

        vm.stopBroadcast();

        // Write the computed addresses to a Solidity file
        writeAddressesToFile(
            computedMarketUpdateTimelockAddress,
            computedMarketUpdateProposerAddress,
            computedConfiguratorAddress,
            computedCometProxyAdminAddress,
            computedMarketAdminPermissionCheckerAddress
        );
    }

    function deployContractWithCreate2(
        ICreate2Deployer create2Deployer,
        bytes32 salt,
        ContractDeploymentParams memory params
    ) internal returns (address) {
        bytes memory bytecode = abi.encodePacked(params.creationCode, params.constructorArgs);
        address computedAddress = create2Deployer.computeAddress(salt, keccak256(bytecode));
        console.log("computed ", params.contractName, "Address: ", computedAddress);
        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecode, computedAddress, params.expectedRuntimeCode);
        return computedAddress;
    }

    function checkOrDeployAndCompareBytecodes(
        ICreate2Deployer create2Deployer,
        bytes32 salt,
        bytes memory actualBytecode,
        address computedAddress,
        bytes memory expectedBytecode
    ) internal {
        uint256 contractCodeSize = getContractCodeSizeAtAddress(computedAddress);

        if (contractCodeSize > 0) {
            bytes memory deployedBytecode = verifyDeployedBytecode(computedAddress, contractCodeSize);

            require(
                keccak256(deployedBytecode) == keccak256(expectedBytecode),
                "Deployed bytecode does not match the expected bytecode"
            );
        } else {
            deployAndCompareBytecodes(create2Deployer, salt, actualBytecode, computedAddress, expectedBytecode);
        }
    }

    function deployAndCompareBytecodes(
        ICreate2Deployer create2Deployer,
        bytes32 salt,
        bytes memory actualBytecode,
        address computedAddress,
        bytes memory expectedBytecode
    ) internal {
        create2Deployer.deploy(0, salt, actualBytecode);

        uint256 size = getContractCodeSizeAtAddress(computedAddress);
        require(size > 0, "No contract deployed at this address");

        bytes memory deployedBytecode = new bytes(size);
        assembly {
            extcodecopy(computedAddress, add(deployedBytecode, 0x20), 0, size)
        }

        require(
            keccak256(deployedBytecode) == keccak256(expectedBytecode),
            "Deployed bytecode does not match the expected bytecode"
        );
    }

    function getContractCodeSizeAtAddress(address contractAddress) internal view returns (uint256) {
        uint256 size;
        assembly {
            size := extcodesize(contractAddress)
        }
        return size;
    }

    function verifyDeployedBytecode(address computedAddress, uint256 contractCodeSize) internal view returns (bytes memory) {
        bytes memory deployedBytecode = new bytes(contractCodeSize);
        assembly {
            extcodecopy(computedAddress, add(deployedBytecode, 0x20), 0, contractCodeSize)
        }
        return deployedBytecode;
    }

    function writeAddressesToFile(
        address computedMarketUpdateTimelockAddress,
        address computedMarketUpdateProposerAddress,
        address computedConfiguratorAddress,
        address computedCometProxyAdminAddress,
        address computedMarketAdminPermissionCheckerAddress
    ) internal {
        string memory path = "./forge/script/helperContracts/DeployedAddresses.sol";
        string memory content = "// SPDX-License-Identifier: MIT\n\npragma solidity ^0.8.15;\n\ncontract DeployedAddresses {\n";

        content = string(
            abi.encodePacked(
                content,
                "    address public constant computedMarketUpdateTimelockAddress = ",
                addressToString(computedMarketUpdateTimelockAddress),
                ";\n"
            )
        );
        content = string(
            abi.encodePacked(
                content,
                "    address public constant computedMarketUpdateProposerAddress = ",
                addressToString(computedMarketUpdateProposerAddress),
                ";\n"
            )
        );
        content = string(
            abi.encodePacked(
                content,
                "    address public constant computedConfiguratorAddress = ",
                addressToString(computedConfiguratorAddress),
                ";\n"
            )
        );
        content = string(
            abi.encodePacked(
                content,
                "    address public constant computedCometProxyAdminAddress = ",
                addressToString(computedCometProxyAdminAddress),
                ";\n"
            )
        );
        content = string(
            abi.encodePacked(
                content,
                "    address public constant computedMarketAdminPermissionCheckerAddress = ",
                addressToString(computedMarketAdminPermissionCheckerAddress),
                ";\n"
            )
        );

        content = string(abi.encodePacked(content, "}\n"));

        vm.writeFile(path, content);
    }

    function addressToString(address account) internal pure returns (string memory) {
        bytes20 addrBytes = bytes20(account);
        bytes memory hexChars = "0123456789abcdef";
        bytes memory chars = new bytes(40);

        // Convert address to lowercase hex string
        for (uint256 i = 0; i < 20; i++) {
            uint8 b = uint8(addrBytes[i]);
            chars[2 * i] = hexChars[b >> 4];
            chars[2 * i + 1] = hexChars[b & 0x0f];
        }

        // Compute the keccak256 hash of the lowercase address string
        bytes32 hash = keccak256(chars);

        // Apply EIP-55 checksum by conditionally capitalizing letters
        for (uint256 i = 0; i < 40; i++) {
            // Check if character is a letter
            if (chars[i] >= 'a' && chars[i] <= 'f') {
                // Determine whether to capitalize based on the hash
                uint8 hashNibble = uint8(hash[i / 2]);
                if (i % 2 == 0) {
                    hashNibble = hashNibble >> 4;
                } else {
                    hashNibble = hashNibble & 0x0f;
                }
                if (hashNibble >= 8) {
                    // Capitalize the letter
                    chars[i] = bytes1(uint8(chars[i]) - 32);
                }
            }
        }

        // Prepend '0x' and return the checksummed address string
        return string(abi.encodePacked('0x', chars));
    }
}
