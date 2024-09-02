// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "./vendor/proxy/transparent/ProxyAdmin.sol";

interface Deployable {
  function deploy(address cometProxy) external returns (address);
}

contract CometProxyAdmin is ProxyAdmin {
    /// @notice Pause flag for the market update admin
    bool public marketAdminPaused = false;

    /// @notice The address of the market update admin. This will be the address of a timelock contract.
    address public marketAdmin;

    /// @notice address of the market admin pause guardian. We don't use `pauseGuardian` because we have `setPauseGuardian` which sets the pauseGuardian on comet.
    address public marketAdminPauseGuardian;

    event SetMarketAdmin(address indexed oldAdmin, address indexed newAdmin);
    event MarketAdminPaused(bool isMarketAdminPaused);
    event SetMarketAdminPauseGuardian(address indexed oldPauseGuardian, address indexed newPauseGuardian);

    error Unauthorized();
    
    /**
     * @dev Throws if called by any account other than the owner and market update admin
     */
    modifier ownerOrMarketAdmin() {
        require(owner() == _msgSender() || _msgSender() == marketAdmin, "Unauthorized: caller is not owner or market update admin");
        // If the sender is the marketAdmin, check that the marketAdmin is not paused
        require(_msgSender() != marketAdmin || !marketAdminPaused, "Market admin is paused");
        _;
    }

    function setMarketAdmin(address newAdmin) public{
        require(owner() == _msgSender() , "Unauthorized: caller is not the owner");
        marketAdmin = newAdmin;
    }
    
    function pauseMarketAdmin() external {
        if (msg.sender != owner() && msg.sender != marketAdminPauseGuardian) revert Unauthorized();
        marketAdminPaused = true;
        emit MarketAdminPaused(true);
    }

    function unpauseMarketAdmin() external {
        if (msg.sender != owner()) revert Unauthorized();
        marketAdminPaused = false;
        emit MarketAdminPaused(false);
    }

    function setMarketAdminPauseGuardian(address newPauseGuardian) external {
        if (msg.sender != owner()) revert Unauthorized();
        address oldPauseGuardian = marketAdminPauseGuardian;
        marketAdminPauseGuardian = newPauseGuardian;
        emit SetMarketAdminPauseGuardian(oldPauseGuardian, newPauseGuardian);
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
        proxy.upgradeToAndCall{value: msg.value}(implementation, data);
    }
}
