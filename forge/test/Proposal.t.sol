pragma solidity 0.8.15;

import {Test} from "forge-std/Test.sol";

import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "../script/marketupdates/helpers/MarketUpdateAddresses.sol";
import "../script/marketupdates/helpers/MarketUpdateContractsDeployer.sol";
import "../script/marketupdates/helpers/MarketAdminDeploymentProposer.sol";

contract ProposalTest is Test {
    // the identifiers of the forks
    uint256 mainnetFork;

    string MAINNET_RPC_URL = vm.envString("MAINNET_RPC_URL");
    address timelock = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;

    // create fork during setup
    function setUp() public {
        mainnetFork = vm.createSelectFork(MAINNET_RPC_URL);

        bytes32 salt = keccak256(abi.encodePacked("Salt-31")); 

        /// Call library function
        MarketUpdateContractsDeployer.DeployedContracts memory deployedContracts = MarketUpdateContractsDeployer.deployContracts(
            salt,
            MarketUpdateAddresses.MARKET_UPDATE_MULTISIG_ADDRESS,
            MarketUpdateAddresses.MARKET_ADMIN_PAUSE_GUARDIAN_ADDRESS,
            MarketUpdateAddresses.MARKET_UPDATE_PROPOSAL_GUARDIAN_ADDRESS,
            timelock
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

        // Define the address of the Governor Bravo Proxy
        address governorBravoProxyAddress = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;

        // Cast the proxy address to the GovernorBravoDelegate interface
        IGovernorBravo governorBravo = IGovernorBravo(governorBravoProxyAddress);
        

        MarketUpdateAddresses.MarketUpdateAddressesStruct memory addresses = MarketUpdateAddresses.getEthereum();
        uint256 proposalId = MarketAdminDeploymentProposer.createDeploymentProposal(vm, addresses);

        GovernanceHelper.moveProposalToActive(vm, proposalId);

        GovernanceHelper.voteOnProposal(vm, proposalId);

        GovernanceHelper.moveProposalToSucceed(vm, proposalId);

        governorBravo.queue(proposalId);

        GovernanceHelper.moveProposalToExecution(vm, proposalId);
       
        governorBravo.execute(proposalId);

        console.log("proposal state after execution: ", uint(governorBravo.state(proposalId)));
    }
}