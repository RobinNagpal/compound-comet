// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./SafeMath.sol";

contract MarketAdminTimelock {
    using SafeMath for uint;

    event NewAdmin(address indexed oldAdmin, address indexed newAdmin);
    event NewMarketAdmin(address indexed oldMarketAdmin, address indexed newMarketAdmin);
    event NewDelay(uint indexed newDelay);
    event CancelTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature,  bytes data, uint eta);
    event ExecuteTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature,  bytes data, uint eta);
    event QueueTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);
    event MarketUpdateProposalExecuted(MarketUpdateProposal proposal);

    uint public constant GRACE_PERIOD = 14 days;
    uint public constant MINIMUM_DELAY = 0 days;
    uint public constant MAXIMUM_DELAY = 0 days;

    address public admin;
    address public marketAdmin;
    uint public delay;

    mapping (bytes32 => bool) public queuedTransactions;

    struct MarketUpdateProposal {
        /// @notice Unique id for looking up a proposal
        uint id;

        /// @notice the ordered list of target addresses for calls to be made
        address[] targets;

        /// @notice The ordered list of values (i.e. msg.value) to be passed to the calls to be made
        uint[] values;

        /// @notice The ordered list of function signatures to be called
        string[] signatures;

        /// @notice The ordered list of calldata to be passed to each call
        bytes[] calldatas;

        string description;
    }


    constructor(address admin_, uint delay_) public {
        require(delay_ >= MINIMUM_DELAY, "Timelock::constructor: Delay must exceed minimum delay.");
        require(delay_ <= MAXIMUM_DELAY, "Timelock::setDelay: Delay must not exceed maximum delay.");

        admin = admin_;
        delay = delay_;
    }

    fallback() external payable { }

    modifier adminOrMarketAdmin {
        require(msg.sender == admin || msg.sender == marketAdmin, "Unauthorized: call must come from admin or marketAdmin");
        _;
    }

    function setDelay(uint delay_) public {
        require(msg.sender == address(this), "Timelock::setDelay: Call must come from Timelock.");
        require(delay_ >= MINIMUM_DELAY, "Timelock::setDelay: Delay must exceed minimum delay.");
        require(delay_ <= MAXIMUM_DELAY, "Timelock::setDelay: Delay must not exceed maximum delay.");
        delay = delay_;

        emit NewDelay(delay);
    }

    function setAdmin(address newAdmin) public {
        require(msg.sender == admin, "Timelock::setAdmin: Call must come from admin.");
        address oldAdmin = admin;
        admin = newAdmin;
        emit NewAdmin(oldAdmin, newAdmin);
    }

    function setMarketAdmin(address newMarketAdmin) external {
        require(msg.sender == admin, "Timelock::setMarketAdmin: Call must come from admin.");
        address oldMarketAdmin = marketAdmin;
        marketAdmin = newMarketAdmin;
        emit NewMarketAdmin(oldMarketAdmin, newMarketAdmin);
    }

    function queueTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) public adminOrMarketAdmin returns (bytes32) {
        require(eta >= getBlockTimestamp().add(delay), "Timelock::queueTransaction: Estimated execution block must satisfy delay.");

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = true;

        emit QueueTransaction(txHash, target, value, signature, data, eta);
        return txHash;
    }

    function cancelTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) public adminOrMarketAdmin{
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = false;

        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }

    function executeTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) public payable adminOrMarketAdmin returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        require(queuedTransactions[txHash], "Timelock::executeTransaction: Transaction hasn't been queued.");
        require(getBlockTimestamp() >= eta, "Timelock::executeTransaction: Transaction hasn't surpassed time lock.");
        require(getBlockTimestamp() <= eta.add(GRACE_PERIOD), "Timelock::executeTransaction: Transaction is stale.");

        queuedTransactions[txHash] = false;

        bytes memory callData;

        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "Timelock::executeTransaction: Transaction execution reverted.");

        emit ExecuteTransaction(txHash, target, value, signature, data, eta);

        return returnData;
    }

    function executeProposal(MarketUpdateProposal memory proposal, uint eta) public payable adminOrMarketAdmin {
        require(getBlockTimestamp() >= eta, "Timelock::executeProposal: Transaction hasn't surpassed time lock.");
        for (uint i = 0; i < proposal.targets.length; i++) {
            executeTransaction(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], eta);
        }
        emit MarketUpdateProposalExecuted(proposal);
    }

    function getBlockTimestamp() internal view returns (uint) {
        // solium-disable-next-line security/no-block-members
        return block.timestamp;
    }
}
