import { makeMarketAdmin } from './market-updates-helper';
import { expect } from '../helpers';

describe('MarketUpdateProposer', function() {
  // We are not checking market updates here. we are just checking interaction
  // between MarketUpdateMultisig and MarketUpdateProposer or checking interactions
  // on MarketUpdateProposer
  it('is initialized properly with timelock', async () => {
    const {
      marketUpdateProposer,
      marketUpdateTimelock
    } = await makeMarketAdmin();

    expect(await marketUpdateProposer.timelock()).to.equal(
      marketUpdateTimelock.address
    );
  });

  it('revert if timelock is not initialized', async () => {});

  it('MarketUpdateMultisig is set as the owner of MarketUpdateProposer', async () => {});

  it('MarketUpdateMultisig can set a new owner for MarketUpdateProposer', async () => {});

  it('only allows MarketUpdateMultisig to create proposal', async () => {});

  it('keeps track of all the proposals', async () => {});

  it('keeps track of all the proposals', async () => {});

  it('can cancel the proposal', async () => {
    // Create a proposal
    // Cancel the proposal
    // Check if the proposal is cancelled
  });

  it('marks the proposal as expired after grace period', () => {});
});

