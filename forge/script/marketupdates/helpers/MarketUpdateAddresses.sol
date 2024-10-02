// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MarketUpdateContractsDeployer.sol";

library MarketUpdateAddresses {
    address public constant GOVERNOR_BRAVO_PROXY_ADDRESS = 0xc0Da02939E1441F497fd74F78cE7Decb17B66529; // See - https://etherscan.io/address/0xc0Da02939E1441F497fd74F78cE7Decb17B66529
    address public constant GOVERNOR_BRAVO_TIMELOCK_ADDRESS = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925; // See - https://etherscan.io/address/0x6d903f6003cca6255D85CcA4D3B5E5146dC33925

    // Old Addresses
    address public constant MARKET_ADMIN_PAUSE_GUARDIAN_ADDRESS = 0x7053e25f7076F4986D632A3C04313C81831e0d55;
    address public constant MARKET_UPDATE_PROPOSAL_GUARDIAN_ADDRESS = 0x77B65c68E52C31eb844fb3b4864B91133e2C1308;

    // New Addresses
    address public constant MARKET_UPDATE_MULTISIG_ADDRESS = 0x7053e25f7076F4986D632A3C04313C81831e0d55;

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

    struct ChainAddresses {
        address governorTimelockAddress;
        address configuratorProxyAddress;
        address cometProxyAdminAddress;
    }

    function getAddressesForChain(
        Chain chain,
        MarketUpdateContractsDeployer.DeployedContracts memory deployedContracts,
        address marketUpdateMultisig
    ) public pure returns (MarketUpdateAddressesStruct memory) {
        ChainAddresses memory chainAddresses = getChainAddresses(chain);
        MarketInfo[] memory markets = getMarketsForChain(chain);

        return MarketUpdateAddressesStruct({
            governorTimelockAddress: chainAddresses.governorTimelockAddress,
            configuratorProxyAddress: chainAddresses.configuratorProxyAddress,
            cometProxyAdminAddress: chainAddresses.cometProxyAdminAddress,
            markets: markets,
            marketUpdateMultiSigAddress: marketUpdateMultisig,
            marketAdminProposerAddress: deployedContracts.marketUpdateProposer,
            marketUpdateTimelockAddress: deployedContracts.marketUpdateTimelock,
            marketAdminPermissionCheckerAddress: deployedContracts.marketAdminPermissionChecker,
            configuratorImplementationAddress: deployedContracts.newConfiguratorImplementation,
            newCometProxyAdminAddress: deployedContracts.newCometProxyAdmin
        });
    }

    function getChainAddresses(Chain chain) internal pure returns (ChainAddresses memory) {
        if (chain == Chain.ETHEREUM) {
            return ChainAddresses({
                governorTimelockAddress: 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925, // See - https://etherscan.io/address/0x6d903f6003cca6255D85CcA4D3B5E5146dC33925
                configuratorProxyAddress: 0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3, // See - https://etherscan.io/address/0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3
                cometProxyAdminAddress: 0x1EC63B5883C3481134FD50D5DAebc83Ecd2E8779 // See - https://etherscan.io/address/0x1EC63B5883C3481134FD50D5DAebc83Ecd2E8779
            });
        } else if (chain == Chain.POLYGON) {
            return ChainAddresses({
                governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02, // See - https://polygonscan.com/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
                configuratorProxyAddress: 0x83E0F742cAcBE66349E3701B171eE2487a26e738, // See - https://polygonscan.com/address/0x83E0F742cAcBE66349E3701B171eE2487a26e738
                cometProxyAdminAddress: 0xd712ACe4ca490D4F3E92992Ecf3DE12251b975F9 // See - https://polygonscan.com/address/0xd712ACe4ca490D4F3E92992Ecf3DE12251b975F9
            });
        } else if (chain == Chain.ARBITRUM) {
            return ChainAddresses({
                governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02, // See - https://arbiscan.io/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
                configuratorProxyAddress: 0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775, // See - https://arbiscan.io/address/0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775
                cometProxyAdminAddress: 0xD10b40fF1D92e2267D099Da3509253D9Da4D715e // See - https://arbiscan.io/address/0xD10b40fF1D92e2267D099Da3509253D9Da4D715e
            });
        } else if (chain == Chain.BASE) {
            return ChainAddresses({
                governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02, // See - https://basescan.org/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
                configuratorProxyAddress: 0x45939657d1CA34A8FA39A924B71D28Fe8431e581, // See - https://basescan.org/address/0x45939657d1CA34A8FA39A924B71D28Fe8431e581
                cometProxyAdminAddress: 0xbdE8F31D2DdDA895264e27DD990faB3DC87b372d // See - https://basescan.org/address/0xbdE8F31D2DdDA895264e27DD990faB3DC87b372d
            });
        } else if (chain == Chain.SCROLL) {
            return ChainAddresses({
                governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02, // See - https://scrollscan.com/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
                configuratorProxyAddress: 0xECAB0bEEa3e5DEa0c35d3E69468EAC20098032D7, // See - https://scrollscan.com/address/0xECAB0bEEa3e5DEa0c35d3E69468EAC20098032D7
                cometProxyAdminAddress: 0x87A27b91f4130a25E9634d23A5B8E05e342bac50 // See - https://scrollscan.com/address/0x87A27b91f4130a25E9634d23A5B8E05e342bac50
            });
        } else if (chain == Chain.OPTIMISM) {
            return ChainAddresses({
                governorTimelockAddress: 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02, // See - https://optimistic.etherscan.io/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
                configuratorProxyAddress: 0x84E93EC6170ED630f5ebD89A1AAE72d4F63f2713, // See - https://optimistic.etherscan.io/address/0x84E93EC6170ED630f5ebD89A1AAE72d4F63f2713
                cometProxyAdminAddress: 0x3C30B5a5A04656565686f800481580Ac4E7ed178 // See - https://optimistic.etherscan.io/address/0x3C30B5a5A04656565686f800481580Ac4E7ed178
            });
        } else {
            revert("MarketUpdateAddresses: Chain not supported");
        }
    }

    function getMarketsForChain(Chain chain) internal pure returns (MarketInfo[] memory) {
        if (chain == Chain.ETHEREUM) {
            MarketInfo[] memory markets = new MarketInfo[](4);
            markets[0] = MarketInfo({
                baseTokenSymbol: "ETH",
                cometProxyAddress: 0xA17581A9E3356d9A858b789D68B4d866e593aE94 // See - https://etherscan.io/address/0xA17581A9E3356d9A858b789D68B4d866e593aE94
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: 0xc3d688B66703497DAA19211EEdff47f25384cdc3 // See - https://etherscan.io/address/0xc3d688B66703497DAA19211EEdff47f25384cdc3
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: 0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840 // See - https://etherscan.io/address/0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840
            });
            markets[3] = MarketInfo({
                baseTokenSymbol: "wstETH",
                cometProxyAddress: 0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3 // See - https://etherscan.io/address/0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3
            });
            return markets;
        } else if (chain == Chain.POLYGON) {
            MarketInfo[] memory markets = new MarketInfo[](2);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC.e",
                cometProxyAddress: 0xF25212E676D1F7F89Cd72fFEe66158f541246445 // See - https://polygonscan.com/address/0xF25212E676D1F7F89Cd72fFEe66158f541246445
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: 0xaeB318360f27748Acb200CE616E389A6C9409a07 // See - https://polygonscan.com/address/0xaeB318360f27748Acb200CE616E389A6C9409a07
            });
            return markets;
        } else if (chain == Chain.ARBITRUM) {
            MarketInfo[] memory markets = new MarketInfo[](4);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC.e",
                cometProxyAddress: 0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA // See - https://arbiscan.io/address/0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf // See - https://arbiscan.io/address/0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "ETH",
                cometProxyAddress: 0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486 // See - https://arbiscan.io/address/0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486
            });
            markets[3] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: 0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07 // See - https://arbiscan.io/address/0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07
            });
            return markets;
        } else if (chain == Chain.BASE) {
            MarketInfo[] memory markets = new MarketInfo[](3);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: 0xb125E6687d4313864e53df431d5425969c15Eb2F // See - https://basescan.org/address/0xb125E6687d4313864e53df431d5425969c15Eb2F
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDbC",
                cometProxyAddress: 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf // See - https://basescan.org/address/0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "ETH",
                cometProxyAddress: 0x46e6b214b524310239732D51387075E0e70970bf // See - https://basescan.org/address/0x46e6b214b524310239732D51387075E0e70970bf
            });
            return markets;
        } else if (chain == Chain.SCROLL) {
            MarketInfo[] memory markets = new MarketInfo[](1);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: 0xB2f97c1Bd3bf02f5e74d13f02E3e26F93D77CE44 // See - https://scrollscan.com/address/0xB2f97c1Bd3bf02f5e74d13f02E3e26F93D77CE44
            });
            return markets;
        } else if (chain == Chain.OPTIMISM) {
            MarketInfo[] memory markets = new MarketInfo[](3);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: 0x2e44e174f7D53F0212823acC11C01A11d58c5bCB // See - https://optimistic.etherscan.io/address/0x2e44e174f7D53F0212823acC11C01A11d58c5bCB
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: 0x995E394b8B2437aC8Ce61Ee0bC610D617962B214 // See - https://optimistic.etherscan.io/address/0x995E394b8B2437aC8Ce61Ee0bC610D617962B214
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "ETH",
                cometProxyAddress: 0xE36A30D249f7761327fd973001A32010b521b6Fd // See - https://optimistic.etherscan.io/address/0xE36A30D249f7761327fd973001A32010b521b6Fd
            });
            return markets;
        }

        revert("MarketUpdateAddresses: Chain not supported");
    }
}
