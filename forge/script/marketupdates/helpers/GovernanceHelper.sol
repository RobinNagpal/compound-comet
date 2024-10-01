// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@forge-std/src/Vm.sol";
import "@forge-std/src/console.sol";
import "@comet-contracts/IGovernorBravo.sol";
import "@comet-contracts/IComp.sol";


library GovernanceHelper {
    address constant governorBravoProxyAddress = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;
    IGovernorBravo constant governorBravo = IGovernorBravo(governorBravoProxyAddress);

    // COMP token address
    address constant compTokenAddress = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    IComp constant compToken = IComp(compTokenAddress);

    function moveProposalToActive(Vm vm, uint proposalId) public {

       if (governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Pending) {
           // Add a check to see the current state is pending
           uint votingDelay = governorBravo.votingDelay();

           vm.roll(block.number + votingDelay + 7146);

           require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Active, "Proposal is not Active");

       } else { revert("Invalid proposal state"); }
    }

    function moveProposalToSucceed(Vm vm, uint proposalId) public {
        if (governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Active) {
           uint votingPeriod = governorBravo.votingPeriod();

           // Fast forward by voting period
           vm.roll(block.number + votingPeriod + 1);

            require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Succeeded, "Proposal is not Succeeded");
        }

        revert("Invalid proposal state");
    }

    function moveProposalToExecution(Vm vm, uint proposalId) public {
        if (governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Succeeded) {
           uint votingPeriod = governorBravo.votingPeriod();

           // Fast forward time by the timelock delay (172800 seconds or 2 days)
            uint timelockDelay = 172800;
            vm.warp(block.timestamp + timelockDelay + 1); // Advance time past the timelock delay

            require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Queued, "Proposal is not Queued");
        }

        revert("Invalid proposal state");
    }

    function voteOnProposal(Vm vm, uint256 proposalId) public {
        address[] memory voters = new address[](12);
        voters[0] = 0x0579A616689f7ed748dC07692A3F150D44b0CA09; // Impersonate account 1
        voters[1] = 0xD8deA87ddcC0c3C1464Ded6102e4D3E829d0aE41; // Impersonate account 2
        voters[2] = 0x2210dc066aacB03C9676C4F1b36084Af14cCd02E; // Impersonate account 3
        voters[3] = 0x88F659b4B6D5614B991c6404b34f821e10390eC0; // Impersonate account 4
        voters[4] = 0x070341aA5Ed571f0FB2c4a5641409B1A46b4961b; // Impersonate account 5
        voters[5] = 0xdC1F98682F4F8a5c6d54F345F448437b83f5E432; // Impersonate account 6
        voters[6] = 0xB933AEe47C438f22DE0747D57fc239FE37878Dd1; // Impersonate account 7
        voters[7] = 0x2817Cb83c96a091E833A9A93E02D5464034e24f1; // Impersonate account 8
        voters[8] = 0x21b3B193B71680E2fAfe40768C03a0Fd305EFa75; // Impersonate account 9
        voters[9] = 0xE364E90d0A5289bF462A5c9f6e1CcAE680215413; // Impersonate account 10
        voters[10] = 0x3FB19771947072629C8EEE7995a2eF23B72d4C8A; // Impersonate account 11
        voters[11] = 0xd2A79F263eC55DBC7B724eCc20FC7448D4795a0C; // Impersonate account 12

        // Assign COMP tokens and delegate votes
        for (uint i = 0; i < voters.length; i++) {
            address voter = voters[i];

            // Assign COMP tokens
            uint256 amount = 1_000_000e18; // Assign 1 million COMP tokens
            setCompBalance(vm, voter, amount);

            // Delegate votes to self
            vm.startPrank(voter);
            compToken.delegate(voter);
            vm.stopPrank();
        }


        // Cast votes from multiple accounts
        for (uint i = 0; i < voters.length; i++) {
            console.log("Proposal state during voting: ", uint(governorBravo.state(proposalId)));
            vm.prank(voters[i]); // Start broadcasting for the next voter
            governorBravo.castVote(proposalId, 1); // 1 = "For" vote
        }
    }

    // Helper function to set COMP balance using vm.store
    function setCompBalance(Vm vm, address account, uint256 amount) internal {
        // Calculate the storage slot for balances[account]
        // The balances mapping is at storage slot 0 in the COMP contract
        bytes32 slot = keccak256(abi.encode(account, uint256(0)));
        vm.store(compTokenAddress, slot, bytes32(amount));
    }
}
