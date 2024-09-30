// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;



library MarketUpdateAddresses {

    address public computedMarketUpdateMultiSigAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public computedMarketAdminProposerAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public computedMarketUpdateTimelockAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public computedMarketAdminPermissionCheckerAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public computedConfiguratorImplementationAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public computedNewCometProxyAdminAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;

    enum Chain {
        MAINNET
    }

    struct MarketInfo {
        string baseTokenSymbol;
        address cometProxyAddress;
    }

    struct MarketUpdateAddressesStruct {
        // Old addresses
        address governorTimelockAddress;
        address configuratorProxyAddress;
        address cometProxyAdminAddress;
        MarketInfo[] markets;



        // New addresses
        address marketUpdateMultiSigAddress;
        address marketAdminProposerAddress;
        address marketUpdateTimelockAddress;
        address marketAdminPermissionCheckerAddress;
        address configuratorImplementationAddress;
        address newCometProxyAdminAddress;
    }


    function getMainnet() public pure returns (MarketUpdateAddressesStruct memory) {
        MarketInfo[] memory markets = new MarketInfo[](2);
        markets[0] = MarketInfo({
            baseTokenSymbol: "ETH",
            cometProxyAddress: 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925
        });
        markets[1] = MarketInfo({
            baseTokenSymbol: "USDC",
            cometProxyAddress: 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925
        });

        // Return the struct with initialized values
        return MarketUpdateAddressesStruct({
            governorTimelockAddress: 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925,
            configuratorProxyAddress: 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925,
            cometProxyAdminAddress: 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925,
            markets: markets,

            marketUpdateMultiSigAddress: computedMarketUpdateMultiSigAddress,
            marketAdminProposerAddress: computedMarketAdminProposerAddress,
            marketUpdateTimelockAddress: computedMarketUpdateTimelockAddress,
            marketAdminPermissionCheckerAddress: computedMarketAdminPermissionCheckerAddress,
            configuratorImplementationAddress: computedConfiguratorImplementationAddress,
            newCometProxyAdminAddress: computedNewCometProxyAdminAddress
        });
    }

    function getAddressesForChain(Chain memory chain) public pure returns (MarketUpdateAddressesStruct memory) {
        if (chain == Chain.MAINNET) {
            return getMainnet();
        }
        revert("MarketUpdateAddresses: Chain not supported");
    }
}
