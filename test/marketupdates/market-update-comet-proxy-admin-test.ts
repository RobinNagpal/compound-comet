describe('CometProxyAdmin', function() {
  it('only main-governor-timelock can transferOwnership of CometProxyAdmin as it is the owner', async () => {

  });

  it('market admin cannot transferOwnership of CometProxyAdmin', async () => {

  });

  it('upgrade cannot be called by market admin', async () => {

  });

  it('upgrade can be called by market admin', async () => {

  });

  it('only main-governor-timelock can set or update marketAdminPauseGuardian', async () => {

  });

  it('main-governor-timelock or marketAdminPauseGuardian can pause market admin', async () => {

  });

  it('main-governor-timelock can unpause market admin', async () => {

  });

  it('marketAdminPauseGuardian cannot unpause market admin', async () => {

  });

  it('deployAndUpgradeTo can be called by main-governor-timelock or market-admin', async () => {

  });

  it('deployUpgradeToAndCall can be called by main-governor-timelock or market-admin', async () => {

  });

  it('no other address can call deployAndUpgradeTo', async () => {

  });

  it('no other address can call deployUpgradeToAndCall', async () => {

  });

  it('a new comet implementation gets deployed when main-governor-timelock calls deployAndUpgradeTo', async () => {

  });

  it('a new comet implementation gets deployed when market admin calls deployAndUpgradeTo', async () => {

  });


})
