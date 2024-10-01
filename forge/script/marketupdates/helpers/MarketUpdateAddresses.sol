// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;



library MarketUpdateAddresses {
    address public constant GOVERNOR_BRAVO_PROXY_ADDRESS = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529;
    address public constant GOVERNOR_BRAVO_TIMELOCK_ADDRESS = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;

    // Old Addresses
    address public constant MARKET_UPDATE_MULTISIG_ADDRESS = 0x7053e25f7076F4986D632A3C04313C81831e0d55;
    address public constant MARKET_ADMIN_PAUSE_GUARDIAN_ADDRESS = 0x7053e25f7076F4986D632A3C04313C81831e0d55;
    address public constant MARKET_UPDATE_PROPOSAL_GUARDIAN_ADDRESS = 0x77B65c68E52C31eb844fb3b4864B91133e2C1308;

    // New Addresses
    address public constant computedMarketUpdateMultiSigAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public constant computedMarketAdminProposerAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public constant computedMarketUpdateTimelockAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public constant computedMarketAdminPermissionCheckerAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public constant computedConfiguratorImplementationAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;
    address public constant computedNewCometProxyAdminAddress = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925;

    enum Chain {
        ETHEREUM,
        POLYGON,
        ARBITRUM,
        BASE,
        SCROLL,
        OPTIMISM
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


    function getEthereum() public pure returns (MarketUpdateAddressesStruct memory) {
        MarketInfo[] memory markets = new MarketInfo[](4);
        markets[0] = MarketInfo({
            baseTokenSymbol: "ETH",
            cometProxyAddress: 0xA17581A9E3356d9A858b789D68B4d866e593aE94
        });
        markets[1] = MarketInfo({
            baseTokenSymbol: "USDC",
            cometProxyAddress: 0xc3d688B66703497DAA19211EEdff47f25384cdc3
        });
        markets[2] = MarketInfo({
            baseTokenSymbol: "USDT",
            cometProxyAddress: 0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840
        });
        markets[3] = MarketInfo({
            baseTokenSymbol: "wstETH",
            cometProxyAddress: 0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3
        });

        // Return the struct with initialized values
        return MarketUpdateAddressesStruct({
            governorTimelockAddress: 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925,
            configuratorProxyAddress: 0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3,
            cometProxyAdminAddress: 0x1EC63B5883C3481134FD50D5DAebc83Ecd2E8779,
            markets: markets,

            marketUpdateMultiSigAddress: computedMarketUpdateMultiSigAddress,
            marketAdminProposerAddress: computedMarketAdminProposerAddress,
            marketUpdateTimelockAddress: computedMarketUpdateTimelockAddress,
            marketAdminPermissionCheckerAddress: computedMarketAdminPermissionCheckerAddress,
            configuratorImplementationAddress: computedConfiguratorImplementationAddress,
            newCometProxyAdminAddress: computedNewCometProxyAdminAddress
        });
    }

    function getPolygon() public pure returns (MarketUpdateAddressesStruct memory) {
        MarketInfo[] memory markets = new MarketInfo[](2);
        markets[0] = MarketInfo({
            baseTokenSymbol: "USDC.e",
            cometProxyAddress: 0xF25212E676D1F7F89Cd72fFEe66158f541246445
        });
        markets[1] = MarketInfo({
            baseTokenSymbol: "USDT",
            cometProxyAddress: 0xaeB318360f27748Acb200CE616E389A6C9409a07
        });

        // Return the struct with initialized values
        return MarketUpdateAddressesStruct({
            governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02,
            configuratorProxyAddress: 0x83E0F742cAcBE66349E3701B171eE2487a26e738,
            cometProxyAdminAddress: 0xd712ACe4ca490D4F3E92992Ecf3DE12251b975F9,
            markets: markets,

            marketUpdateMultiSigAddress: computedMarketUpdateMultiSigAddress,
            marketAdminProposerAddress: computedMarketAdminProposerAddress,
            marketUpdateTimelockAddress: computedMarketUpdateTimelockAddress,
            marketAdminPermissionCheckerAddress: computedMarketAdminPermissionCheckerAddress,
            configuratorImplementationAddress: computedConfiguratorImplementationAddress,
            newCometProxyAdminAddress: computedNewCometProxyAdminAddress
        });
    }

    function getArbitrum() public pure returns (MarketUpdateAddressesStruct memory) {
        MarketInfo[] memory markets = new MarketInfo[](4);
        markets[0] = MarketInfo({
            baseTokenSymbol: "USDC.e",
            cometProxyAddress: 0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA
        });
        markets[1] = MarketInfo({
            baseTokenSymbol: "USDC",
            cometProxyAddress: 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
        });
        markets[2] = MarketInfo({
            baseTokenSymbol: "ETH",
            cometProxyAddress: 0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486
        });
        markets[3] = MarketInfo({
            baseTokenSymbol: "USDT",
            cometProxyAddress: 0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07
        });

        // Return the struct with initialized values
        return MarketUpdateAddressesStruct({
            governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02,
            configuratorProxyAddress: 0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775,
            cometProxyAdminAddress: 0xD10b40fF1D92e2267D099Da3509253D9Da4D715e,
            markets: markets,

            marketUpdateMultiSigAddress: computedMarketUpdateMultiSigAddress,
            marketAdminProposerAddress: computedMarketAdminProposerAddress,
            marketUpdateTimelockAddress: computedMarketUpdateTimelockAddress,
            marketAdminPermissionCheckerAddress: computedMarketAdminPermissionCheckerAddress,
            configuratorImplementationAddress: computedConfiguratorImplementationAddress,
            newCometProxyAdminAddress: computedNewCometProxyAdminAddress
        });
    }

    function getBase() public pure returns (MarketUpdateAddressesStruct memory) {
        MarketInfo[] memory markets = new MarketInfo[](3);
        markets[0] = MarketInfo({
            baseTokenSymbol: "USDC",
            cometProxyAddress: 0xb125E6687d4313864e53df431d5425969c15Eb2F
        });
        markets[1] = MarketInfo({
            baseTokenSymbol: "USDbC",
            cometProxyAddress: 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
        });
        markets[2] = MarketInfo({
            baseTokenSymbol: "ETH",
            cometProxyAddress: 0x46e6b214b524310239732D51387075E0e70970bf
        });

        // Return the struct with initialized values
        return MarketUpdateAddressesStruct({
            governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02,
            configuratorProxyAddress: 0x45939657d1CA34A8FA39A924B71D28Fe8431e581,
            cometProxyAdminAddress: 0xbdE8F31D2DdDA895264e27DD990faB3DC87b372d,
            markets: markets,

            marketUpdateMultiSigAddress: computedMarketUpdateMultiSigAddress,
            marketAdminProposerAddress: computedMarketAdminProposerAddress,
            marketUpdateTimelockAddress: computedMarketUpdateTimelockAddress,
            marketAdminPermissionCheckerAddress: computedMarketAdminPermissionCheckerAddress,
            configuratorImplementationAddress: computedConfiguratorImplementationAddress,
            newCometProxyAdminAddress: computedNewCometProxyAdminAddress
        });
    }

    function getScroll() public pure returns (MarketUpdateAddressesStruct memory) {
        MarketInfo[] memory markets = new MarketInfo[](1);
        markets[0] = MarketInfo({
            baseTokenSymbol: "USDC",
            cometProxyAddress: 0xB2f97c1Bd3bf02f5e74d13f02E3e26F93D77CE44
        });

        // Return the struct with initialized values
        return MarketUpdateAddressesStruct({
            governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02,
            configuratorProxyAddress: 0xECAB0bEEa3e5DEa0c35d3E69468EAC20098032D7,
            cometProxyAdminAddress: 0x87A27b91f4130a25E9634d23A5B8E05e342bac50,
            markets: markets,

            marketUpdateMultiSigAddress: computedMarketUpdateMultiSigAddress,
            marketAdminProposerAddress: computedMarketAdminProposerAddress,
            marketUpdateTimelockAddress: computedMarketUpdateTimelockAddress,
            marketAdminPermissionCheckerAddress: computedMarketAdminPermissionCheckerAddress,
            configuratorImplementationAddress: computedConfiguratorImplementationAddress,
            newCometProxyAdminAddress: computedNewCometProxyAdminAddress
        });
    }

    function getOptimism() public pure returns (MarketUpdateAddressesStruct memory) {
        MarketInfo[] memory markets = new MarketInfo[](3);
        markets[0] = MarketInfo({
            baseTokenSymbol: "USDC",
            cometProxyAddress: 0x2e44e174f7D53F0212823acC11C01A11d58c5bCB
        });
        markets[1] = MarketInfo({
            baseTokenSymbol: "USDT",
            cometProxyAddress: 0x995E394b8B2437aC8Ce61Ee0bC610D617962B214
        });
        markets[2] = MarketInfo({
            baseTokenSymbol: "ETH",
            cometProxyAddress: 0xE36A30D249f7761327fd973001A32010b521b6Fd
        });

        // Return the struct with initialized values
        return MarketUpdateAddressesStruct({
            governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02,
            configuratorProxyAddress: 0x84E93EC6170ED630f5ebD89A1AAE72d4F63f2713,
            cometProxyAdminAddress: 0x3C30B5a5A04656565686f800481580Ac4E7ed178,
            markets: markets,

            marketUpdateMultiSigAddress: computedMarketUpdateMultiSigAddress,
            marketAdminProposerAddress: computedMarketAdminProposerAddress,
            marketUpdateTimelockAddress: computedMarketUpdateTimelockAddress,
            marketAdminPermissionCheckerAddress: computedMarketAdminPermissionCheckerAddress,
            configuratorImplementationAddress: computedConfiguratorImplementationAddress,
            newCometProxyAdminAddress: computedNewCometProxyAdminAddress
        });
    }

    function getAddressesForChain(Chain chain) public pure returns (MarketUpdateAddressesStruct memory) {
        if (chain == Chain.ETHEREUM) {
            return getEthereum();
        } else if (chain == Chain.POLYGON) {
            return getPolygon();
        } else if (chain == Chain.ARBITRUM) {
            return getArbitrum();
        } else if (chain == Chain.BASE) {
            return getBase();
        } else if (chain == Chain.SCROLL) {
            return getScroll();
        } else if (chain == Chain.OPTIMISM) {
            return getOptimism();
        }
        revert("MarketUpdateAddresses: Chain not supported");
    }
}
