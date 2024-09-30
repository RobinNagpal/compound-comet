# Work

### Pairing tasks
Now 
- [ ] Populate addresses in the MarketUpdateAddresses
- [ ] Complete the code of the deployment library

After
- [ ] Move the governor code into a library
- [ ] Create a test for mainnet fork
- [ ] Create a test for all the chains

### Current Understanding
- We can't have vm.roll in scripts. It will work for simulation phase, but when the script runs, it will fail. Simulation
phase is visible when we run it with `-vvvv` flag.


### Open Questions
- Is there a way to just simulate the script and not run it? `--skip-simulation` flag 

### Checklist
- [ ] Create a file which has list of all the addresses needed for deployment proposals for all the chains. 
We can use a common struct like MarketUpdateAddresses and use it for all the chains. This should have addresses
for the old and new contracts.
- [ ] Create a Contract/Library which will have the code to create deployment proposal based on these addresses.
- [ ] Create a Contract/Library which has util functions for working with Governor Bravo i.e. timelapses and voting
- [ ] Create a Contract/Library which have the code to update the supply kink as Governor Bravo and Market Admin.
This can then be used to creating and simulation of the proposal for each chain.
- [ ] Verify that the proposal execution is correct and works as intended.

###### Open Questions
- What is the best way to create util functions?
  -  
- What is the best way to capture addresses for each chain in `MarketUpdateAddresses`. As a map? or something else?
  - We want to be able to retrieve it based on chain name/id
- How to write a test which runs on the fork of each chain and verifies the proposal execution?
  - A proper fork will make sure the addresses match to the ones captured in `MarketUpdateAddresses`
- How do we test the bridge part

### Real Deployment Checklist
- [ ] Deploy the new contracts on all the chains.
- [ ] Create proposals for one chain which ever we want to release first.
- [ ] Create proposals for second chain which ever we want to release second.
- [ ] Create a single proposal for all the remaining chains.



