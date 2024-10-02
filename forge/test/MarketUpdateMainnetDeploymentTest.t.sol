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
    address cometProxyAdminNew = 0xDA831B5dd899a5b2bB89b4ccC45599DeBd0c82c9;
    address configuratorProxy = ChainAddressesLib.MAINNET_CONFIGURATOR_PROXY;

    function setUp() public {
        vm.createSelectFork("mainnet");
        createMarketUpdateDeployment(vm, MarketUpdateAddresses.Chain.ETHEREUM);
    }

    function test_UsdcDeployment() public {
        console.log("Create Supply Kink Proposal for USDC Market and verify after execution");

        address cometProxy = MarketAddresses.MAINNET_USDC_MARKET;

        updateAndVerifySupplyKink(cometProxy, "USDC");
    }

    function test_UsdtDeployment() public {
        console.log("Create Supply Kink Proposal for USDT Market and verify after execution");

        address cometProxy = MarketAddresses.MAINNET_USDT_MARKET;

        updateAndVerifySupplyKink(cometProxy, "USDT");
    }

    function test_EthDeployment() public {
        console.log("Create Supply Kink Proposal for ETH Market and verify after execution");

        address cometProxy = MarketAddresses.MAINNET_ETH_MARKET;

        updateAndVerifySupplyKink(cometProxy, "ETH");
    }

    function test_WstEthDeployment() public {
        console.log("Create Supply Kink Proposal for WST_ETH Market and verify after execution");

        address cometProxy = MarketAddresses.MAINNET_WST_ETH_MARKET;

        updateAndVerifySupplyKink(cometProxy, "WST_ETH");
    }

    function updateAndVerifySupplyKink(address cometProxy, string memory marketName) public {
        uint256 oldSupplyKinkBeforeGovernorUpdate = Comet(payable(cometProxy)).supplyKink();
        uint256 newSupplyKinkByGovernorTimelock = 300000000000000000;
        
        assertNotEq(oldSupplyKinkBeforeGovernorUpdate, newSupplyKinkByGovernorTimelock);

        address[] memory targets = new address[](2);
        uint256[] memory values = new uint256[](2);
        string[] memory signatures = new string[](2);
        bytes[] memory calldatas = new bytes[](2);
        string memory description = string(abi.encodePacked("Proposal to update Supply Kink for ", marketName, " Market by Governor Timelock"));

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
        assertEq(newSupplyKinkAfterGovernorUpdate, newSupplyKinkByGovernorTimelock);

        // Setting new Supply Kink using Market Admin
        uint256 oldSupplyKinkBeforeMarketAdminUpdate = Comet(payable(cometProxy)).supplyKink();
        uint256 newSupplyKinkByMarketAdmin = 400000000000000000;

        assertNotEq(oldSupplyKinkBeforeMarketAdminUpdate, newSupplyKinkByMarketAdmin);

        calldatas[0] = abi.encode(cometProxy, newSupplyKinkByMarketAdmin);

        description = string(abi.encodePacked("Proposal to update Supply Kink for ", marketName, " Market by Market Admin"));
        GovernanceHelper.createAndPassMarketUpdateProposal(vm, proposalRequest, description);

        uint256 newSupplyKinkAfterMarketAdminUpdate = Comet(payable(cometProxy)).supplyKink();
        assertEq(newSupplyKinkAfterMarketAdminUpdate, newSupplyKinkByMarketAdmin);
    }
}
