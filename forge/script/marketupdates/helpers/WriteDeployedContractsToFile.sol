// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/forge-std/src/Vm.sol";
import "../lib/forge-std/src/console.sol";
import "./MarketUpdateConstants.sol";
import "../../contracts/marketupdates/MarketUpdateTimelock.sol";
import "../../contracts/marketupdates/MarketUpdateProposer.sol";
import "../../contracts/Configurator.sol";
import "../../contracts/CometProxyAdmin.sol";
import "../../contracts/marketupdates/MarketAdminPermissionChecker.sol";
import "../../contracts/Create2DeployerInterface.sol";

library WriteDeployedContractsToFile {

    function writeAddressesToFile(
        VmSafe storage vm,
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
