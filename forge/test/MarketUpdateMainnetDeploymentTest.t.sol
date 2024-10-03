pragma solidity 0.8.15;

import {Test} from "forge-std/Test.sol";
import "@comet-contracts/Comet.sol";
import "@comet-contracts/marketupdates/MarketUpdateProposer.sol";

import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "../script/marketupdates/helpers/MarketUpdateAddresses.sol";
import "../script/marketupdates/helpers/MarketUpdateContractsDeployer.sol";
import "../script/marketupdates/helpers/ChainAddresses.sol";
import "../script/marketupdates/helpers/MarketAddresses.sol";
import "../script/marketupdates/helpers/GovernanceHelper.sol";
import "./MarketUpdateDeploymentBaseTest.sol";

contract MarketUpdateMainnetDeploymentTest is Test, MarketUpdateDeploymentBaseTest {

    MarketUpdateContractsDeployer.DeployedContracts deployedContracts;

    function setUp() public {
        vm.createSelectFork("mainnet");
        deployedContracts = createMarketUpdateDeployment(vm, MarketUpdateAddresses.Chain.ETHEREUM);
    }

    function test_UsdcDeployment() public {
        console.log("Create Supply Kink Proposal for USDC Market and verify after execution");

        updateAndVerifySupplyKink(
            vm,
            MarketAddresses.MAINNET_USDC_MARKET, 
            ChainAddressesLib.MAINNET_CONFIGURATOR_PROXY, 
            deployedContracts.newCometProxyAdmin, 
            "USDC"
        );
    }

    function test_UsdtDeployment() public {
        console.log("Create Supply Kink Proposal for USDT Market and verify after execution");

        updateAndVerifySupplyKink(
            vm,
            MarketAddresses.MAINNET_USDT_MARKET, 
            ChainAddressesLib.MAINNET_CONFIGURATOR_PROXY, 
            deployedContracts.newCometProxyAdmin, 
            "USDT"
        );
    }

    function test_EthDeployment() public {
        console.log("Create Supply Kink Proposal for ETH Market and verify after execution");

        updateAndVerifySupplyKink(
            vm,
            MarketAddresses.MAINNET_ETH_MARKET, 
            ChainAddressesLib.MAINNET_CONFIGURATOR_PROXY, 
            deployedContracts.newCometProxyAdmin, 
            "ETH"
        );
    }

    function test_WstEthDeployment() public {
        console.log("Create Supply Kink Proposal for WST_ETH Market and verify after execution");

        updateAndVerifySupplyKink(
            vm,
            MarketAddresses.MAINNET_WST_ETH_MARKET, 
            ChainAddressesLib.MAINNET_CONFIGURATOR_PROXY, 
            deployedContracts.newCometProxyAdmin, 
            "WST_ETH"
        );
    }
}
