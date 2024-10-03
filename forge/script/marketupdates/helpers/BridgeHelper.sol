// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./MarketUpdateAddresses.sol";
import "./ChainAddresses.sol";
import "./GovernanceHelper.sol";
import "@comet-contracts/bridges/BaseBridgeReceiver.sol";
import "@comet-contracts/bridges/arbitrum/ArbitrumBridgeReceiver.sol";
import "@comet-contracts/bridges/optimism/OptimismBridgeReceiver.sol";
import "@comet-contracts/bridges/polygon/PolygonBridgeReceiver.sol";
import "@comet-contracts/bridges/scroll/ScrollBridgeReceiver.sol";
import "@comet-contracts/bridges/arbitrum/AddressAliasHelper.sol";
import "@comet-contracts/ITimelock.sol";


library BridgeHelper {
    address public constant ARBITRUM_BRIDGE = 0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f; // see - deployments/mainnet/usdc/roots.json
    address public constant crossDomainMessenger = 0x4200000000000000000000000000000000000007;
    address public constant fxChild = 0x8397259c983751DAf40400790063935a11afa28a;
    address public constant l2Messenger = 0x781e90f1c8Fc4611c9b7497C3B47F99Ef6969CbC;
    ArbitrumBridgeReceiver constant arbitrumBridgeReceiver = ArbitrumBridgeReceiver(payable(0x42480C37B249e33aABaf4c22B20235656bd38068));
    OptimismBridgeReceiver constant optimismBridgeReceiver = OptimismBridgeReceiver(payable(0xC3a73A70d1577CD5B02da0bA91C0Afc8fA434DAF));
    PolygonBridgeReceiver constant polygonBridgeReceiver = PolygonBridgeReceiver(payable(0x18281dfC4d00905DA1aaA6731414EABa843c468A));
    ScrollBridgeReceiver constant scrollBridgeReceiver = ScrollBridgeReceiver(payable(0xC6bf5A64896D679Cf89843DbeC6c0f5d3C9b610D));

    function simulateMessageToReceiver(
        Vm vm,
        MarketUpdateAddresses.Chain chain,
        address messageSender,
        GovernanceHelper.ProposalRequest memory proposalRequest
    ) external {
        if (chain == MarketUpdateAddresses.Chain.ARBITRUM) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            // Prank the message sender with the L2 equivalent address
            address l2Address = AddressAliasHelper.applyL1ToL2Alias(messageSender);
            vm.prank(l2Address); // Simulate the L2 address
            address(arbitrumBridgeReceiver).call(l2Payload); 
        } else if (chain == MarketUpdateAddresses.Chain.OPTIMISM) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            vm.prank(crossDomainMessenger);
            address(optimismBridgeReceiver).call(l2Payload);
        } else if (chain == MarketUpdateAddresses.Chain.POLYGON) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            vm.prank(fxChild);
            polygonBridgeReceiver.processMessageFromRoot(1, MarketUpdateAddresses.GOVERNOR_BRAVO_TIMELOCK_ADDRESS, l2Payload);
        } else if (chain == MarketUpdateAddresses.Chain.SCROLL) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            vm.prank(l2Messenger);
            address(scrollBridgeReceiver).call(l2Payload);
        } else if (chain == MarketUpdateAddresses.Chain.BASE) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            vm.prank(crossDomainMessenger);
            address(optimismBridgeReceiver).call(l2Payload);
        }
    }

    function advanceTimestampAndExecutePropsal(Vm vm, MarketUpdateAddresses.Chain chain) external {
        if(chain == MarketUpdateAddresses.Chain.ARBITRUM) {
            uint delay = ITimelock(ChainAddressesLib.ARBITRUM_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = arbitrumBridgeReceiver.proposalCount();

            arbitrumBridgeReceiver.executeProposal(proposalId);
        } else if (chain == MarketUpdateAddresses.Chain.OPTIMISM) {
            uint delay = ITimelock(ChainAddressesLib.OPTIMISM_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = optimismBridgeReceiver.proposalCount();

            optimismBridgeReceiver.executeProposal(proposalId);
        } else if (chain == MarketUpdateAddresses.Chain.POLYGON) {
            uint delay = ITimelock(ChainAddressesLib.POLYGON_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = polygonBridgeReceiver.proposalCount();

            polygonBridgeReceiver.executeProposal(proposalId);
        } else if (chain == MarketUpdateAddresses.Chain.SCROLL) {
            uint delay = ITimelock(ChainAddressesLib.SCROLL_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = scrollBridgeReceiver.proposalCount();

            scrollBridgeReceiver.executeProposal(proposalId);
        } else if (chain == MarketUpdateAddresses.Chain.BASE) {
            uint delay = ITimelock(ChainAddressesLib.BASE_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = optimismBridgeReceiver.proposalCount();

            optimismBridgeReceiver.executeProposal(proposalId);
        } 
    }
}
