import { makeMarketAdmin, advanceTimeAndMineBlock } from './market-updates-helper';
import { expect, makeConfigurator, ethers, wait, event } from '../helpers';
import { MarketUpdateProposer__factory } from '../../build/types';

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

  it('MarketUpdateMultisig is set as the marketAdmin of MarketUpdateProposer', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    expect(await marketUpdateProposer.marketAdmin()).to.equal(
      marketUpdateMultiSig.address
    );
  });

  it('only GovernorTimelock can set a new governor for MarketUpdateProposer', async () => {
    const {
      governorTimelock,
      governorTimelockSigner,
      marketUpdateProposer,
    } = await makeMarketAdmin();

    const {
      users: [alice, bob],
    } = await makeConfigurator();

    expect(await marketUpdateProposer.governor()).to.equal(
      governorTimelock.address
    );

    await marketUpdateProposer
      .connect(governorTimelockSigner)
      .setGovernor(alice.address);

    expect(await marketUpdateProposer.governor()).to.equal(alice.address);
    
    await expect(
      marketUpdateProposer.connect(bob).setGovernor(alice.address)
    ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
  });
  
  it('only GovernorTimelock can set a new pause guardian for MarketUpdateProposer', async () => {
    const {
      governorTimelock,
      governorTimelockSigner,
      marketUpdateProposer,
    } = await makeMarketAdmin();

    const {
      users: [alice, bob],
    } = await makeConfigurator();

    expect(await marketUpdateProposer.governor()).to.equal(
      governorTimelock.address
    );

    await marketUpdateProposer
      .connect(governorTimelockSigner)
      .setPauseGuardian(alice.address);

    expect(await marketUpdateProposer.pauseGuardian()).to.equal(alice.address);
    
    await expect(
      marketUpdateProposer.connect(bob).setPauseGuardian(alice.address)
    ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
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

    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, 100]
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
          ['setSupplyKink(address,uint64)'],
          [setSupplyKinkCalldata],
          'Test Proposal'
        )
    );

    // Checks the emitter event properly
    expect(event(txn, 0)).to.be.deep.equal({
      MarketUpdateProposalCreated: {
        id: proposalId,
        proposer: marketUpdateMultiSig.address,
        targets: [configuratorProxy.address],
        signatures: ['setSupplyKink(address,uint64)'],
        calldatas: [setSupplyKinkCalldata],
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
          ['setSupplyKink(address,uint64)'],
          [setSupplyKinkCalldata],
          proposalDescription
        )
    ).to.be.revertedWithCustomError(marketUpdateProposer,'Unauthorized');
  });

  it('keeps track of all the proposals', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const { configuratorProxy, cometProxy } = await makeConfigurator();

    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, 100]
    );

    const proposalId = 1n;
    const proposalDescription = 'Test Proposal';

    // Creates a proposal successfully as the signer is the multisig
    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address],
        [0],
        ['setSupplyKink(address,uint64)'],
        [setSupplyKinkCalldata],
        proposalDescription
      );

    // Checks the proposal
    const proposal = await marketUpdateProposer.getProposal(proposalId);

    expect(proposal.id).to.equal(proposalId);
    expect(proposal.proposer).to.equal(marketUpdateMultiSig.address);
    expect(proposal.targets[0]).to.equal(configuratorProxy.address);
    expect(proposal.signatures[0]).to.equal('setSupplyKink(address,uint64)');
    expect(proposal.calldatas[0]).to.equal(setSupplyKinkCalldata);
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

    const { configuratorProxy, cometProxy } = await makeConfigurator();

    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, 100]
    );

    const proposalId = 1n;
    const proposalDescription = 'Test Proposal';

    // Creates a proposal successfully as the signer is the multisig
    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address],
        [0],
        ['setSupplyKink(address,uint64)'],
        [setSupplyKinkCalldata],
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

    await expect(
      marketUpdateProposer.connect(marketUpdateMultiSig).execute(proposalId)
    ).to.be.revertedWith(
      'MarketUpdateProposer::execute: proposal can only be executed if it is queued'
    );
  });

  it('marks the proposal as expired after grace period', async () => {
    const {
      marketUpdateProposer,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const { configuratorProxy, cometProxy } = await makeConfigurator();

    let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint64'],
      [cometProxy.address, 100]
    );

    const proposalId = 1n;
    const proposalDescription = 'Test Proposal';

    // Creates a proposal successfully as the signer is the multisig
    await marketUpdateProposer
      .connect(marketUpdateMultiSig)
      .propose(
        [configuratorProxy.address],
        [0],
        ['setSupplyKink(address,uint64)'],
        [setSupplyKinkCalldata],
        proposalDescription
      );

    // Get the timelock address from the MarketUpdateProposer contract
    const timelockAddress = await marketUpdateProposer.timelock();

    // Create a contract instance for the timelock using its interface
    const timelockContract = await ethers.getContractAt(
      'ITimelock',
      timelockAddress
    );

    // Now call the delay function from the timelock contract
    const delay = (await timelockContract.delay()).toNumber();

    // Fast forward time by more than the GRACE_PERIOD
    const GRACE_PERIOD = 14 * 24 * 60 * 60; // 14 days in seconds
    await advanceTimeAndMineBlock(GRACE_PERIOD + delay + 1);// Increase by 14 days(GRACE_PERIOD) + timelock delay + 1 second

    expect(await marketUpdateProposer.state(proposalId)).to.equal(3); // Proposal should be expired

    await expect(
      marketUpdateProposer.connect(marketUpdateMultiSig).execute(proposalId)
    ).to.be.revertedWith(
      'MarketUpdateProposer::execute: proposal can only be executed if it is queued'
    );
  });

  describe('MarketUpdateProposer::permissions', function () {
    it('should ensure the addresses are not zero while creating the contract(constructor validation)', async () => {
      const {
        governorTimelock,
        marketUpdateMultiSig,
        marketUpdateTimelock
      } = await makeMarketAdmin();
      
      const marketUpdaterProposerFactory = (await ethers.getContractFactory(
        'MarketUpdateProposer'
      )) as MarketUpdateProposer__factory;
    
      await expect(marketUpdaterProposerFactory
        .deploy(ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero))
        .to.be.revertedWithCustomError(marketUpdaterProposerFactory, 'InvalidAddress');
        
      const marketUpdateProposer = await marketUpdaterProposerFactory
        .deploy(governorTimelock.address, marketUpdateMultiSig.address, marketUpdateTimelock.address);
        
      expect(await marketUpdateProposer.governor()).to.be.equal(governorTimelock.address);
      expect(await marketUpdateProposer.marketAdmin()).to.be.equal(marketUpdateMultiSig.address);
      expect(await marketUpdateProposer.timelock()).to.be.equal(marketUpdateTimelock.address);
      
    });

    it('only governor can update a governor', async () => {
      // include checks for pauseGuardian, marketAdmin, and nonGovernor for failure scenario
      const {
        governorTimelockSigner,
        marketUpdateProposer,
        marketUpdateMultiSig
      } = await makeMarketAdmin();
  
      const {
        users: [alice, bob, john],
      } = await makeConfigurator();
  
      // Ensure only the governor can set a new governor
      await marketUpdateProposer
        .connect(governorTimelockSigner)
        .setGovernor(alice.address);
  
      expect(await marketUpdateProposer.governor()).to.equal(alice.address);
  
      // failure case: market admin cannot update the governor
      await expect(
        marketUpdateProposer.connect(marketUpdateMultiSig).setGovernor(alice.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // failure case: pause guardian cannot update the governor
      await marketUpdateProposer.connect(alice).setPauseGuardian(john.address);  // alice is the new governor by the above governor call
      expect(await marketUpdateProposer.pauseGuardian()).to.be.equal(
        john.address
      );
      await expect(
        marketUpdateProposer.connect(john).setGovernor(alice.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // failure case: Non-governor cannot update the governor
      await expect(
        marketUpdateProposer.connect(bob).setGovernor(alice.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
    });
    it('only governor can update a marketAdmin', async () => {
      // include checks for pauseGuardian, marketAdmin, and nonGovernor for failure scenario
      const {
        governorTimelockSigner,
        marketUpdateProposer,
        marketUpdateMultiSig
      } = await makeMarketAdmin();
  
      const {
        users: [alice, bob, john],
      } = await makeConfigurator();
  
      // Ensure only the governor can set a new governor
      await marketUpdateProposer
        .connect(governorTimelockSigner)
        .setMarketAdmin(alice.address);
  
      expect(await marketUpdateProposer.marketAdmin()).to.equal(alice.address);
  
      // failure case: market admin cannot update the market admin
      await expect(
        marketUpdateProposer.connect(marketUpdateMultiSig).setMarketAdmin(alice.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // failure case: pause guardian cannot update the market admin
      await marketUpdateProposer.connect(governorTimelockSigner).setPauseGuardian(john.address); 
      expect(await marketUpdateProposer.pauseGuardian()).to.be.equal(
        john.address
      );
      await expect(
        marketUpdateProposer.connect(john).setMarketAdmin(alice.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // failure case: Non-governor cannot update the market admin
      await expect(
        marketUpdateProposer.connect(bob).setGovernor(alice.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
    });
    it('only governor can update a pauseGuardian', async () => {
      // include checks for pauseGuardian, marketAdmin, and nonGovernor for failure scenario
      const {
        governorTimelockSigner,
        marketUpdateProposer,
        marketUpdateMultiSig
      } = await makeMarketAdmin();
  
      const {
        users: [alice, bob, john],
      } = await makeConfigurator();
  
      // Ensure only the governor can set a new governor
      await marketUpdateProposer
        .connect(governorTimelockSigner)
        .setPauseGuardian(alice.address);
  
      expect(await marketUpdateProposer.pauseGuardian()).to.equal(alice.address);
  
      // failure case: market admin cannot update the pause guardian
      await expect(
        marketUpdateProposer.connect(marketUpdateMultiSig).setPauseGuardian(bob.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // failure case: pause guardian cannot update the pause guardian
      // alice is the pause guardian by the above governor call
      await expect(
        marketUpdateProposer.connect(alice).setPauseGuardian(bob.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // failure case: Non-governor cannot update the pause guardian
      await expect(
        marketUpdateProposer.connect(john).setGovernor(alice.address)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
    });

    it('only marketAdmin can create a proposal', async () => {
      // include checks for pauseGuardian, and governor, and anonymous address
      const {
        governorTimelockSigner,
        marketUpdateProposer,
        marketUpdateMultiSig,
      } = await makeMarketAdmin();
  
      const { configuratorProxy, cometProxy, users: [alice, bob] } = await makeConfigurator();
      
      expect(await marketUpdateProposer.marketAdmin()).to.be.equal(
        marketUpdateMultiSig.address
      );
  
      let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint64'],
        [cometProxy.address, 100]
      );
  
      const proposalDescription = 'Test Proposal';
  
      // only MarketAdmin can create a proposal
      await marketUpdateProposer
        .connect(marketUpdateMultiSig)
        .propose(
          [configuratorProxy.address],
          [0],
          ['setSupplyKink(address,uint64)'],
          [setSupplyKinkCalldata],
          proposalDescription
        );
  
      // Failure case: Governor cannot create a proposal
      await expect(
        marketUpdateProposer
          .connect(governorTimelockSigner)
          .propose(
            [configuratorProxy.address],
            [0],
            ['setSupplyKink(address,uint64)'],
            [setSupplyKinkCalldata],
            proposalDescription
          )
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // Failure case: Pause guardian cannot create a proposal
      await marketUpdateProposer.connect(governorTimelockSigner).setPauseGuardian(alice.address); 
      expect(await marketUpdateProposer.pauseGuardian()).to.be.equal(
        alice.address
      );
      await expect(
        marketUpdateProposer
          .connect(alice)
          .propose(
            [configuratorProxy.address],
            [0],
            ['setSupplyKink(address,uint64)'],
            [setSupplyKinkCalldata],
            proposalDescription
          )
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
      
      // Failure case: anonymous cannot create a proposal
      await expect(
        marketUpdateProposer
          .connect(bob)
          .propose(
            [configuratorProxy.address],
            [0],
            ['setSupplyKink(address,uint64)'],
            [setSupplyKinkCalldata],
            proposalDescription
          )
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized');
    });

    it('only marketAdmin can execute a proposal', async () => {
      // include checks for pauseGuardian, marketAdmin, and governor, and anonymous address
      const {
        governorTimelockSigner,
        marketUpdateProposer,
        marketUpdateMultiSig,
        marketUpdateTimelock
      } = await makeMarketAdmin();

      const {
        configuratorProxy,
        configurator,
        cometProxy,
        users: [alice, bob],
      } = await makeConfigurator(
        {governor: governorTimelockSigner}
      );
      
      expect(await marketUpdateProposer.marketAdmin()).to.be.equal(
        marketUpdateMultiSig.address
      );
  
      let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint64'],
        [cometProxy.address, 100]
      );
  
      const proposalDescription = 'Test Proposal';
  
      // only MarketAdmin can create a proposal
      await marketUpdateProposer
        .connect(marketUpdateMultiSig)
        .propose(
          [configuratorProxy.address],
          [0],
          ['setSupplyKink(address,uint64)'],
          [setSupplyKinkCalldata],
          proposalDescription
        );
        
      const delay = (await marketUpdateTimelock.delay()).toNumber(); // Example: 172800 for 2 days
      // Fast-forward time by delay + few seconds to surpass the eta
      await advanceTimeAndMineBlock(delay);

      // Failure case: Governor cannot execute the proposal
      await expect(
        marketUpdateProposer.connect(governorTimelockSigner).execute(1)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized'); 
      
      // Failure case: Pause guardian cannot execute the proposal
      await marketUpdateProposer.connect(governorTimelockSigner).setPauseGuardian(alice.address); 
      expect(await marketUpdateProposer.pauseGuardian()).to.be.equal(
        alice.address
      );
      await expect(
        marketUpdateProposer.connect(alice).execute(1)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized'); 
      
      // Failure case: anonymous cannot execute the proposal
      await expect(
        marketUpdateProposer.connect(bob).execute(1)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized'); 
      
      // Success case: only MarketAdmin can execute the proposal
      const configuratorAsProxy = configurator.attach(configuratorProxy.address);
      await configuratorAsProxy.connect(governorTimelockSigner).setMarketAdmin(marketUpdateTimelock.address);
      expect (await configuratorAsProxy.marketAdmin()).to.be.equal(marketUpdateTimelock.address);
      await marketUpdateProposer.connect(marketUpdateMultiSig).execute(1);
    });
    
    it('only marketAdmin, pauseGuardian, or governor can cancel a proposal', async () => {
      // include checks for pauseGuardian, marketAdmin, and governor, and anonymous address
      const {
        governorTimelockSigner,
        marketUpdateProposer,
        marketUpdateMultiSig,
      } = await makeMarketAdmin();
  
      const { configuratorProxy, cometProxy, users: [alice, bob] } = await makeConfigurator();
      
      expect(await marketUpdateProposer.marketAdmin()).to.be.equal(
        marketUpdateMultiSig.address
      );
  
      let setSupplyKinkCalldata = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint64'],
        [cometProxy.address, 100]
      );
  
      const proposalDescription = 'Test Proposal';
  
      // only MarketAdmin can create a proposal
      await marketUpdateProposer
        .connect(marketUpdateMultiSig)
        .propose(
          [configuratorProxy.address],
          [0],
          ['setSupplyKink(address,uint64)'],
          [setSupplyKinkCalldata],
          proposalDescription
        );

      // Success case: Governor can cancel the proposal
      expect(await marketUpdateProposer.connect(governorTimelockSigner).cancel(1)); 
      
      // Success case: MarketAdmin can cancel the proposal
      await marketUpdateProposer.connect(marketUpdateMultiSig).cancel(1);
      
      // Success case: Pause guardian can cancel the proposal
      await marketUpdateProposer.connect(governorTimelockSigner).setPauseGuardian(alice.address); 
      expect(await marketUpdateProposer.pauseGuardian()).to.be.equal(
        alice.address
      );
      expect(await marketUpdateProposer.connect(alice).cancel(1)); 
      
      // Failure case: anonymous cannot cancel the proposal
      await expect(
        marketUpdateProposer.connect(bob).cancel(1)
      ).to.be.revertedWithCustomError(marketUpdateProposer, 'Unauthorized'); 
      
    });
  });
});
