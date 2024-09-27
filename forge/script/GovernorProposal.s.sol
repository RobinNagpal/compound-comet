// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/forge-std/src/Script.sol";
import "../lib/forge-std/src/console.sol";
import "./helperContracts/GovernorBravoDelegate.sol";
import "./helperContracts/Comp.sol";
import "../../contracts/marketupdates/CometProxyAdminOld.sol";

contract GovernorProposal is Script {

    function run() external {
        // Define the address of the Governor Bravo Proxy
        address governorBravoProxyAddress = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;

        // Cast the proxy address to the GovernorBravoDelegate interface
        GovernorBravoDelegate governorBravo = GovernorBravoDelegate(governorBravoProxyAddress);

        // Newly deployed contracts
        address marketUpdateTimelockAddress = 0x1ECfD7737728C95d9D8823a665d3Acd6189d159D;
        address marketUpdateProposerAddress = 0x91605FB5098Ff3d973b0e592ED5Ba6d11abc0637;
        address configuratorNewAddress = 0xdc2dbA66649721fa632E2b668305371d2f05210F;
        address cometProxyAdminNewAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
        address marketAdminPermissionCheckerAddress = 0x3df3468b80CD5258a69E8F0AbC36321582e53134;


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

        // Fast forward by voting delay
        console.log("block number: ", block.number);
        console.log("voting delay: ", votingDelay);
        vm.roll(block.number + votingDelay + 10);

        // advanceBlocks(votingDelay + 1);

        console.log("proposal state: ", uint(governorBravo.state(proposalId)));
        console.log("block number: ", block.number);

        vm.stopBroadcast(); // Stop broadcasting for the previous voter

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

        vm.stopBroadcast();
    }

    // Instead of vm.roll, use evm_mine to advance blocks
    function advanceBlocks(uint256 numberOfBlocks) internal {
//        for (uint256 i = 0; i < numberOfBlocks; i++) {
//            vm.rpc("evm_mine", "[]");
//        }
    }

    // // Instead of vm.warp, use evm_increaseTime
    // function increaseTime(uint256 sec) internal {
    //     vm.rpc("evm_increaseTime", abi.encode(sec));
    //     vm.rpc("evm_mine", "");
    // }

}
