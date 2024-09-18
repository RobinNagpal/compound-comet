// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title A simple multisig wallet
/// @author Cesare Valitutto - czar0
/// @notice This contract accept one or more addresses to be set as `owners` during deployment and a number of `required` approvals for a submitted transaction to be executed
/// An example of transaction flow is the following:
/// > owners.length = 2 -- owners[0] = 0xAAA , owners[1] = 0xBBB | required = 2 (meaning, 2-of-2 approval required fro both the owners)
/// > someone deposits funds into the contract (let's say 5 ETH)
/// > 0xAAA submits a transaction to send 1 ETH to 0xCCC (with message "gm") -> submit(to: 0xCCC, value: 1000000000000000000, data: 0x68656c6c6f) -> event Submit(txId: 0)
/// > 0xAAA approves the transaction -> approve(txId: 0) -> event Approve(owner: 0xAAA, txId: 0)
/// > 0xBBB approves the transaction -> approve(txId: 0) -> event Approve(owner: 0xBBB, txId: 0)
/// > 0xAAA (or 0xBBB) executes the transaction -> execute(txId: 0) -> event Execute(txId: 0)
/// > 0xCCC receives 1 ETH from the multisig wallet with message "gm"
/// This code was written following the official solidity style guidance available at https://docs.soliditylang.org/en/v0.8.17/style-guide.html
/// @dev This contract can be extended to manage transaction by type and adding a more granular access control mechanism
/// Keep in mind that the policy `required` as well as the `owner` cannot be changed after deployment
/// @custom:playground This is a playground contract!
contract MultiSigWallet {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;
    mapping(uint256 => mapping(address => bool)) public approved;
    uint256 public constant MAX_DURATION = 30 days;

    struct Transaction {
        address to;
        uint256 value;
        uint256 expireAt;
        bytes data;
        bool executed;
    }

    Transaction[] public transactions;

    event Deposit(address indexed sender, uint256 amount);
    event Submit(uint256 indexed txId);
    event Approve(address indexed owner, uint256 indexed txId);
    event Revoke(address indexed owner, uint256 indexed txId);
    event Execute(uint256 indexed txId);

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < transactions.length, "tx not exist");
        _;
    }

    modifier notApproved(uint256 txId) {
        require(!approved[txId][msg.sender], "tx already approved");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "tx already executed");
        _;
    }

    modifier notExpired(uint256 txId) {
        require(transactions[txId].expireAt > block.timestamp, "tx expired");
        _;
    }

    constructor(address[] memory owners_, uint256 required_) {
        require(owners_.length > 0, "owners required");
        require(required_ > 0 && required_ <= owners_.length, "invalid required number of owners");

        for (uint256 i; i < owners_.length; i++) {
            address owner = owners_[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = required_;
    }

    /// @notice Receive ethers at this address and emit a Deposit event with the sender address and the amount sent
    /// @dev Ensure the contract has always enough balance to execute a transaction
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Submit a transaction to be approved and emit Submit event with the current transaction id
    /// @param to the recipient address of the transaction
    /// @param value the amount to send to the recipient
    /// @param expireAt expiration time up until the transaction is valid
    /// @param data any additional data to be sent to the recipient (e.g. a message)
    /// @dev the `onlyOwner` modifier can be replaced by a more granular access control function
    /// the transaction id count starts from 0 and it is incremented for every new submitted transaction
    function submit(address to, uint256 value, uint256 expireAt, bytes calldata data) external onlyOwner {
        require(expireAt > block.timestamp && expireAt <= block.timestamp + MAX_DURATION, "tx expiration invalid");
        transactions.push(Transaction({to: to, value: value, expireAt: expireAt, data: data, executed: false}));

        emit Submit(transactions.length - 1);
    }

    /// @notice Approve a previously submitted transaction and emit Approve event with the sender address and the transaction id
    /// @param txId the id of the transaction to be approved
    /// @dev the approver should have not approved the transaction and this transaction should not have `executed` flat set to true
    function approve(uint256 txId)
        external
        onlyOwner
        txExists(txId)
        notApproved(txId)
        notExecuted(txId)
        notExpired(txId)
    {
        approved[txId][msg.sender] = true;

        emit Approve(msg.sender, txId);
    }

    /// @notice Revoke the approval for a previously submitted transaction and emit Revoke event with the sender address and the transaction id
    /// @param txId the id of the transaction to be revoked
    /// @dev the caller should have approved the transaction before revoking the approval and the transaction should not have `executed` flat set to true
    function revoke(uint256 txId) external onlyOwner txExists(txId) notExecuted(txId) notExpired(txId) {
        require(approved[txId][msg.sender], "tx not approved");
        approved[txId][msg.sender] = false;

        emit Revoke(msg.sender, txId);
    }

    /// @notice Return the number of approvals for a specific transaction
    /// @param txId the id of the transaction to count approvals on
    /// @dev if required this function can be set with public or external visibility without affecting the security of the contract
    /// @return count the total approvals count
    function _getApprovalCount(uint256 txId) private view returns (uint256 count) {
        for (uint256 i; i < owners.length; i++) {
            address owner = owners[i];
            if (approved[txId][owner]) {
                count += 1;
            }
        }
    }

    /// @notice Execute a transaction which has received sufficient approvals and emit Execute event with the transaction id
    /// @param txId the id of the transaction to be executed
    function execute(uint256 txId) external txExists(txId) notExecuted(txId) notExpired(txId) {
        require(_getApprovalCount(txId) >= required, "not enough approvals");
        Transaction storage transaction = transactions[txId];
        require(address(this).balance >= transaction.value, "not enough balance");

        transaction.executed = true;
        (bool success,) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "transfer failed");

        emit Execute(txId);
    }
}