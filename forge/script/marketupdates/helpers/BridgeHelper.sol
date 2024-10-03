// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./MarketUpdateAddresses.sol";
import "./GovernanceHelper.sol";
import "@comet-contracts/bridges/BaseBridgeReceiver.sol";
import "@comet-contracts/bridges/arbitrum/ArbitrumBridgeReceiver.sol";


library BridgeHelper {
    address public constant ARBITRUM_BRIDGE = 0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f; // see - deployments/mainnet/usdc/roots.json


    function simulateMessageToReceiver(
        Vm vm,
        MarketUpdateAddresses.Chain chain,
        address messageSender,
        GovernanceHelper.ProposalRequest memory proposalRequest
    ) external {
        bytes memory l2Payload = abi.encode(proposalRequest.targets, proposalRequest.values, proposalRequest.signatures, proposalRequest.calldatas);
        ArbitrumBridgeReceiver bridgeReceiver = ArbitrumBridgeReceiver(0x42480C37B249e33aABaf4c22B20235656bd38068);

        address bridgeReceiverAddress = 0x42480C37B249e33aABaf4c22B20235656bd38068;
        bridgeReceiverAddress.call(abi.encodeWithSignature("someMethod(bytes)", l2Payload)); // So that fallback is called
        bridgeReceiverAddress.call(abi.encodeWithSignature("", l2Payload)); // So that fallback is called

        // Address of the bridge receiver contract
        address bridgeReceiverAddress = 0x42480C37B249e33aABaf4c22B20235656bd38068;
        // bridgeReceiver.processMessage(messageSender, l2Payload); // This will be calling timelock
        vm.prank(messageSender);

        (bool success, ) = payable(0x42480C37B249e33aABaf4c22B20235656bd38068).call(abi.encodePacked(l2Payload));
        console.log("is successful: ", success);
    }
}
