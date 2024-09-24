# Script Development Checklist

## 1. Deployment of Contracts
- [x] Write a script to deploy the necessary contracts.
- [x] Verify correct contract addresses and parameters post-deployment.

## 2. First Proposal - Governor Bravo (Update Proxy Admins and Market Admins)
- [ ] Write a script for the first proposal through Governor Bravo.
- [ ] Update the proxy admins and market admins via the proposal.
- [ ] Test and simulate the proposal execution.

## 3. Second Proposal - Governor Bravo (Update Supply Kink, Deploy Comet, Upgrade Proxy)
- [ ] Write a script for the second proposal to update the supply kink.
- [ ] Simulate the execution of this proposal and test its outcome.

## 4. Fourth Proposal - MarketUpdateProposer (Update Supply Kink, Deploy Comet, Upgrade Proxy)
- [ ] Write a script for the fourth proposal using `marketUpdateProposer`.
- [ ] Verify that the proposal execution is correct and works as intended.

---

# Mainnet Fork Simulation and Execution Process Checklist

## 1. Fork Ethereum Mainnet and Set Up Environment
- [ ] Fork the Ethereum mainnet using appropriate tools (e.g., Foundry/Forge).

## 2. Verification of Execution on Mainnet Fork
- [ ] Simulate the execution of the proposal on the mainnet fork.
- [ ] Validate the correctness of the proposal’s execution steps.

## 3. Voting and Address Impersonation
- [ ] Impersonate necessary addresses to simulate the voting process.
- [ ] Cast votes to ensure the proposal meets the required quorum and majority thresholds.

## 4. Virtual Machine Adjustments and Time Lapses
- [ ] Adjust the VM settings to simulate time lapses (voting periods, timelocks).
- [ ] Ensure that the lifecycle of the proposal is accurately reflected with proper time intervals.

## 5. Proposal Execution and Deployment Simulation
- [ ] Simulate the execution of the proposal once time-lapse is complete.

## 6. Updates via Governor Bravo
- [ ] Verify that the updates via the Governor Bravo function correctly.

## 6. Updates via Market Admin Role
- [ ] Verify that the updates via the market admin role function correctly.


