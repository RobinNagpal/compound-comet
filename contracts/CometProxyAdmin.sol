// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "./vendor/proxy/transparent/ProxyAdmin.sol";

interface Deployable {
  function deploy(address cometProxy) external returns (address);
}

contract CometProxyAdmin is ProxyAdmin {
    address public marketAdmin;

    /**
     * @dev Throws if called by any account other than the owner and market update admin
     */
    modifier ownerOrMarketAdmin() {
        require(owner() == _msgSender() || _msgSender() == marketAdmin, "Unauthorized: caller is not owner or market update admin");
        _;
    }

    function setMarketAdmin(address newAdmin) public{
        require(owner() == _msgSender() , "Unauthorized: caller is not the owner");
        marketAdmin = newAdmin;
    }
    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy
     *  Requirements:
     *   - This contract must be the admin of `CometProxy`
     */
    function deployAndUpgradeTo(Deployable configuratorProxy, TransparentUpgradeableProxy cometProxy) public virtual ownerOrMarketAdmin {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        upgrade(cometProxy, newCometImpl);
    }

    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy, then call the function
     *  Requirements:
     *   - This contract must be the admin of `CometProxy`
     */
    function deployUpgradeToAndCall(Deployable configuratorProxy, TransparentUpgradeableProxy cometProxy, bytes memory data) public virtual ownerOrMarketAdmin {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        upgradeAndCall(cometProxy, newCometImpl, data);
    }

       /**
     * @dev Custom upgrade function that allows marketUpdateAdmin to call it
     */
    function upgrade(TransparentUpgradeableProxy proxy, address implementation) public virtual override ownerOrMarketAdmin {
        proxy.upgradeTo(implementation);
    }

    /**
     * @dev Custom upgradeAndCall function that allows marketUpdateAdmin to call it
     */
    function upgradeAndCall(TransparentUpgradeableProxy proxy, address implementation, bytes memory data) public virtual override payable ownerOrMarketAdmin {
        proxy.upgradeToAndCall{value: msg.value}(implementation, data);
    }
}
