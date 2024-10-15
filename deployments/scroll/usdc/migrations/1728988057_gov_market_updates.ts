import { DeploymentManager } from '../../../../plugins/deployment_manager/DeploymentManager';
import { migration } from '../../../../plugins/deployment_manager/Migration';
import { MarketAdminPermissionChecker, MarketUpdateProposer, MarketUpdateTimelock, CometProxyAdmin } from './,,/../../../../../build/types';
import { expect } from 'chai';
import { exp, proposal } from '../../../../src/deploy';

interface Vars {}

const localTimelockAddress = '0xF6013e80E9e6AC211Cc031ad1CE98B3Aa20b73E4';
const marketUpdateTimelockAddress = '0xcEBA8eb2D2Abd786d4e8f7c029ebbfCeD365af6e';
const marketUpdateProposerAddress = '0x7a1DB8214AA9247e9Ea2f372415E5b6FdD28B8eC';
const newConfiguratorImplementationAddress = '0x33d3dFAAc03696AD800E3232944bf4b7f3b58aAf';
const newCometProxyAdminAddress = '0x02c136cb84e58616b4f75b5Ee24e8A129e21D5f8';
const marketAdminPermissionCheckerAddress = '0x6eA1d5D46565b273A1815Da4EcC9275101B3405e';

export default migration('1728988057_gov_market_updates', {
  prepare: async (deploymentManager: DeploymentManager) => {
    return {};
  },

  enact: async (
    deploymentManager: DeploymentManager,
    govDeploymentManager: DeploymentManager,
    vars: Vars
  ) => {
    const trace = deploymentManager.tracer();
    const ethers = deploymentManager.hre.ethers;
    const { utils } = ethers;

    const { bridgeReceiver } = await deploymentManager.getContracts();

    const { scrollMessenger, governor } =
      await govDeploymentManager.getContracts();

    const cometProxyAdminOldAddress =
      '0x87A27b91f4130a25E9634d23A5B8E05e342bac50';
    const configuratorProxyAddress =
      '0xECAB0bEEa3e5DEa0c35d3E69468EAC20098032D7';
    const cometProxyAddress = '0xB2f97c1Bd3bf02f5e74d13f02E3e26F93D77CE44';

    const changeProxyAdminForCometProxyCalldata = utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxyAddress, newCometProxyAdminAddress]
    );

    const changeProxyAdminForConfiguratorProxyCalldata =
      utils.defaultAbiCoder.encode(
        ['address', 'address'],
        [configuratorProxyAddress, newCometProxyAdminAddress]
      );

    const upgradeConfiguratorProxyCalldata = utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [configuratorProxyAddress, newConfiguratorImplementationAddress]
    );

    const setMarketAdminCalldata = utils.defaultAbiCoder.encode(
      ['address'],
      [marketUpdateTimelockAddress]
    );

    const setMarketAdminPermissionCheckerForConfiguratorProxyCalldata =
      utils.defaultAbiCoder.encode(
        ['address'],
        [marketAdminPermissionCheckerAddress]
      );

    const setMarketAdminPermissionCheckerForCometProxyCalldata =
      utils.defaultAbiCoder.encode(
        ['address'],
        [marketAdminPermissionCheckerAddress]
      );

    const setMarketUpdateProposerCalldata = utils.defaultAbiCoder.encode(
      ['address'],
      [marketUpdateProposerAddress]
    );

    const setMarketUpdateTimelockDelayCalldata = utils.defaultAbiCoder.encode(
      ['uint'],
      [172800]  // 2 days
    );

    const l2ProposalData = utils.defaultAbiCoder.encode(
      ['address[]', 'uint256[]', 'string[]', 'bytes[]'],
      [
        [
          cometProxyAdminOldAddress,
          cometProxyAdminOldAddress,
          newCometProxyAdminAddress,
          marketAdminPermissionCheckerAddress,
          configuratorProxyAddress,
          newCometProxyAdminAddress,
          marketUpdateTimelockAddress,
          marketUpdateTimelockAddress,
        ],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [
          'changeProxyAdmin(address,address)',
          'changeProxyAdmin(address,address)',
          'upgrade(address,address)',
          'setMarketAdmin(address)',
          'setMarketAdminPermissionChecker(address)',
          'setMarketAdminPermissionChecker(address)',
          'setMarketUpdateProposer(address)',
          'setDelay(uint)',
        ],
        [
          changeProxyAdminForCometProxyCalldata,
          changeProxyAdminForConfiguratorProxyCalldata,
          upgradeConfiguratorProxyCalldata,
          setMarketAdminCalldata,
          setMarketAdminPermissionCheckerForConfiguratorProxyCalldata,
          setMarketAdminPermissionCheckerForCometProxyCalldata,
          setMarketUpdateProposerCalldata,
          setMarketUpdateTimelockDelayCalldata,
        ],
      ]
    );

    const actions = [
      {
        contract: scrollMessenger,
        signature: 'sendMessage(address,uint256,bytes,uint256)',
        args: [bridgeReceiver.address, 0, l2ProposalData, 6_000_000],
        value: exp(0.1, 18),
      },
    ];

    const description =
      'Governance proposal with actions to change proxy admins, upgrade the configurator, and set the market admin and related roles.';
    const txn = await govDeploymentManager.retry(async () =>
      trace(await governor.propose(...(await proposal(actions, description))))
    );

    const event = txn.events.find((event) => event.event === 'ProposalCreated');

    const [proposalId] = event.args;

    trace(`Created proposal ${proposalId}.`);
  },

  async enacted(deploymentManager: DeploymentManager): Promise<boolean> {
    return false;
  },

  async verify(deploymentManager: DeploymentManager) {
    await deploymentManager.spider();
    const tracer = deploymentManager.tracer();
    const ethers = deploymentManager.hre.ethers;

    const { configurator } = await deploymentManager.getContracts();

    const marketAdminPermissionChecker = (await ethers.getContractAt(
      'MarketAdminPermissionChecker',
      marketAdminPermissionCheckerAddress
    )) as MarketAdminPermissionChecker;

    const marketUpdateTimelock = (await ethers.getContractAt(
      'MarketUpdateTimelock',
      marketUpdateTimelockAddress
    )) as MarketUpdateTimelock;

    const marketUpdateProposer = (await ethers.getContractAt(
      'MarketUpdateProposer',
      marketUpdateProposerAddress
    )) as MarketUpdateProposer;

    const cometProxyAdminNew = (await ethers.getContractAt(
      'CometProxyAdmin',
      newCometProxyAdminAddress
    )) as CometProxyAdmin;

    // 1. Check that the market admin permission checker for configurator is set correctly
    expect(await configurator.marketAdminPermissionChecker()).to.be.equal(
      marketAdminPermissionChecker.address
    );

    // 2. Check that the market admin permission checker for comet proxy is set correctly
    expect(await cometProxyAdminNew.marketAdminPermissionChecker()).to.be.equal(
      marketAdminPermissionChecker.address
    );

    // 3. Check that the market admin of permission checket is market update timelock
    expect(await marketAdminPermissionChecker.marketAdmin()).to.be.equal(
      marketUpdateTimelock.address
    );

    // 4. Check that market update proposer of marketUpdateTimelock is market update proposer
    expect(await marketUpdateTimelock.marketUpdateProposer()).to.be.equal(
      marketUpdateProposer.address
    );

    // 5. Check that the owner of the new comet proxy admin is the local timelock
    expect(await cometProxyAdminNew.owner()).to.be.equal(localTimelockAddress);

    // 6. Check that the delay of the market update timelock is 2 days
    expect(await marketUpdateTimelock.delay()).to.be.equal(60 * 60 * 24 * 2);

    tracer('All checks passed.');
  },
});
