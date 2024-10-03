// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./MarketUpdateAddresses.sol";
import "./GovernanceHelper.sol";
import "@comet-contracts/bridges/BaseBridgeReceiver.sol";


library BridgeHelper {
    address public constant ARBITRUM_BRIDGE = 0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f; // see - deployments/mainnet/usdc/roots.json


    function simulateMessageToReceiver(
        MarketUpdateAddresses.Chain chain,
        address messageSender,
        GovernanceHelper.ProposalRequest memory proposalRequest
    ) external {
        bytes l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);
        BaseBridgeReceiver bridgeReceiver = BaseBridgeReceiver(0x42480C37B249e33aABaf4c22B20235656bd38068);
        bridgeReceiver.processMessage(messageSender, l2Payload); // This will be calling timelock
    }
}
