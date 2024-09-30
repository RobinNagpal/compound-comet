// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../lib/forge-std/src/Script.sol";
import "../../lib/forge-std/src/console.sol";
import "../../../contracts/IGovernorBravo.sol";
import "../../../contracts/IComp.sol";
import "../../../contracts/marketupdates/CometProxyAdminOld.sol";
import "./helpers/DeployedAddresses.sol";
import "./helpers/GovernanceHelper.sol";
import "./helpers/MarketUpdateAddresses.sol";

contract GovernorProposal is Script, DeployedAddresses {

    function run() external {
        // Define the address of the Governor Bravo Proxy
        address governorBravoProxyAddress = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;

        // Cast the proxy address to the GovernorBravoDelegate interface
        IGovernorBravo governorBravo = IGovernorBravo(governorBravoProxyAddress);

        // Newly deployed contracts
        address marketUpdateTimelockAddress = MarketUpdateAddresses.computedMarketUpdateTimelockAddress;
        address marketUpdateProposerAddress = MarketUpdateAddresses.computedMarketAdminProposerAddress;
        address configuratorNewAddress = MarketUpdateAddresses.computedConfiguratorImplementationAddress;
        address cometProxyAdminNewAddress = MarketUpdateAddresses.computedNewCometProxyAdminAddress;
        address marketAdminPermissionCheckerAddress = MarketUpdateAddresses.computedMarketAdminPermissionCheckerAddress;


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

        // Start the broadcasting of transactions
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Call the propose function via the proxy (delegation to the implementation contract)
        uint proposalId = governorBravo.propose(targets, values, signatures, calldatas, description);

        GovernanceHelper.moveProposalToActive(vm, proposalId, governorBravo.state(proposalId));

        GovernanceHelper.voteOnProposal(vm, proposalId);

        GovernanceHelper.moveProposalToSucceed(vm, proposalId, governorBravo.state(proposalId));

        governorBravo.queue(proposalId);

        GovernanceHelper.moveProposalToExecution(vm, proposalId, governorBravo.state(proposalId));
       
        governorBravo.execute(proposalId);

        console.log("proposal state after execution: ", uint(governorBravo.state(proposalId)));

        vm.stopBroadcast();
    }
}
