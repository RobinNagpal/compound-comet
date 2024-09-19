// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

/**
 * @dev Interface for interacting with MarketAdminPermissionChecker
 */
interface IMarketAdminPermissionChecker {
    function checkUpdatePermission(address callerAddress) external view;
}
