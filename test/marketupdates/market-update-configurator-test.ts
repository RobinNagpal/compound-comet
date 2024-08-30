import { expect, makeConfigurator } from './../helpers';
import { makeMarketAdmin } from './market-updates-helper';

describe('Configurator', function() {

  it('already initialized and is not able to initialize again with main-governor-timelock as admin', async () => {
    const {
      governorTimelockSigner,
      governorTimelock
    } = await makeMarketAdmin();

    const { configurator, configuratorProxy } = await makeConfigurator({
      governor: governorTimelockSigner
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    // check already initialized properly
    expect(await configuratorAsProxy.version()).to.be.equal(1);
    expect(await configuratorAsProxy.governor()).to.be.equal(governorTimelock.address);

    // check is not able to initialize again
    await expect(
      configuratorAsProxy.initialize(governorTimelock.address)
    ).to.be.revertedWith("custom error 'AlreadyInitialized()'");
  });

  it('only main-governor-timelock can set market admin', async () => {});

  it('market admin cannot set or update market admin', async () => {});

  it('only main-governor-timelock can set or update marketAdminPauseGuardian', async () => {});

  it('main-governor-timelock or marketAdminPauseGuardian can pause market admin', async () => {});

  it('main-governor-timelock can unpause market admin', async () => {});

  it('marketAdminPauseGuardian cannot unpause market admin', async () => {});

  it('only main-governor-timelock or market admain can call market update functions', async () => {});

  it('market admain cannot call NON market update functions', async () => {});

  it('market admain cannot call market update functions when marketAdminPaused', async () => {});

  it('main-governor-timelock can call market update functions when marketAdminPause', async () => {});

  it('governor cannot be updated by market admin', async () => {});
});
