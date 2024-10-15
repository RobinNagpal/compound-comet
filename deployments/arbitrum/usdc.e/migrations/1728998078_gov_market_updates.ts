import { DeploymentManager } from '../../../../plugins/deployment_manager/DeploymentManager';
import { migration } from '../../../../plugins/deployment_manager/Migration';
import { applyL1ToL2Alias, estimateL2Transaction } from '../../../../scenario/utils/arbitrumUtils';
import { MarketAdminPermissionChecker, MarketUpdateProposer, MarketUpdateTimelock, CometProxyAdmin } from './,,/../../../../../build/types';
import { expect } from 'chai';
import { proposal } from '../../../../src/deploy';

interface Vars {}

const localTimelockAddress = '0x3fB4d38ea7EC20D91917c09591490Eeda38Cf88A';
const marketUpdateTimelockAddress = '0xcEBA8eb2D2Abd786d4e8f7c029ebbfCeD365af6e';
const marketUpdateProposerAddress = '0x7a1DB8214AA9247e9Ea2f372415E5b6FdD28B8eC';
const newConfiguratorImplementationAddress = '0x33d3dFAAc03696AD800E3232944bf4b7f3b58aAf';
const newCometProxyAdminAddress = '0x02c136cb84e58616b4f75b5Ee24e8A129e21D5f8';
const marketAdminPermissionCheckerAddress = '0x6eA1d5D46565b273A1815Da4EcC9275101B3405e';

export default migration('1728998078_gov_market_updates', {
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

    const { bridgeReceiver, timelock: l2Timelock } = await deploymentManager.getContracts();

    const { timelock, governor, arbitrumInbox } =
      await govDeploymentManager.getContracts();

    const cometProxyAdminOldAddress =
      '0xD10b40fF1D92e2267D099Da3509253D9Da4D715e';
    const configuratorProxyAddress =
      '0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775';
    const cometProxyAddress = '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA';

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

    const createRetryableTicketGasParams = await estimateL2Transaction(
      {
        from: applyL1ToL2Alias(timelock.address),
        to: bridgeReceiver.address,
        data: l2ProposalData
      },
      deploymentManager
    );
    const refundAddress = l2Timelock.address;

    const mainnetActions = [
      {
        contract: arbitrumInbox,
        signature: 'createRetryableTicket(address,uint256,uint256,address,address,uint256,uint256,bytes)',
        args: [
          bridgeReceiver.address,                           // address to,
          0,                                                // uint256 l2CallValue,
          createRetryableTicketGasParams.maxSubmissionCost, // uint256 maxSubmissionCost,
          refundAddress,                                    // address excessFeeRefundAddress,
          refundAddress,                                    // address callValueRefundAddress,
          createRetryableTicketGasParams.gasLimit,          // uint256 gasLimit,
          createRetryableTicketGasParams.maxFeePerGas,      // uint256 maxFeePerGas,
          l2ProposalData,                                   // bytes calldata data
        ],
        value: createRetryableTicketGasParams.deposit
      },
    ];

    const description =
      'Governance proposal with actions to change proxy admins, upgrade the configurator, and set the market admin and related roles.';
    const txn = await govDeploymentManager.retry(async () =>
      trace(await governor.propose(...(await proposal(mainnetActions, description))))
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
