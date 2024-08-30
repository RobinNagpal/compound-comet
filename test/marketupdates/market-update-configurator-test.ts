import { expect, makeConfigurator, event, wait } from './../helpers';
import { makeMarketAdmin } from './market-updates-helper';

describe('Configurator', function() {
  it('already initialized and is not able to initialize again with main-governor-timelock as admin', async () => {
    const {
      governorTimelockSigner,
      governorTimelock,
    } = await makeMarketAdmin();

    const { configurator, configuratorProxy } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    // check already initialized properly
    expect(await configuratorAsProxy.version()).to.be.equal(1);
    expect(await configuratorAsProxy.governor()).to.be.equal(
      governorTimelock.address
    );

    // check is not able to initialize again
    await expect(
      configuratorAsProxy.initialize(governorTimelock.address)
    ).to.be.revertedWith("custom error 'AlreadyInitialized()'");
  });

  it('only main-governor-timelock can set market admin', async () => {
    const {
      governorTimelockSigner,
      marketUpdateTimelock,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const { configurator, configuratorProxy } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    const oldMarketAdmin = await configuratorAsProxy.marketAdmin();

    // Add a check to make sure its set as address(0) initially. So here oldMarketAdmin should be (0)

    const txn = await wait(
      configuratorAsProxy
        .connect(governorTimelockSigner)
        .setMarketAdmin(marketUpdateTimelock.address)
    );
    expect(event(txn, 0)).to.be.deep.equal({
      SetMarketAdmin: {
        oldAdmin: oldMarketAdmin,
        newAdmin: marketUpdateTimelock.address,
      },
    });
    const newMarketAdmin = await configuratorAsProxy.marketAdmin();
    expect(newMarketAdmin).to.be.equal(marketUpdateTimelock.address);
    expect(newMarketAdmin).to.be.not.equal(oldMarketAdmin);

    await expect(
      configuratorAsProxy
        .connect(marketUpdateMultiSig)
        .setMarketAdmin(marketUpdateTimelock.address)
    ).to.be.revertedWithCustomError(configuratorAsProxy, 'Unauthorized');


    await expect(
      configuratorAsProxy
        .connect(marketUpdateTimelock.signer)
        .setMarketAdmin(marketUpdateTimelock.address)
    ).to.be.revertedWithCustomError(configuratorAsProxy, 'Unauthorized');

  });


  it('only main-governor-timelock can set or update marketAdminPauseGuardian', async () => {
    const {
      governorTimelockSigner,
      marketUpdateTimelock,
      marketUpdateMultiSig,
    } = await makeMarketAdmin();

    const {
      configurator,
      configuratorProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: governorTimelockSigner,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    const oldMarketAdminPauseGuardian = await configuratorAsProxy.marketAdminPauseGuardian();
    const txn = await wait(
      configuratorAsProxy
        .connect(governorTimelockSigner)
        .setMarketAdminPauseGuardian(alice.address)
    );
    expect(event(txn, 0)).to.be.deep.equal({
      SetMarketAdminPauseGuardian: {
        oldPauseGuardian: oldMarketAdminPauseGuardian,
        newPauseGuardian: alice.address,
      },
    });
    const newMarketAdminPauseGuardian = await configuratorAsProxy.marketAdminPauseGuardian();
    expect(newMarketAdminPauseGuardian).to.be.equal(alice.address);
    expect(newMarketAdminPauseGuardian).to.be.not.equal(
      oldMarketAdminPauseGuardian
    );
    await expect(
      configuratorAsProxy
        .connect(marketUpdateMultiSig)
        .setMarketAdminPauseGuardian(marketUpdateTimelock.address)
    ).to.be.revertedWithCustomError(configuratorAsProxy, 'Unauthorized');

    await expect(
      configuratorAsProxy
        .connect(marketUpdateTimelock.signer)
        .setMarketAdminPauseGuardian(marketUpdateTimelock.address)
    ).to.be.revertedWithCustomError(configuratorAsProxy, 'Unauthorized');
  });

  it('main-governor-timelock or marketAdminPauseGuardian can pause market admin', async () => {});

  it('main-governor-timelock can unpause market admin', async () => {});

  it('marketAdminPauseGuardian cannot unpause market admin', async () => {});

  it('only main-governor-timelock or market admain can call market update functions', async () => {});

  it('market admain cannot call NON market update functions', async () => {});

  it('market admain cannot call market update functions when marketAdminPaused', async () => {});

  it('main-governor-timelock can call market update functions when marketAdminPause', async () => {});

  it('governor cannot be updated by market admin', async () => {});
});
