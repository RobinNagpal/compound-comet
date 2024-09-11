// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "./../ITimelock.sol";
import "./../vendor/access/Ownable.sol";

/**
* @title MarketUpdateProposer
* @notice This contract allows for the creation of proposals that can be executed by the timelock
* @dev This contract is used to propose market updates
* Here owner will be the market update multi-sig. The owner can set the new owner by calling `transferOwnership`.
* If multi-sig is compromised, the new owner will only be able to call timelock. marketUpdatePauseGuardian in
* Configurator or CometProxyAdmin can pause these updated.
*
* Other logic can be that only main-governor-timelock can update the owner of this contract, but that logic can be an
* overkill
*
*/
contract MarketUpdateProposer is Ownable {
    struct MarketUpdateProposal {
        /// @notice Unique id for looking up a proposal
        uint id;

        /// @notice Creator of the proposal
        address proposer;

        /// @notice The timestamp that the proposal will be available for execution, set once the vote succeeds
        uint eta;

        /// @notice the ordered list of target addresses for calls to be made
        address[] targets;

        /// @notice The ordered list of values (i.e. msg.value) to be passed to the calls to be made
        uint[] values;

        /// @notice The ordered list of function signatures to be called
        string[] signatures;

        /// @notice The ordered list of calldata to be passed to each call
        bytes[] calldatas;

        string description;

        /// @notice Flag marking whether the proposal has been canceled
        bool canceled;

        /// @notice Flag marking whether the proposal has been executed
        bool executed;
    }

    enum ProposalState {
        Canceled,
        Queued,
        Executed,
        Expired
    }

    ITimelock public timelock;

    /// @notice The official record of all proposals ever proposed
    mapping(uint => MarketUpdateProposal) public proposals;
    /// @notice The total number of proposals
    uint public proposalCount;

    /// @notice Initial proposal id set at become
    uint public initialProposalId;

    /// @notice An event emitted when a new proposal is created
    event MarketUpdateProposalCreated(uint id, address proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, string description);
    event MarketUpdateProposalExecuted(uint id);
    event MarketUpdateProposalCancelled(uint id);

    error AlreadyInitialized();
    error InvalidAddress();


    function initialize(ITimelock timelock_) public onlyOwner {
        if (address(timelock_) == address(0)) revert InvalidAddress();
        if (address(timelock) != address(0)) revert AlreadyInitialized();

        timelock = timelock_;
    }

    function propose(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) public onlyOwner returns (uint) {
        require(targets.length == values.length && targets.length == signatures.length && targets.length == calldatas.length, "MarketUpdateProposer::propose: proposal function information arity mismatch");
        require(targets.length != 0, "MarketUpdateProposer::propose: must provide actions");

        proposalCount++;
        uint newProposalID = proposalCount;
        MarketUpdateProposal storage newProposal = proposals[newProposalID];

        require(newProposal.id == 0, "MarketUpdateProposer::propose: ProposalID collision");
        uint eta = add256(block.timestamp, timelock.delay());
        newProposal.id = newProposalID;
        newProposal.proposer = msg.sender;
        newProposal.eta = eta;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.signatures = signatures;
        newProposal.calldatas = calldatas;
        newProposal.description = description;
        newProposal.canceled = false;
        newProposal.executed = false;

        proposals[newProposal.id] = newProposal;

        emit MarketUpdateProposalCreated(newProposal.id, msg.sender, targets, values, signatures, calldatas, description);

        for (uint i = 0; i < newProposal.targets.length; i++) {
            queueOrRevertInternal(newProposal.targets[i], newProposal.values[i], newProposal.signatures[i], newProposal.calldatas[i], eta);
        }

        return newProposal.id;

    }

    function queueOrRevertInternal(address target, uint value, string memory signature, bytes memory data, uint eta) internal {
        require(!timelock.queuedTransactions(keccak256(abi.encode(target, value, signature, data, eta))), "MarketUpdateProposer::queueOrRevertInternal: identical proposal action already queued at eta");
        timelock.queueTransaction(target, value, signature, data, eta);
    }

    /**
      * @notice Executes a queued proposal if eta has passed
      * @param proposalId The id of the proposal to execute
      */
    function execute(uint proposalId) external payable onlyOwner {
        require(state(proposalId) == ProposalState.Queued, "MarketUpdateProposer::execute: proposal can only be executed if it is queued");
        MarketUpdateProposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        for (uint i = 0; i < proposal.targets.length; i++) {
            timelock.executeTransaction{value: proposal.values[i]}(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        }
        emit MarketUpdateProposalExecuted(proposalId);
    }

    /**
      * @notice Cancels a proposal only if sender is the proposer, or proposer delegates dropped below proposal threshold
      * @param proposalId The id of the proposal to cancel
      */
    function cancel(uint proposalId) external onlyOwner {
        require(state(proposalId) != ProposalState.Executed, "MarketUpdateProposer::cancel: cannot cancel executed proposal");

        MarketUpdateProposal storage proposal = proposals[proposalId];

        proposal.canceled = true;
        for (uint i = 0; i < proposal.targets.length; i++) {
            timelock.cancelTransaction(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        }

        emit MarketUpdateProposalCancelled(proposalId);
    }

    function state(uint proposalId) public view returns (ProposalState) {
        require(proposalCount >= proposalId && proposalId > initialProposalId, "MarketUpdateProposer::state: invalid proposal id");
        MarketUpdateProposal storage proposal = proposals[proposalId];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.timestamp >= add256(proposal.eta, timelock.GRACE_PERIOD())) {
            return ProposalState.Expired;
        } else {
            return ProposalState.Queued;
        }
    }

    function add256(uint256 a, uint256 b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "addition overflow");
        return c;
    }

    function getProposal(uint proposalId) public view
    returns (
        uint id,
        address proposer,
        uint eta,
        address[] memory targets,
        uint[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description,
        bool canceled,
        bool executed
            )
        {
            MarketUpdateProposal storage proposal = proposals[proposalId];
            return (
                proposal.id,
                proposal.proposer,
                proposal.eta,
                proposal.targets,
                proposal.values,
                proposal.signatures,
                proposal.calldatas,
                proposal.description,
                proposal.canceled,
                proposal.executed
            );
        }
}
