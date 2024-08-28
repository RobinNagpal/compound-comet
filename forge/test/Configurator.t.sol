// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../contracts/test/SimpleTimelock.sol";
import "../../contracts/Comet.sol";
import "../../contracts/CometConfiguration.sol";
import "../../contracts/Configurator.sol";
import "../../contracts/vendor/proxy/transparent/TransparentUpgradeableProxy.sol";

contract TimelockTest is Test {
    SimpleTimelock public timelock;
    Configurator public configurator;
    TransparentUpgradeableProxy public configuratorProxy;
    address public governor;
    address public alice;
    address public henry;
    Comet public comet;
    CometConfiguration public cometConfig;
    Configurator public configuratorAsProxy;

    function setUp() public {
        // Set up initial variables and accounts
        governor = vm.addr(1);
        alice = vm.addr(2);
        henry = vm.addr(2);

        // Deploy Configurator and Proxy contracts
        configurator = new Configurator();
        configuratorProxy = new TransparentUpgradeableProxy(address(configurator), address(governor), "");

        // Assume configuratorAsProxy is the attached proxy instance
        configuratorAsProxy = Configurator(address(configuratorProxy));

        // Initialize the proxy if it hasn't been initialized yet (optional)
        // If you decide to initialize here, ensure this only happens once.
        if (address(configuratorAsProxy.governor()) == address(0)) {
            configuratorAsProxy.initialize(alice);
        }
    }

    function testExecuteTransactionsAsGovernor() public {
        vm.prank(alice);
        configuratorAsProxy.transferGovernor(henry);

        // Check that the pauseGuardian was set to Alice
        assertEq(configuratorAsProxy.governor(), henry);
    }
}
