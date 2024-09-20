// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "../vendor/access/Ownable.sol";
import "./MarketAdminPermissionCheckerInterface.sol";

contract MarketAdminPermissionChecker is MarketAdminPermissionCheckerInterface, Ownable {
    /// @notice The address of the market admin. This will be the address of a timelock contract.
    address public marketAdmin;
    
    /// @notice Pause flag for the market admin
    bool public marketAdminPaused;

    /// @notice address of the market admin pause guardian. We don't use `pauseGuardian` role because we have `setPauseGuardian` already which sets the pauseGuardian on comet.
    address public marketAdminPauseGuardian;

    event SetMarketAdmin(address indexed oldAdmin, address indexed newAdmin);
    event SetMarketAdminPauseGuardian(address indexed oldPauseGuardian, address indexed newPauseGuardian);
    event MarketAdminPaused(address indexed caller, bool isMarketAdminPaused);

    error InvalidAddress();
    error AlreadyPaused();
    error AlreadyUnPaused();

    /**
     * @notice Construct a new MarketAdminPermissionChecker contract.
     * Not adding any checks for zero address as it may be a deliberate choice to assign the zero address i.e. keep the
     * market updates disabled.
     * @param _marketAdmin The address of the market admin.
     * @param _marketAdminPauseGuardian The address of the market admin pause guardian.
     */
    constructor(address marketAdmin_, address marketAdminPauseGuardian_) {
        marketAdmin = marketAdmin_;
        marketAdminPauseGuardian = marketAdminPauseGuardian_;
    }
    /**
     * @notice Sets a new market admin.
     * @dev Can only be called by the governor. Reverts with Unauthorized if the caller is not the governor.
     * Emits an event with the old and new market admin addresses.
     * Note that there is no enforced zero address check on `newMarketAdmin` as it may be a deliberate choice
     * to assign the zero address in certain scenarios. This design allows flexibility if the zero address
     * is intended to represent a specific state, such as temporarily disabling the market admin role.
     * @param newMarketAdmin The address of the new market admin.
     */
    function setMarketAdmin(address newMarketAdmin) external onlyOwner {
        address oldMarketAdmin = marketAdmin;
        marketAdmin = newMarketAdmin;
        emit SetMarketAdmin(oldMarketAdmin, newMarketAdmin);
    }

    /**
     * @notice Sets a new market admin pause guardian.
     * @dev Can only be called by the governor. Reverts with Unauthorized if the caller is not the owner.
     * @param newPauseGuardian The address of the new market admin pause guardian.
     * Note that there is no enforced zero address check on `newPauseGuadian` as it may be a deliberate choice
     * to assign the zero address in certain scenarios. This design allows flexibility if the zero address
     * is intended to represent a specific state, such as temporarily disabling the pause guadian.
     */
    function setMarketAdminPauseGuardian(address newPauseGuardian) external onlyOwner {
        address oldPauseGuardian = marketAdminPauseGuardian;
        marketAdminPauseGuardian = newPauseGuardian;
        emit SetMarketAdminPauseGuardian(oldPauseGuardian, newPauseGuardian);
    }

    /**
     * @notice Pauses the market admin role.
     * @dev Can only be called by the governor or the market admin pause guardian.
     * Reverts with Unauthorized if the caller is neither.
     */
    function pauseMarketAdmin() external {
        if (marketAdminPaused) revert AlreadyPaused();
        if (msg.sender != owner() && msg.sender != marketAdminPauseGuardian) revert Unauthorized();
        marketAdminPaused = true;
        emit MarketAdminPaused(msg.sender, true);
    }

    /**
     * @notice Unpauses the market admin role.
     * @dev Can only be called by the governor.
     * Reverts with Unauthorized if the caller is not the governor.
     */
    function unpauseMarketAdmin() external onlyOwner {
        if (!marketAdminPaused) revert AlreadyUnPaused();
        marketAdminPaused = false;
        emit MarketAdminPaused(msg.sender, false);
    }

    function checkUpdatePermission(address callerAddress) external view {   // update the msg.sender
        if (callerAddress != marketAdmin) revert Unauthorized();
        if (marketAdminPaused) revert MarketAdminIsPaused();
    }
}
