// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./MarketUpdateAddresses.sol";
import "./ChainAddresses.sol";
import "./GovernanceHelper.sol";
import "@comet-contracts/bridges/BaseBridgeReceiver.sol";
import "@comet-contracts/bridges/arbitrum/ArbitrumBridgeReceiver.sol";
import "@comet-contracts/ITimelock.sol";


library BridgeHelper {
    address public constant ARBITRUM_BRIDGE = 0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f; // see - deployments/mainnet/usdc/roots.json
    ArbitrumBridgeReceiver constant bridgeReceiver = ArbitrumBridgeReceiver(payable(0x42480C37B249e33aABaf4c22B20235656bd38068));

    function simulateMessageToReceiver(
        Vm vm,
        MarketUpdateAddresses.Chain chain,
        address messageSender,
        GovernanceHelper.ProposalRequest memory proposalRequest
    ) external {
        bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);

        // Prank the message sender with the L2 equivalent address
        address prankAddress = 0x7EA13f6003CcA6255d85cCA4D3B5e5146dc34a36; // L2 address after applying offset (This is the GovTimelock with offset added)
        vm.prank(prankAddress); // Simulate the L2 address
        address(bridgeReceiver).call(l2Payload); 
    }

    function advanceTimestampAndExecutePropsal(Vm vm) external {
        uint delay = ITimelock(ChainAddressesLib.ARBITRUM_LOCAL_TIMELOCK).delay();
        vm.warp(block.timestamp + delay + 10);

        uint256 proposalId = bridgeReceiver.proposalCount();

        bridgeReceiver.executeProposal(proposalId);
    }
}
