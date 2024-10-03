// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

library ChainAddressesLib {
    // Mainnet addresses
    address constant public MAINNET_GOVERNOR_TIMELOCK = 0x6d903f6003cca6255D85CcA4D3B5E5146dC33925; // See - https://etherscan.io/address/0x6d903f6003cca6255D85CcA4D3B5E5146dC33925
    address constant public MAINNET_CONFIGURATOR_PROXY = 0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3; // See - https://etherscan.io/address/0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3
    address constant public MAINNET_COMET_PROXY_ADMIN = 0x1EC63B5883C3481134FD50D5DAebc83Ecd2E8779; // See - https://etherscan.io/address/0x1EC63B5883C3481134FD50D5DAebc83Ecd2E8779

    // Polygon addresses
    address constant public POLYGON_LOCAL_TIMELOCK = 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02; // See - https://polygonscan.com/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
    address constant public POLYGON_CONFIGURATOR_PROXY = 0x83E0F742cAcBE66349E3701B171eE2487a26e738; // See - https://polygonscan.com/address/0x83E0F742cAcBE66349E3701B171eE2487a26e738
    address constant public POLYGON_COMET_PROXY_ADMIN = 0xd712ACe4ca490D4F3E92992Ecf3DE12251b975F9; // See - https://polygonscan.com/address/0xd712ACe4ca490D4F3E92992Ecf3DE12251b975F9

    // Arbitrum addresses
    address constant public ARBITRUM_LOCAL_TIMELOCK = 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02; // See - https://arbiscan.io/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
    address constant public ARBITRUM_CONFIGURATOR_PROXY = 0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775; // See - https://arbiscan.io/address/0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775
    address constant public ARBITRUM_COMET_PROXY_ADMIN = 0xD10b40fF1D92e2267D099Da3509253D9Da4D715e; // See - https://arbiscan.io/address/0xD10b40fF1D92e2267D099Da3509253D9Da4D715e

    // Base addresses
    address constant public BASE_LOCAL_TIMELOCK = 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02; // See - https://basescan.org/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
    address constant public BASE_CONFIGURATOR_PROXY = 0x45939657d1CA34A8FA39A924B71D28Fe8431e581; // See - https://basescan.org/address/0x45939657d1CA34A8FA39A924B71D28Fe8431e581
    address constant public BASE_COMET_PROXY_ADMIN = 0xbdE8F31D2DdDA895264e27DD990faB3DC87b372d; // See - https://basescan.org/address/0xbdE8F31D2DdDA895264e27DD990faB3DC87b372d

    // Scroll addresses
    address constant public SCROLL_LOCAL_TIMELOCK = 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02; // See - https://scrollscan.com/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
    address constant public SCROLL_CONFIGURATOR_PROXY = 0xECAB0bEEa3e5DEa0c35d3E69468EAC20098032D7; // See - https://scrollscan.com/address/0xECAB0bEEa3e5DEa0c35d3E69468EAC20098032D7
    address constant public SCROLL_COMET_PROXY_ADMIN = 0x87A27b91f4130a25E9634d23A5B8E05e342bac50; // See - https://scrollscan.com/address/0x87A27b91f4130a25E9634d23A5B8E05e342bac50

    // Optimism addresses
    address constant public OPTIMISM_LOCAL_TIMELOCK = 0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02; // See - https://optimistic.etherscan.io/address/0xCC3E7c85Bb0EE4f09380e041fee95a0caeDD4a02
    address constant public OPTIMISM_CONFIGURATOR_PROXY = 0x84E93EC6170ED630f5ebD89A1AAE72d4F63f2713; // See - https://optimistic.etherscan.io/address/0x84E93EC6170ED630f5ebD89A1AAE72d4F63f2713
    address constant public OPTIMISM_COMET_PROXY_ADMIN = 0x3C30B5a5A04656565686f800481580Ac4E7ed178; // See - https://optimistic.etherscan.io/address/0x3C30B5a5A04656565686f800481580Ac4E7ed178
}
