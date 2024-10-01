// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@forge-std/src/Vm.sol";
import "@forge-std/src/console.sol";
import "@comet-contracts/IGovernorBravo.sol";
import "@comet-contracts/IComp.sol";


library GovernanceHelper {
    uint constant public BLOCKS_PER_DAY = 7168;

    address constant governorBravoProxyAddress = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;
    IGovernorBravo constant governorBravo = IGovernorBravo(governorBravoProxyAddress);

    // COMP token address
    address constant compTokenAddress = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    IComp constant compToken = IComp(compTokenAddress);

    function moveProposalToActive(Vm vm, uint proposalId) public {
        require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Pending, "Proposal is not Pending");
        require(governorBravo.proposals(proposalId).eta == 0, "Proposal has already been queued");

        // Add a check to see the current state is pending
        uint votingDelay = governorBravo.votingDelay();

        vm.roll(block.number + votingDelay + 7146);

        require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Active, "Proposal is not Active");


    }

    function moveProposalToSucceed(Vm vm, uint proposalId) public {
        require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Active, "Proposal is not Active");


        require(governorBravo.proposals(proposalId).forVotes > governorBravo.quorumVotes(), "Proposal does not have enough votes");
        // Advance to the end of the voting period
        uint256 endBlock = governorBravo.proposals(proposalId).endBlock;
        vm.roll(endBlock + 1);

        require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Succeeded, "Proposal is not Succeeded");
    }

    function moveProposalToExecution(Vm vm, uint proposalId) public {
        uint proposalEta = governorBravo.proposals(proposalId).eta;
        require(proposalEta != 0, "Proposal has not been queued");

        vm.warp(proposalEta + 2 days);

        require(block.timestamp >= proposalEta, "Time has not passed for proposal to be executed");
        governorBravo.execute(proposalId);
        require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Executed, "Proposal is not Executed");

    }

    function voteOnProposal(Vm vm, uint256 proposalId, address proposalCreator) public {
        address[12] memory voters = getTopDelegates();

        // Cast votes from multiple accounts
        for (uint i = 0; i < voters.length; i++) {
            if (voters[i] == proposalCreator) continue; // Skip zero address
            console.log("Voting with account: ", voters[i]);
            vm.startBroadcast(voters[i]);
            console.log("Proposal state during voting: ", uint(governorBravo.state(proposalId)));
            governorBravo.castVoteWithReason(proposalId, 1, "yes"); // 1 = "For" vote
            vm.stopBroadcast();
            console.log("Done voting with account: ", voters[i]);
        }
    }

    function getTopDelegates() public pure returns (address[12] memory) {
        return [
            0x0579A616689f7ed748dC07692A3F150D44b0CA09,
            0x9AA835Bc7b8cE13B9B0C9764A52FbF71AC62cCF1,
            0x7E959eAB54932f5cFd10239160a7fd6474171318,
            0x2210dc066aacB03C9676C4F1b36084Af14cCd02E,
            0x88F659b4B6D5614B991c6404b34f821e10390eC0,
            0x070341aA5Ed571f0FB2c4a5641409B1A46b4961b,
            0xdC1F98682F4F8a5c6d54F345F448437b83f5E432,
            0xB933AEe47C438f22DE0747D57fc239FE37878Dd1,
            0x2817Cb83c96a091E833A9A93E02D5464034e24f1,
            0x21b3B193B71680E2fAfe40768C03a0Fd305EFa75,
            0xE364E90d0A5289bF462A5c9f6e1CcAE680215413,
            0x3FB19771947072629C8EEE7995a2eF23B72d4C8A
            ];
    }
}
