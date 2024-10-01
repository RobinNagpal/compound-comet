// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@forge-std/src/Vm.sol";
import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "../script/marketupdates/helpers/MarketUpdateAddresses.sol";
import "../script/marketupdates/helpers/MarketUpdateContractsDeployer.sol";
import "../script/marketupdates/helpers/MarketAdminDeploymentProposer.sol";

abstract contract MarketUpdateDeploymentBaseTest {

    IGovernorBravo public governorBravo = IGovernorBravo(MarketUpdateAddresses.GOVERNOR_BRAVO_PROXY_ADDRESS);

    function createMarketUpdateDeployment(Vm vm, MarketUpdateAddresses.Chain chain) public {
        bytes32 salt = keccak256(abi.encodePacked("Salt-31"));

        /// Call library function
        MarketUpdateContractsDeployer.DeployedContracts memory deployedContracts = MarketUpdateContractsDeployer.deployContracts(
            salt,
            MarketUpdateAddresses.MARKET_UPDATE_MULTISIG_ADDRESS,
            MarketUpdateAddresses.MARKET_ADMIN_PAUSE_GUARDIAN_ADDRESS,
            MarketUpdateAddresses.MARKET_UPDATE_PROPOSAL_GUARDIAN_ADDRESS,
            MarketUpdateAddresses.GOVERNOR_BRAVO_TIMELOCK_ADDRESS
        );

        /// Console log deployed contracts
        console.log("MarketUpdateTimelock: ", deployedContracts.marketUpdateTimelock);
        console.log("MarketUpdateProposer: ", deployedContracts.marketUpdateProposer);
        console.log("NewConfiguratorImplementation: ", deployedContracts.newConfiguratorImplementation);
        console.log("NewCometProxyAdmin: ", deployedContracts.newCometProxyAdmin);
        console.log("MarketAdminPermissionChecker: ", deployedContracts.marketAdminPermissionChecker);


        address proposalCreator = GovernanceHelper.getTopDelegates()[0];

        MarketUpdateAddresses.MarketUpdateAddressesStruct memory addresses = MarketUpdateAddresses.getAddressesForChain(
            MarketUpdateAddresses.Chain.ETHEREUM,
            deployedContracts,
            MarketUpdateAddresses.MARKET_UPDATE_MULTISIG_ADDRESS
        );

        uint256 proposalId = MarketAdminDeploymentProposer.createDeploymentProposal(vm, addresses, proposalCreator);

        GovernanceHelper.moveProposalToActive(vm, proposalId);

        GovernanceHelper.voteOnProposal(vm, proposalId, proposalCreator);

        GovernanceHelper.moveProposalToSucceed(vm, proposalId);

        governorBravo.queue(proposalId);

        GovernanceHelper.moveProposalToExecution(vm, proposalId);

        console.log("proposal state after execution: ", uint(governorBravo.state(proposalId)));
    }

}
