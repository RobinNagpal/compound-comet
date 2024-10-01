pragma solidity 0.8.15;

import {Test} from "forge-std/Test.sol";

import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "../script/marketupdates/helpers/MarketUpdateAddresses.sol";
import "../script/marketupdates/helpers/MarketUpdateContractsDeployer.sol";
import "../script/marketupdates/helpers/MarketAdminDeploymentProposer.sol";
import "./MarketUpdateDeploymentBaseTest.sol";

contract MarketUpdateMainnetDeploymentTest is Test, MarketUpdateDeploymentBaseTest {


    function setUp() public {
        vm.createSelectFork("mainnet");
        createMarketUpdateDeployment(vm, MarketUpdateAddresses.Chain.ETHEREUM);
    }

    function test_UsdcDeployment() public {
        console.log("Create Supply Kink Proposal for USDC Market and verify after execution");
    }

    function test_UsdtDeployment() public {
        console.log("Create Supply Kink Proposal for USDT Market and verify after execution");
    }

    function test_EthDeployment() public {
        console.log("Create Supply Kink Proposal for ETH Market and verify after execution");
    }

    function test_WstEthDeployment() public {
        console.log("Create Supply Kink Proposal for WST_ETH Market and verify after execution");
    }
}
