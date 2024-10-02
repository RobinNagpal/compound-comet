pragma solidity 0.8.15;

import {Test} from "forge-std/Test.sol";
import "@comet-contracts/Comet.sol";
import "@comet-contracts/marketupdates/MarketUpdateProposer.sol";

import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "../script/marketupdates/helpers/MarketUpdateAddresses.sol";
import "../script/marketupdates/helpers/MarketUpdateContractsDeployer.sol";
import "../script/marketupdates/helpers/MarketAdminDeploymentProposer.sol";
import "../script/marketupdates/helpers/ChainAddresses.sol";
import "../script/marketupdates/helpers/MarketAddresses.sol";
import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "./MarketUpdateDeploymentBaseTest.sol";

contract MarketUpdateMainnetDeploymentTest is Test, MarketUpdateDeploymentBaseTest {


    function setUp() public {
        vm.createSelectFork("mainnet");
        createMarketUpdateDeployment(vm, MarketUpdateAddresses.Chain.ETHEREUM);
    }

    function test_UsdcDeployment() public {
        console.log("Create Supply Kink Proposal for USDC Market and verify after execution");

        // check the initial Kink value
        // create and pass governor bravo set supply kink proposal
        // verify the kink value after execution

        // set new value using market admin
        // verify the kink value after execution
    }

    function test_UsdtDeployment() public {
        console.log("Create Supply Kink Proposal for USDT Market and verify after execution");
    }

    function test_EthDeployment() public {
        console.log("Create Supply Kink Proposal for ETH Market and verify after execution");

        address cometProxyAdminNew = 0xDA831B5dd899a5b2bB89b4ccC45599DeBd0c82c9;
        address configuratorProxy = ChainAddressesLib.MAINNET_CONFIGURATOR_PROXY;
        address cometProxy = MarketAddresses.MAINNET_ETH_MARKET;

        uint256 oldSupplyKink = Comet(payable(cometProxy)).supplyKink();
        console.log("Old Supply Kink: ", oldSupplyKink);

        uint256 newSupplyKinkByGovernorTimelock = 300000000000000000;

        address[] memory targets = new address[](2);
        uint256[] memory values = new uint256[](2);
        string[] memory signatures = new string[](2);
        bytes[] memory calldatas = new bytes[](2);
        string memory description = "Proposal to update Supply Kink for ETH Market";

        targets[0] = configuratorProxy;
        signatures[0] = "setSupplyKink(address,uint64)";
        calldatas[0] = abi.encode(cometProxy, newSupplyKinkByGovernorTimelock);

        targets[1] = cometProxyAdminNew;
        signatures[1] = "deployAndUpgradeTo(address,address)";
        calldatas[1] = abi.encode(configuratorProxy, cometProxy);

        GovernanceHelper.ProposalRequest memory proposalRequest = GovernanceHelper.ProposalRequest({
            targets: targets,
            values: values,
            signatures: signatures,
            calldatas: calldatas
        });

        GovernanceHelper.createProposalAndPass(vm, proposalRequest, description);

        // check the new kink value
        uint256 newSupplyKinkAfterGovernorUpdate = Comet(payable(cometProxy)).supplyKink();
        require(newSupplyKinkAfterGovernorUpdate == newSupplyKinkByGovernorTimelock, "Supply Kink not updated");

        // Setting new Supply Kink using Market Admin
        uint256 newSupplyKinkByMarketAdmin = 400000000000000000;

        calldatas[0] = abi.encode(cometProxy, newSupplyKinkByMarketAdmin);
        address marketUpdateProposer = 0x4c3B63642bC627735c0BFaB7332b96f3a2B0d476;
        vm.startPrank(MarketUpdateAddresses.MARKET_UPDATE_MULTISIG_ADDRESS);
        MarketUpdateProposer(marketUpdateProposer).propose(targets, values, signatures, calldatas, description);

        // Fast forward by 5 days
        vm.warp(block.timestamp + 5 days);

        MarketUpdateProposer(marketUpdateProposer).execute(1);
        uint256 newSupplyKinkAfterMarketAdminUpdate = Comet(payable(cometProxy)).supplyKink();
        require(newSupplyKinkAfterMarketAdminUpdate == newSupplyKinkByMarketAdmin, "Supply Kink not updated by Market Admin");

    }

    function test_WstEthDeployment() public {
        console.log("Create Supply Kink Proposal for WST_ETH Market and verify after execution");
    }
}
