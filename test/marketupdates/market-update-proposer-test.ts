import { makeMarketAdmin } from './market-updates-helper';
import { expect, makeConfigurator, ethers, wait, event } from '../helpers';

describe('MarketUpdateProposer', function() {
  // We are not checking market updates here. we are just checking interaction
  // between MarketUpdateMultisig and MarketUpdateProposer or checking interactions
  // on MarketUpdateProposer
  it('is initialized properly with timelock', async () => {
    const {
      marketUpdateProposer,
      marketUpdateTimelock,
    } = await makeMarketAdmin();

    expect(await marketUpdateProposer.timelock()).to.equal(
      marketUpdateTimelock.address
    );
  });

  it('revert if timelock is not initialized', async () => {}); // Skipped for now

  it('throw error if MarketUpdateProposer is initialized twice', async () => {
    const {
      marketUpdateProposer,
      marketUpdateTimelock,
    } = await makeMarketAdmin();

    await expect(
      marketUpdateProposer.initialize(marketUpdateTimelock.address)
    ).to.be.revertedWithCustomError(marketUpdateProposer, 'AlreadyInitialized');
  });

  it('MarketUpdateMultisig is set as the owner of MarketUpdateProposer', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    expect(await marketUpdateProposer.owner()).to.equal(
      marketUpdateMultiSig.address
    );
  });

  it('MarketUpdateMultisig can set a new owner for MarketUpdateProposer', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const {
      users: [alice],
    } = await makeConfigurator();

    expect(await marketUpdateProposer.owner()).to.equal(
      marketUpdateMultiSig.address
    );

    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .transferOwnership(alice.address);

    expect(await marketUpdateProposer.owner()).to.equal(alice.address);
  });

  it('only allows MarketUpdateMultisig to create proposal', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const {
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    const proposalId = 1n;
    const proposalDescription = 'Test Proposal';

    // Creates a proposal successfully as the signer is the multisig
    const txn = await wait(
      marketUpdateProposer
        .connect(marketUpdateMultiSig)
        .propose(
          [configuratorProxy.address],
          [0],
          ['setPauseGuardian(address,address)'],
          [setPauseGuardianCalldata],
          'Test Proposal'
        )
    );

    // Checks the emitter event properly
    expect(event(txn, 0)).to.be.deep.equal({
      MarketUpdateProposalCreated: {
        id: proposalId,
        proposer: marketUpdateMultiSig.address,
        targets: [configuratorProxy.address],
        signatures: ['setPauseGuardian(address,address)'],
        calldatas: [setPauseGuardianCalldata],
        description: proposalDescription,
      },
    });

    // this will fail because the signer is not the multisig
    await expect(
      marketUpdateProposer
        .connect(alice)
        .propose(
          [configuratorProxy.address],
          [0],
          ['setPauseGuardian(address,address)'],
          [setPauseGuardianCalldata],
          proposalDescription
        )
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('keeps track of all the proposals', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const {
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    const proposalId = 1n;
    const proposalDescription = 'Test Proposal';

    // Creates a proposal successfully as the signer is the multisig
    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address],
        [0],
        ['setPauseGuardian(address,address)'],
        [setPauseGuardianCalldata],
        proposalDescription
      );

    // Checks the proposal
    const proposal = await marketUpdateProposer.getProposal(proposalId);

    expect(proposal.id).to.equal(proposalId);
    expect(proposal.proposer).to.equal(marketUpdateMultiSig.address);
    expect(proposal.targets[0]).to.equal(configuratorProxy.address);
    expect(proposal.signatures[0]).to.equal(
      'setPauseGuardian(address,address)'
    );
    expect(proposal.calldatas[0]).to.equal(setPauseGuardianCalldata);
    expect(proposal.description).to.equal(proposalDescription);
  });

  it('can cancel the proposal', async () => {
    // Create a proposal
    // Cancel the proposal
    // Check if the proposal is cancelled
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const {
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    const proposalId = 1n;
    const proposalDescription = 'Test Proposal';

    // Creates a proposal successfully as the signer is the multisig
    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address],
        [0],
        ['setPauseGuardian(address,address)'],
        [setPauseGuardianCalldata],
        proposalDescription
      );

    expect(
      (await marketUpdateProposer.proposals(proposalId)).canceled
    ).to.be.equal(false);

    // Cancel the proposal
    await marketUpdateProposer.connect(marketUpdateMultiSig).cancel(proposalId);

    expect(
      (await marketUpdateProposer.proposals(proposalId)).canceled
    ).to.be.equal(true);
  });

  it('marks the proposal as expired after grace period', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const {
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxy.address, alice.address]
    );

    const proposalId = 1n;
    const proposalDescription = 'Test Proposal';

    // Creates a proposal successfully as the signer is the multisig
    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address],
        [0],
        ['setPauseGuardian(address,address)'],
        [setPauseGuardianCalldata],
        proposalDescription
      );

    // Fast forward time by more than the GRACE_PERIOD
    const GRACE_PERIOD = 14 * 24 * 60 * 60; // 14 days in seconds
    await ethers.provider.send('evm_increaseTime', [GRACE_PERIOD + 1]); // Increase by 14 days + 1 second
    await ethers.provider.send('evm_mine', []); // Mine the next block to apply the time increase

    expect(await marketUpdateProposer.state(proposalId)).to.equal(3); // Proposal should be expired
  });
});
