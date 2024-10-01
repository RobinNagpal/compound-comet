pragma solidity 0.8.15;

import {Test} from "forge-std/Test.sol";

import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "../script/marketupdates/helpers/MarketUpdateAddresses.sol";
import "../script/marketupdates/helpers/MarketUpdateContractsDeployer.sol";
import "../script/marketupdates/helpers/MarketAdminDeploymentProposer.sol";

contract ProposalTest is Test {
    // the identifiers of the forks
    uint256 public mainnetFork;

    string public MAINNET_RPC_URL = vm.envString("MAINNET_RPC_URL");

    // Cast the proxy address to the GovernorBravoDelegate interface
    IGovernorBravo public governorBravo = IGovernorBravo(MarketUpdateAddresses.GOVERNOR_BRAVO_PROXY_ADDRESS);

    // create fork during setup
    function setUp() public {
        mainnetFork = vm.createSelectFork("mainnet");

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
    }

    // creates a new contract while a fork is active
    function test_createAndExecuteProposal() public {

        address proposalCreator = GovernanceHelper.getTopDelegates()[0];



        MarketUpdateAddresses.MarketUpdateAddressesStruct memory addresses = MarketUpdateAddresses.getEthereum();
        uint256 proposalId = MarketAdminDeploymentProposer.createDeploymentProposal(vm, addresses, proposalCreator);



        GovernanceHelper.moveProposalToActive(vm, proposalId);

        GovernanceHelper.voteOnProposal(vm, proposalId, proposalCreator);



        GovernanceHelper.moveProposalToSucceed(vm, proposalId);

        governorBravo.queue(proposalId);

        GovernanceHelper.moveProposalToExecution(vm, proposalId);

        console.log("proposal state after execution: ", uint(governorBravo.state(proposalId)));
    }
}
