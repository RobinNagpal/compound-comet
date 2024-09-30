// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MarketUpdateAddresses.sol";
import "./MarketUpdateContractsDeployer.sol";

library MarketAdminDeploymentProposer {
    function createDeploymentProposal(MarketUpdateAddresses.MarketUpdateAddressesStruct memory addresses) public {
        address cometProxyAdminOldAddress = addresses.cometProxyAdminAddress;
        address configuratorProxyAddress = addresses.configuratorProxyAddress;
        address newCometProxyAdminAddress = addresses.newCometProxyAdminAddress;


        // do it for each market
        address cometProxyAdminNewAddress = addresses.cometProxyAdminAddress;


        address[] memory targets = new address[](7);
        uint256[] memory values = new uint256[](7);
        string[] memory signatures = new string[](7);
        bytes[] memory calldatas = new bytes[](7);
        string memory description = "Proposal to trigger updates for market admin";

        targets[0] = cometProxyAdminOldAddress;
        signatures[0] = "changeProxyAdmin(address,address)";
        calldatas[0] = abi.encode(configuratorProxyAddress, cometProxyAdminNewAddress);

        targets[1] = cometProxyAdminOldAddress;
        signatures[1] = "changeProxyAdmin(address,address)";
        calldatas[1] = abi.encode(newCometProxyAdminAddress, cometProxyAdminNewAddress);

        targets[2] = cometProxyAdminNewAddress;
        signatures[2] = "upgrade(address,address)";
        calldatas[2] = abi.encode(configuratorProxyAddress, configuratorNewAddress);

        targets[3] = marketAdminPermissionCheckerAddress;
        signatures[3] = "setMarketAdmin(address)";
        calldatas[3] = abi.encode(marketUpdateTimelockAddress);

        targets[4] = configuratorProxyAddress;
        signatures[4] = "setMarketAdminPermissionChecker(address)";
        calldatas[4] = abi.encode(marketAdminPermissionCheckerAddress);

        targets[5] = cometProxyAdminNewAddress;
        signatures[5] = "setMarketAdminPermissionChecker(address)";
        calldatas[5] = abi.encode(marketAdminPermissionCheckerAddress);

        targets[6] = marketUpdateTimelockAddress;
        signatures[6] = "setMarketUpdateProposer(address)";
        calldatas[6] = abi.encode(marketUpdateProposerAddress);
    }
}
