// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./MarketUpdateAddresses.sol";
import "./ChainAddresses.sol";
import "./GovernanceHelper.sol";
import "@comet-contracts/bridges/BaseBridgeReceiver.sol";
import "@comet-contracts/bridges/arbitrum/ArbitrumBridgeReceiver.sol";
import "@comet-contracts/bridges/optimism/OptimismBridgeReceiver.sol";
import "@comet-contracts/bridges/optimism/IOvmL2CrossDomainMessengerInterface.sol";
import "@comet-contracts/bridges/polygon/PolygonBridgeReceiver.sol";
import "@comet-contracts/bridges/scroll/ScrollBridgeReceiver.sol";
import "@comet-contracts/bridges/scroll/IScrollMessenger.sol";
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
    BaseBridgeReceiver constant baseBridgeReceiver = BaseBridgeReceiver(payable(0x18281dfC4d00905DA1aaA6731414EABa843c468A));

    function simulateMessageToReceiver(
        Vm vm,
        ChainAddresses.Chain chain,
        address messageSender,
        GovernanceHelper.ProposalRequest memory proposalRequest
    ) external {
        if (chain == ChainAddresses.Chain.ARBITRUM) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            // Prank the message sender with the L2 equivalent address
            address l2Address = AddressAliasHelper.applyL1ToL2Alias(messageSender);
            vm.prank(l2Address); // Simulate the L2 address
            address(arbitrumBridgeReceiver).call(l2Payload); 
        } else if (chain == ChainAddresses.Chain.OPTIMISM) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            vm.prank(crossDomainMessenger);
            address crossDomainMessenger = 0xC0d3c0d3c0D3c0D3C0d3C0D3C0D3c0d3c0d30007;

            // Mock - address messageSender = IOvmL2CrossDomainMessengerInterface(msg.sender).xDomainMessageSender();
            vm.mockCall(
                crossDomainMessenger,
                abi.encodeWithSelector(IOvmL2CrossDomainMessengerInterface.xDomainMessageSender.selector),
                abi.encode(messageSender)
            );
            address(optimismBridgeReceiver).call(l2Payload);
        } else if (chain == ChainAddresses.Chain.POLYGON) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            vm.prank(fxChild);
            polygonBridgeReceiver.processMessageFromRoot(1, MarketUpdateAddresses.GOVERNOR_BRAVO_TIMELOCK_ADDRESS, l2Payload);
        } else if (chain == ChainAddresses.Chain.SCROLL) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            address l2Messenger = 0x781e90f1c8Fc4611c9b7497C3B47F99Ef6969CbC;
            vm.prank(l2Messenger);

            // Mock - address messageSender = IScrollMessenger(msg.sender).xDomainMessageSender();
            vm.mockCall(
                l2Messenger,
                abi.encodeWithSelector(IScrollMessenger.xDomainMessageSender.selector),
                abi.encode(messageSender)
            );

        address(scrollBridgeReceiver).call(l2Payload);
        } else if (chain == ChainAddresses.Chain.BASE) {
            bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

            vm.prank(crossDomainMessenger);
            address crossDomainMessenger = 0xC0d3c0d3c0D3c0D3C0d3C0D3C0D3c0d3c0d30007;

            // Mock - address messageSender = IOvmL2CrossDomainMessengerInterface(msg.sender).xDomainMessageSender();
            vm.mockCall(
                crossDomainMessenger,
                abi.encodeWithSelector(IOvmL2CrossDomainMessengerInterface.xDomainMessageSender.selector),
                abi.encode(messageSender)
            );

            address(baseBridgeReceiver).call(l2Payload);
        }
    }

    function advanceTimestampAndExecutePropsal(Vm vm, ChainAddresses.Chain chain) external {
        if(chain == ChainAddresses.Chain.ARBITRUM) {
            uint delay = ITimelock(ChainAddresses.ARBITRUM_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = arbitrumBridgeReceiver.proposalCount();

            arbitrumBridgeReceiver.executeProposal(proposalId);
        } else if (chain == ChainAddresses.Chain.OPTIMISM) {
            uint delay = ITimelock(ChainAddresses.OPTIMISM_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = optimismBridgeReceiver.proposalCount();

            optimismBridgeReceiver.executeProposal(proposalId);
        } else if (chain == ChainAddresses.Chain.POLYGON) {
            uint delay = ITimelock(ChainAddresses.POLYGON_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = polygonBridgeReceiver.proposalCount();

            polygonBridgeReceiver.executeProposal(proposalId);
        } else if (chain == ChainAddresses.Chain.SCROLL) {
            uint delay = ITimelock(ChainAddresses.SCROLL_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = scrollBridgeReceiver.proposalCount();

            scrollBridgeReceiver.executeProposal(proposalId);
        } else if (chain == ChainAddresses.Chain.BASE) {
            uint delay = ITimelock(ChainAddresses.BASE_LOCAL_TIMELOCK).delay();
            vm.warp(block.timestamp + delay + 10);

            uint256 proposalId = baseBridgeReceiver.proposalCount();

            baseBridgeReceiver.executeProposal(proposalId);
        } 
    }
}
