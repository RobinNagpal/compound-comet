// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@forge-std/src/Vm.sol";
import "@comet-contracts/IGovernorBravo.sol";

import "./MarketUpdateAddresses.sol";

library MarketAdminDeploymentProposer {

    function createDeploymentProposal(Vm vm, MarketUpdateAddresses.MarketUpdateAddressesStruct memory addresses, address proposalCreator) public returns (uint256) {
        IGovernorBravo governorBravo = IGovernorBravo(MarketUpdateAddresses.GOVERNOR_BRAVO_PROXY_ADDRESS);

        address cometProxyAdminOldAddress = addresses.cometProxyAdminAddress;
        address configuratorProxyAddress = addresses.configuratorProxyAddress;
        address cometProxyAddress = addresses.markets[0].cometProxyAddress;
        address cometProxyAddress_ETH = addresses.markets[0].cometProxyAddress;
        address cometProxyAddress_USDC = addresses.markets[1].cometProxyAddress;
        address cometProxyAddress_USDT = addresses.markets[2].cometProxyAddress;
        address cometProxyAddress_WST_ETH = addresses.markets[3].cometProxyAddress;
        address configuratorNewAddress = addresses.configuratorImplementationAddress;
        address cometProxyAdminNewAddress = addresses.newCometProxyAdminAddress;
        address marketAdminPermissionCheckerAddress = addresses.marketAdminPermissionCheckerAddress;
        address marketUpdateTimelockAddress = addresses.marketUpdateTimelockAddress;
        address marketUpdateProposerAddress = addresses.marketAdminProposerAddress;

        address[] memory targets = new address[](10);
        uint256[] memory values = new uint256[](10);
        string[] memory signatures = new string[](10);
        bytes[] memory calldatas = new bytes[](10);
        string memory description = "Proposal to trigger updates for market admin";

        targets[0] = cometProxyAdminOldAddress;
        signatures[0] = "changeProxyAdmin(address,address)";
        calldatas[0] = abi.encode(configuratorProxyAddress, cometProxyAdminNewAddress);

        targets[1] = cometProxyAdminOldAddress;
        signatures[1] = "changeProxyAdmin(address,address)";
        calldatas[1] = abi.encode(cometProxyAddress_ETH, cometProxyAdminNewAddress);

        targets[2] = cometProxyAdminOldAddress;
        signatures[2] = "changeProxyAdmin(address,address)";
        calldatas[2] = abi.encode(cometProxyAddress_USDC, cometProxyAdminNewAddress);

        targets[3] = cometProxyAdminOldAddress;
        signatures[3] = "changeProxyAdmin(address,address)";
        calldatas[3] = abi.encode(cometProxyAddress_USDT, cometProxyAdminNewAddress);

        targets[4] = cometProxyAdminOldAddress;
        signatures[4] = "changeProxyAdmin(address,address)";
        calldatas[4] = abi.encode(cometProxyAddress_WST_ETH, cometProxyAdminNewAddress);

        targets[5] = cometProxyAdminNewAddress;
        signatures[5] = "upgrade(address,address)";
        calldatas[5] = abi.encode(configuratorProxyAddress, configuratorNewAddress);

        targets[6] = marketAdminPermissionCheckerAddress;
        signatures[6] = "setMarketAdmin(address)";
        calldatas[6] = abi.encode(marketUpdateTimelockAddress);

        targets[7] = configuratorProxyAddress;
        signatures[7] = "setMarketAdminPermissionChecker(address)";
        calldatas[7] = abi.encode(marketAdminPermissionCheckerAddress);

        targets[8] = cometProxyAdminNewAddress;
        signatures[8] = "setMarketAdminPermissionChecker(address)";
        calldatas[8] = abi.encode(marketAdminPermissionCheckerAddress);

        targets[9] = marketUpdateTimelockAddress;
        signatures[9] = "setMarketUpdateProposer(address)";
        calldatas[9] = abi.encode(marketUpdateProposerAddress);

        vm.startBroadcast(proposalCreator);
        uint256 proposalId = governorBravo.propose(targets, values, signatures, calldatas, description);
        vm.stopBroadcast();

        return proposalId;
    }
}
