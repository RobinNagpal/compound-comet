// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@forge-std/src/Vm.sol";
import "./MarketUpdateAddresses.sol";
import "@comet-contracts/IGovernorBravo.sol";

library MarketAdminDeploymentProposer {

    address constant governorBravoProxyAddress = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;
    IGovernorBravo constant governorBravo = IGovernorBravo(governorBravoProxyAddress);

    function createDeploymentProposal(Vm vm, MarketUpdateAddresses.MarketUpdateAddressesStruct memory addresses) public returns (uint256) {
        address cometProxyAdminOldAddress = addresses.cometProxyAdminAddress;
        address configuratorProxyAddress = addresses.configuratorProxyAddress;
        address cometProxyAddress = addresses.markets[0].cometProxyAddress;
        address configuratorNewAddress = addresses.configuratorImplementationAddress;
        address cometProxyAdminNewAddress = addresses.cometProxyAdminAddress;
        address marketAdminPermissionCheckerAddress = addresses.marketAdminPermissionCheckerAddress;
        address marketUpdateTimelockAddress = addresses.marketUpdateTimelockAddress;
        address marketUpdateProposerAddress = addresses.marketAdminProposerAddress;

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
        calldatas[1] = abi.encode(cometProxyAddress, cometProxyAdminNewAddress);

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

        vm.prank(0x0579A616689f7ed748dC07692A3F150D44b0CA09);
        uint256 proposalId = governorBravo.propose(targets, values, signatures, calldatas, description);
        
        return proposalId;
    }
}
