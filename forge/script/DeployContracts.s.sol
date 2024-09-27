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

    function run() external {
        address timelock = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        owners.push(MarketUpdateConstants.OWNER_1);
        owners.push(MarketUpdateConstants.OWNER_2);
        owners.push(msg.sender);

        bytes32 salt = keccak256(abi.encodePacked("Salt-31"));

        deployedWalletAddress = MarketUpdateConstants.WALLET_ADDRESS;

        ICreate2Deployer create2Deployer = ICreate2Deployer(MarketUpdateConstants.CREATE2_DEPLOYER_ADDRESS);

        bytes memory bytecodeMarketUpdateTimelock = abi.encodePacked(
            type(MarketUpdateTimelock).creationCode,
            abi.encode(MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS, MarketUpdateConstants.DELAY)
        );
        address computedMarketUpdateTimelockAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeMarketUpdateTimelock));
        console.log("computed MarketUpdateTimelockAddress: ", computedMarketUpdateTimelockAddress);

        bytes memory expectedBytecodeMarketUpdateTimelock = type(MarketUpdateTimelock).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeMarketUpdateTimelock, computedMarketUpdateTimelockAddress, expectedBytecodeMarketUpdateTimelock);

        bytes memory bytecodeMarketUpdateProposer = abi.encodePacked(
            type(MarketUpdateProposer).creationCode,
            abi.encode(MarketUpdateConstants.GOVERNOR_TIMELOCK_ADDRESS, deployedWalletAddress, MarketUpdateConstants.PAUSE_GUARDIAN_ADDRESS, computedMarketUpdateTimelockAddress)
        );
        address computedMarketUpdateProposerAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeMarketUpdateProposer));
        console.log("computed MarketUpdateProposerAddress: ", computedMarketUpdateProposerAddress);

        bytes memory expectedBytecodeMarketUpdateProposer = type(MarketUpdateProposer).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeMarketUpdateProposer, computedMarketUpdateProposerAddress, expectedBytecodeMarketUpdateProposer);

        bytes memory bytecodeConfigurator = abi.encodePacked(
            type(Configurator).creationCode
        );
        address computedConfiguratorAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeConfigurator));
        console.log("computed ConfiguratorAddress: ", computedConfiguratorAddress);

        bytes memory expectedBytecodeConfigurator = type(Configurator).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeConfigurator, computedConfiguratorAddress, expectedBytecodeConfigurator);

        bytes memory bytecodeCometProxyAdmin = abi.encodePacked(
            type(CometProxyAdmin).creationCode,
            abi.encode(timelock)
        );
        address computedCometProxyAdminAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeCometProxyAdmin));
        console.log("computedCometProxyAdminAddress: ", computedCometProxyAdminAddress);

        bytes memory expectedBytecodeCometProxyAdmin = type(CometProxyAdmin).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeCometProxyAdmin, computedCometProxyAdminAddress, expectedBytecodeCometProxyAdmin);

        console.log("Owner of cometProxyAdmin: ", CometProxyAdmin(computedCometProxyAdminAddress).owner());

        bytes memory bytecodeMarketAdminPermissionChecker = abi.encodePacked(
            type(MarketAdminPermissionChecker).creationCode,
            abi.encode(timelock, address(0), address(0))
        );
        address computedMarketAdminPermissionCheckerAddress = create2Deployer.computeAddress(salt, keccak256(bytecodeMarketAdminPermissionChecker));
        console.log("computed MarketAdminPermissionCheckerAddress: ", computedMarketAdminPermissionCheckerAddress);

        bytes memory expectedBytecodeMarketAdminPermissionChecker = type(MarketAdminPermissionChecker).runtimeCode;

        checkOrDeployAndCompareBytecodes(create2Deployer, salt, bytecodeMarketAdminPermissionChecker, computedMarketAdminPermissionCheckerAddress, expectedBytecodeMarketAdminPermissionChecker);

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

    function checkOrDeployAndCompareBytecodes(ICreate2Deployer create2Deployer, bytes32 salt, bytes memory actualBytecode, address computedAddress, bytes memory expectedBytecode) internal {
        uint256 contractCodeSize = getContractCodeSizeAtAddress(computedAddress);

        if (contractCodeSize > 0) {
            bytes memory deployedBytecode = verifyDeployedBytecode(computedAddress, contractCodeSize);

            require(keccak256(deployedBytecode) == keccak256(expectedBytecode), "Deployed bytecode does not match the expected bytecode");
        } else {
            deployAndCompareBytecodes(create2Deployer, salt, actualBytecode, computedAddress, expectedBytecode);
        }
    }

    function deployAndCompareBytecodes(ICreate2Deployer create2Deployer, bytes32 salt, bytes memory actualBytecode, address computedAddress, bytes memory expectedBytecode) internal {
        uint256 size;

        create2Deployer.deploy(0, salt, actualBytecode);

        assembly {
            size := extcodesize(computedAddress)
        }
        require(size > 0, "No contract deployed at this address");

        bytes memory deployedBytecode = new bytes(size);
        assembly {
            extcodecopy(computedAddress, add(deployedBytecode, 0x20), 0, size)
        }

        require(keccak256(deployedBytecode) == keccak256(expectedBytecode), "Deployed bytecode does not match the expected bytecode");
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
        string memory path = "./contracts/marketupdates/DeployedAddresses.sol";
        string memory content = "// SPDX-License-Identifier: MIT\n\npragma solidity ^0.8.15;\n\ncontract DeployedAddresses {\n";

        content = string(abi.encodePacked(content, "    address public constant computedMarketUpdateTimelockAddress = ", addressToString(computedMarketUpdateTimelockAddress), ";\n"));
        content = string(abi.encodePacked(content, "    address public constant computedMarketUpdateProposerAddress = ", addressToString(computedMarketUpdateProposerAddress), ";\n"));
        content = string(abi.encodePacked(content, "    address public constant computedConfiguratorAddress = ", addressToString(computedConfiguratorAddress), ";\n"));
        content = string(abi.encodePacked(content, "    address public constant computedCometProxyAdminAddress = ", addressToString(computedCometProxyAdminAddress), ";\n"));
        content = string(abi.encodePacked(content, "    address public constant computedMarketAdminPermissionCheckerAddress = ", addressToString(computedMarketAdminPermissionCheckerAddress), ";\n"));

        content = string(abi.encodePacked(content, "}\n"));

        vm.writeFile(path, content);
    }

    function addressToString(address _address) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_address)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + 2 * 20);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
