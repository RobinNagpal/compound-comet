// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "./vendor/proxy/transparent/ProxyAdmin.sol";
import "./marketupdates/MarketAdminPermissionChecker.sol";

interface Deployable {
  function deploy(address cometProxy) external returns (address);
}

contract CometProxyAdmin is ProxyAdmin {
    MarketAdminPermissionChecker public marketAdminPermissionChecker;

    error Unauthorized();

    /**
     * @dev Throws if called by any account other than the owner and market update admin
     */
    modifier ownerOrMarketAdmin() {
        // using revert instead of require to keep it consistent with other calls
        if (owner() != _msgSender() && marketAdminPermissionChecker.marketAdmin() != _msgSender()) revert Unauthorized();
        // If the sender is the marketAdmin, check that the marketAdmin is not paused
        marketAdminPermissionChecker.checkMarketAdminPermission();
        _;
    }

    constructor(MarketAdminPermissionChecker marketAdminPermissionChecker_) {
        marketAdminPermissionChecker = marketAdminPermissionChecker_;
    }

    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy
     *  Requirements:
     *   - This contract must be the admin or market admin of `CometProxy`
     */
    function deployAndUpgradeTo(Deployable configuratorProxy, TransparentUpgradeableProxy cometProxy) public virtual ownerOrMarketAdmin {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        _upgrade(cometProxy, newCometImpl);
    }

    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy, then call the function
     *  Requirements:
     *   - This contract must be the admin or market admin of `CometProxy`
     */
    function deployUpgradeToAndCall(Deployable configuratorProxy, TransparentUpgradeableProxy cometProxy, bytes memory data) public virtual ownerOrMarketAdmin {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        _upgradeAndCall(cometProxy, newCometImpl, data);
    }

    /**
     * @dev Custom upgrade function that allows owner and marketUpdateAdmin to call it
     */
    function _upgrade(TransparentUpgradeableProxy proxy, address implementation) private ownerOrMarketAdmin {
        proxy.upgradeTo(implementation);
    }

    /**
     * @dev Custom upgradeAndCall function that allows owner and marketUpdateAdmin to call it
     */
    function _upgradeAndCall(TransparentUpgradeableProxy proxy, address implementation, bytes memory data) private ownerOrMarketAdmin {
        proxy.upgradeToAndCall(implementation, data);
    }
}
