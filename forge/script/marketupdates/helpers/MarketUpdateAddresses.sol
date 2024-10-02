// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MarketUpdateContractsDeployer.sol";
import "./MarketAddresses.sol";
import "./ChainAddresses.sol";

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
                governorTimelockAddress: ChainAddressesLib.MAINNET_GOVERNOR_TIMELOCK,
                configuratorProxyAddress: ChainAddressesLib.MAINNET_CONFIGURATOR_PROXY,
                cometProxyAdminAddress: ChainAddressesLib.MAINNET_COMET_PROXY_ADMIN
            });
        } else if (chain == Chain.POLYGON) {
            return ChainAddresses({
                governorTimelockAddress: ChainAddressesLib.POLYGON_GOVERNOR_TIMELOCK,
                configuratorProxyAddress: ChainAddressesLib.POLYGON_CONFIGURATOR_PROXY,
                cometProxyAdminAddress: ChainAddressesLib.POLYGON_COMET_PROXY_ADMIN
            });
        } else if (chain == Chain.ARBITRUM) {
            return ChainAddresses({
                governorTimelockAddress: ChainAddressesLib.ARBITRUM_GOVERNOR_TIMELOCK,
                configuratorProxyAddress: ChainAddressesLib.ARBITRUM_CONFIGURATOR_PROXY,
                cometProxyAdminAddress: ChainAddressesLib.ARBITRUM_COMET_PROXY_ADMIN
            });
        } else if (chain == Chain.BASE) {
            return ChainAddresses({
                governorTimelockAddress: ChainAddressesLib.BASE_GOVERNOR_TIMELOCK,
                configuratorProxyAddress: ChainAddressesLib.BASE_CONFIGURATOR_PROXY,
                cometProxyAdminAddress: ChainAddressesLib.BASE_COMET_PROXY_ADMIN
            });
        } else if (chain == Chain.SCROLL) {
            return ChainAddresses({
                governorTimelockAddress: ChainAddressesLib.SCROLL_GOVERNOR_TIMELOCK,
                configuratorProxyAddress: ChainAddressesLib.SCROLL_CONFIGURATOR_PROXY,
                cometProxyAdminAddress: ChainAddressesLib.SCROLL_COMET_PROXY_ADMIN
            });
        } else if (chain == Chain.OPTIMISM) {
            return ChainAddresses({
                governorTimelockAddress: ChainAddressesLib.OPTIMISM_GOVERNOR_TIMELOCK,
                configuratorProxyAddress: ChainAddressesLib.OPTIMISM_CONFIGURATOR_PROXY,
                cometProxyAdminAddress: ChainAddressesLib.OPTIMISM_COMET_PROXY_ADMIN
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
                cometProxyAddress: MarketAddresses.MAINNET_ETH_MARKET
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: MarketAddresses.MAINNET_USDC_MARKET
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: MarketAddresses.MAINNET_USDT_MARKET
            });
            markets[3] = MarketInfo({
                baseTokenSymbol: "wstETH",
                cometProxyAddress: MarketAddresses.MAINNET_WST_ETH_MARKET
            });
            return markets;
        } else if (chain == Chain.POLYGON) {
            MarketInfo[] memory markets = new MarketInfo[](2);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC.e",
                cometProxyAddress: MarketAddresses.POLYGON_USDCe_MARKET
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: MarketAddresses.POLYGON_USDT_MARKET
            });
            return markets;
        } else if (chain == Chain.ARBITRUM) {
            MarketInfo[] memory markets = new MarketInfo[](4);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC.e",
                cometProxyAddress: MarketAddresses.ARBITRUM_USDCe_MARKET
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: MarketAddresses.ARBITRUM_USDC_MARKET
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "ETH",
                cometProxyAddress: MarketAddresses.ARBITRUM_ETH_MARKET
            });
            markets[3] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: MarketAddresses.ARBITRUM_USDT_MARKET
            });
            return markets;
        } else if (chain == Chain.BASE) {
            MarketInfo[] memory markets = new MarketInfo[](3);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: MarketAddresses.BASE_USDC_MARKET
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDbC",
                cometProxyAddress: MarketAddresses.BASE_USDbC_MARKET
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "ETH",
                cometProxyAddress: MarketAddresses.BASE_ETH_MARKET
            });
            return markets;
        } else if (chain == Chain.SCROLL) {
            MarketInfo[] memory markets = new MarketInfo[](1);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: MarketAddresses.SCROLL_USDC_MARKET
            });
            return markets;
        } else if (chain == Chain.OPTIMISM) {
            MarketInfo[] memory markets = new MarketInfo[](3);
            markets[0] = MarketInfo({
                baseTokenSymbol: "USDC",
                cometProxyAddress: MarketAddresses.OPTIMISM_USDC_MARKET
            });
            markets[1] = MarketInfo({
                baseTokenSymbol: "USDT",
                cometProxyAddress: MarketAddresses.OPTIMISM_USDT_MARKET
            });
            markets[2] = MarketInfo({
                baseTokenSymbol: "ETH",
                cometProxyAddress: MarketAddresses.OPTIMISM_ETH_MARKET
            });
            return markets;
        }

        revert("MarketUpdateAddresses: Chain not supported");
    }
}
