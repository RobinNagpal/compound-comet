// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";
import "../../contracts/IGovernorBravo.sol";
import "../../contracts/IComp.sol";
import "../../contracts/marketupdates/CometProxyAdminOld.sol";
import "./helperContracts/DeployedContracts.sol";

contract GovernorProposal is Script, DeployedAddresses {

    // COMP token address
    address compTokenAddress = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    IComp compToken = IComp(compTokenAddress);

    function run() external {
        // Define the address of the Governor Bravo Proxy
        address governorBravoProxyAddress = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;

        // Cast the proxy address to the GovernorBravoDelegate interface
        IGovernorBravo governorBravo = IGovernorBravo(governorBravoProxyAddress);

        // Newly deployed contracts
        address marketUpdateTimelockAddress = computedMarketUpdateTimelockAddress;
        address marketUpdateProposerAddress = computedMarketUpdateProposerAddress;
        address configuratorNewAddress = computedConfiguratorAddress;
        address cometProxyAdminNewAddress = computedCometProxyAdminAddress;
        address marketAdminPermissionCheckerAddress = computedMarketAdminPermissionCheckerAddress;


        // Old contracts
        address cometProxyAdminOldAddress = 0x1EC63B5883C3481134FD50D5DAebc83Ecd2E8779;
        address configuratorProxyContractAddress = 0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3;
        address cometProxyAddress = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;

        address[] memory targets = new address[](7);
        uint256[] memory values = new uint256[](7);
        string[] memory signatures = new string[](7);
        bytes[] memory calldatas = new bytes[](7);
        string memory description = "Proposal to trigger updates for market admin";

        targets[0] = cometProxyAdminOldAddress;
        signatures[0] = "changeProxyAdmin(address,address)";
        calldatas[0] = abi.encode(configuratorProxyContractAddress, cometProxyAdminNewAddress);

        targets[1] = cometProxyAdminOldAddress;
        signatures[1] = "changeProxyAdmin(address,address)";
        calldatas[1] = abi.encode(cometProxyAddress, cometProxyAdminNewAddress);

        targets[2] = cometProxyAdminNewAddress;
        signatures[2] = "upgrade(address,address)";
        calldatas[2] = abi.encode(configuratorProxyContractAddress, configuratorNewAddress);

        targets[3] = marketAdminPermissionCheckerAddress;
        signatures[3] = "setMarketAdmin(address)";
        calldatas[3] = abi.encode(marketUpdateTimelockAddress);

        targets[4] = configuratorProxyContractAddress;
        signatures[4] = "setMarketAdminPermissionChecker(address)";
        calldatas[4] = abi.encode(marketAdminPermissionCheckerAddress);

        targets[5] = cometProxyAdminNewAddress;
        signatures[5] = "setMarketAdminPermissionChecker(address)";
        calldatas[5] = abi.encode(marketAdminPermissionCheckerAddress);

        targets[6] = marketUpdateTimelockAddress;
        signatures[6] = "setMarketUpdateProposer(address)";
        calldatas[6] = abi.encode(marketUpdateProposerAddress);

        // Set up the values (all zeros in this case)
        for (uint256 i = 0; i < 7; i++) {
            values[i] = 0;
        }

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

        // Fund the accounts with ETH to cover gas fees
        for (uint i = 0; i < voters.length; i++) {
            vm.deal(voters[i], 100 ether);
        }

        // Start the broadcasting of transactions
        vm.startBroadcast(voters[0]);

        // Call the propose function via the proxy (delegation to the implementation contract)
        uint proposalId = governorBravo.propose(targets, values, signatures, calldatas, description);

        (
            uint id,
            address proposer,
            uint eta,
            uint startBlock,
            uint endBlock,
            uint forVotes,
            uint againstVotes,
            uint abstainVotes,
            bool canceled,
            bool executed
        ) = governorBravo.proposals(proposalId);

        console.log("proposal id: ", id);

        console.log("proposal start block: ", startBlock);
        console.log("proposal end block: ", endBlock);

        uint votingDelay = governorBravo.votingDelay();
        uint votingPeriod = governorBravo.votingPeriod();

        console.log("proposal state: ", uint(governorBravo.state(proposalId)));
        require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Pending, "Proposal is not pending");

        // Fast forward by voting delay
        console.log("block number: ", block.number);
        console.log("voting delay: ", votingDelay);
        vm.roll(block.number + votingDelay + 7146);


        vm.stopBroadcast(); // Stop broadcasting for the previous voter
        console.log("block number after voting delay: ", block.number);
        console.log("proposal state: ", uint(governorBravo.state(proposalId)));
        require(governorBravo.state(proposalId) == IGovernorBravo.ProposalState.Active, "Proposal is not active");

        console.log("block number: ", block.number);


        // Assign COMP tokens and delegate votes
        for (uint i = 0; i < voters.length; i++) {
            address voter = voters[i];

            // Assign COMP tokens
            uint256 amount = 1_000_000e18; // Assign 1 million COMP tokens
            setCompBalance(voter, amount);

            // Delegate votes to self
            vm.startPrank(voter);
            compToken.delegate(voter);
            vm.stopPrank();
        }

        // Cast votes from multiple accounts
        for (uint i = 0; i < voters.length; i++) {
            vm.startBroadcast(voters[i]); // Start broadcasting for the next voter
            // Optional: Print block number and proposal state
            console.log("Block number during voting: ", block.number);
            console.log("Proposal state during voting: ", uint(governorBravo.state(proposalId)));
            governorBravo.castVote(proposalId, 1); // 1 = "For" vote

            vm.stopBroadcast(); // Stop broadcasting for this voter
        }

        // Fast forward by voting period
        vm.roll(block.number + votingPeriod + 1);

        vm.startBroadcast(voters[0]);

        governorBravo.queue(proposalId);

        console.log("block number after voting period has passed: ", block.number);

        // Fast forward time by the timelock delay (172800 seconds or 2 days)
        uint timelockDelay = 172800;
        vm.warp(block.timestamp + timelockDelay + 1); // Advance time past the timelock delay

        governorBravo.execute(proposalId);

        console.log("proposal state after execution: ", uint(governorBravo.state(proposalId)));

        vm.stopBroadcast();
    }

    // Helper function to set COMP balance using vm.store
    function setCompBalance(address account, uint256 amount) internal {
        // Calculate the storage slot for balances[account]
        // The balances mapping is at storage slot 0 in the COMP contract
        bytes32 slot = keccak256(abi.encode(account, uint256(0)));
        vm.store(compTokenAddress, slot, bytes32(amount));
    }

}
