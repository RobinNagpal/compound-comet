// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "./vendor/proxy/transparent/ProxyAdmin.sol";

interface Deployable {
  function deploy(address cometProxy) external returns (address);
}

contract CometProxyAdmin is ProxyAdmin {
    address public marketUpdateAdmin;

    /**
     * @dev Throws if called by any account other than the owner and market update admin
     */
    modifier ownerAndMarketUpdateAdmin() {
        require(owner() == _msgSender() || _msgSender() == marketUpdateAdmin, "Unauthorized: caller is not owner or market update admin");
        _;
    }

    function setMarketUpdateAdmin(address newAdmin) public{
        require(_msgSender() == owner(), "Unauthorized: caller is not the owner");
        marketUpdateAdmin = newAdmin;
    }
    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy
     *  Requirements:
     *   - This contract must be the admin of `CometProxy`
     */
    function deployAndUpgradeTo(Deployable configuratorProxy, TransparentUpgradeableProxy cometProxy) public virtual ownerAndMarketUpdateAdmin {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        _customUpgrade(cometProxy, newCometImpl);
    }

    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy, then call the function
     *  Requirements:
     *   - This contract must be the admin of `CometProxy`
     */
    function deployUpgradeToAndCall(Deployable configuratorProxy, TransparentUpgradeableProxy cometProxy, bytes memory data) public virtual ownerAndMarketUpdateAdmin {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        _customUpgradeAndCall(cometProxy, newCometImpl, data);
    }

       /**
     * @dev Custom upgrade function that allows marketUpdateAdmin to call it
     */
    function _customUpgrade(TransparentUpgradeableProxy proxy, address implementation) internal {
        super.upgrade(proxy, implementation);  // Call ProxyAdmin's upgrade function
    }

    /**
     * @dev Custom upgradeAndCall function that allows marketUpdateAdmin to call it
     */
    function _customUpgradeAndCall(TransparentUpgradeableProxy proxy, address implementation, bytes memory data) internal {
        super.upgradeAndCall(proxy, implementation, data);  // Call ProxyAdmin's upgradeAndCall function
    }
}