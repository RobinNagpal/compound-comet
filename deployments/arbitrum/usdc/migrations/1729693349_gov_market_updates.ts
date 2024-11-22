import { DeploymentManager } from '../../../../plugins/deployment_manager/DeploymentManager';
import { migration } from '../../../../plugins/deployment_manager/Migration';
import {
  MarketAdminPermissionChecker,
  MarketUpdateProposer,
  MarketUpdateTimelock,
  CometProxyAdmin,
  Configurator,
} from '../../../../build/types';
import { applyL1ToL2Alias, estimateL2Transaction } from '../../../../scenario/utils/arbitrumUtils';
import { expect } from 'chai';
import { proposal } from '../../../../src/deploy';

interface Vars {}

const marketAdminAddress = '0x7e14050080306cd36b47DE61ce604b3a1EC70c4e';

const localTimelockAddress = '0x3fB4d38ea7EC20D91917c09591490Eeda38Cf88A';

const marketUpdateTimelockAddress = '0x81Bc6016Fa365bfE929a51Eec9217B441B598eC6';
const marketUpdateProposerAddress = '0xB6Ef3AC71E9baCF1F4b9426C149d855Bfc4415F9';
const newConfiguratorImplementationAddress = '0x371DB45c7ee248dAFf4Dc1FFB67A20faa0ecFE02';
const newCometProxyAdminAddress = '0x24D86Da09C4Dd64e50dB7501b0f695d030f397aF';
const marketAdminPermissionCheckerAddress = '0x62DD0452411113404cf9a7fE88A5E6E86f9B71a6';

const communityMultiSigAddress = '0x78E6317DD6D43DdbDa00Dce32C2CbaFc99361a9d';

const cometProxyAdminOldAddress = '0xD10b40fF1D92e2267D099Da3509253D9Da4D715e';
const configuratorProxyAddress = '0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775';
const cometProxyUsdcAddress = '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf';
const cometProxyUsdtAddress = '0xd98Be00b5D27fc98112BdE293e487f8D4cA57d07';
const cometProxyWethAddress = '0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486';
const cometProxyUsdceAddress = '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA';

export default migration('1729693349_gov_market_updates', {
  prepare: async () => {
    return {};
  },

  enact: async (
    deploymentManager: DeploymentManager,
    govDeploymentManager: DeploymentManager,
  ) => {
    const trace = deploymentManager.tracer();
    const ethers = deploymentManager.hre.ethers;
    const { utils } = ethers;

    const { bridgeReceiver, timelock: l2Timelock } =
      await deploymentManager.getContracts();

    const { arbitrumInbox, governor, timelock } =
      await govDeploymentManager.getContracts();


    const changeProxyAdminForCometProxyUsdcCalldata = utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxyUsdcAddress, newCometProxyAdminAddress]
    );

    const changeProxyAdminForCometProxyUsdtCalldata = utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxyUsdtAddress, newCometProxyAdminAddress]
    );

    const changeProxyAdminForCometProxyWethCalldata = utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxyWethAddress, newCometProxyAdminAddress]
    );

    const changeProxyAdminForCometProxyUsdceCalldata = utils.defaultAbiCoder.encode(
      ['address', 'address'],
      [cometProxyUsdceAddress, newCometProxyAdminAddress]
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

    const setMarketAdminPermissionCheckerForConfiguratorProxyCalldata =
      utils.defaultAbiCoder.encode(
        ['address'],
        [marketAdminPermissionCheckerAddress]
      );

    const l2ProposalData = utils.defaultAbiCoder.encode(
      ['address[]', 'uint256[]', 'string[]', 'bytes[]'],
      [
        [
          cometProxyAdminOldAddress,
          cometProxyAdminOldAddress,
          cometProxyAdminOldAddress,
          cometProxyAdminOldAddress,
          cometProxyAdminOldAddress,
          newCometProxyAdminAddress,
          configuratorProxyAddress,
        ],
        [0, 0, 0, 0, 0, 0, 0],
        [
          'changeProxyAdmin(address,address)',
          'changeProxyAdmin(address,address)',
          'changeProxyAdmin(address,address)',
          'changeProxyAdmin(address,address)',
          'changeProxyAdmin(address,address)',
          'upgrade(address,address)',
          'setMarketAdminPermissionChecker(address)',
        ],
        [
          changeProxyAdminForCometProxyUsdcCalldata,
          changeProxyAdminForCometProxyUsdtCalldata,
          changeProxyAdminForCometProxyWethCalldata,
          changeProxyAdminForCometProxyUsdceCalldata,
          changeProxyAdminForConfiguratorProxyCalldata,
          upgradeConfiguratorProxyCalldata,
          setMarketAdminPermissionCheckerForConfiguratorProxyCalldata,
        ],
      ]
    );

    const refundAddress = l2Timelock.address;

    const createRetryableTicketGasParams = await estimateL2Transaction(
      {
        from: applyL1ToL2Alias(timelock.address),
        to: bridgeReceiver.address,
        data: l2ProposalData,
      },
      deploymentManager
    );

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
      }
    ];

    const description =
      `DoDAO has been examining various areas where improvements can be made to governance in Compound through tooling or automation. A significant issue raised repeatedly by many members concerns the time and effort required to apply Market Updates.

Currently, approximately 70-90% of the proposals pertain solely to updating market parameters. Gauntlet uses analytics and algorithms to determine new parameters based on current market conditions. These proposals are highly specific and require unique skills for validation. So far, we have seen minimal participation from other community members or teams in validating these parameters.

Assuming the total cost of reviewing a proposal (including the effort of all delegates) is $2,000 per proposal, we are spending upwards of $300,000 per year on a process that currently acts more as a friction layer without much safeguard, as these market update proposals are rarely reviewed thoroughly.

This not only slows down the process but also diverts focus from reviewing essential proposals related to new partnerships, the addition of new chains, and the introduction of assets, etc.

We propose a parallel process specifically for market updates that can bypass the normal governance lifecycle. This would enable us, as a Compound community, to move faster and concentrate on the most critical decisions.

This proposal has already been discussed here - https://www.comp.xyz/t/market-updates-alternate-governance-track/5379 

The forum post includes two solutions, and OpenZeppelin has provided details and feedback on those solutions.

After discussing with OpenZeppelin, DoDAO and OZ together believe that given the amount of changes, updating the Configurator could be the best solution. OpenZeppelin mentioned a couple of important points in the forum post:

1. Grant the market admin role to an Safe address, which can be maintained by Gauntlet or other community members.
2. Market Updates to the Configurator will go through a timelock, providing sufficient time for the community to review or even block the market updates via this alternate route.
`;

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

    expect(configurator.address).to.be.equal(configuratorProxyAddress);
    expect(await (configurator as Configurator).governor()).to.be.equal(localTimelockAddress);
    expect(await (configurator as Configurator).marketAdminPermissionChecker()).to.be.equal(marketAdminPermissionCheckerAddress);

    expect(await cometProxyAdminNew.marketAdminPermissionChecker()).to.be.equal(marketAdminPermissionChecker.address);
    expect(await cometProxyAdminNew.owner()).to.be.equal(localTimelockAddress);

    expect(await marketAdminPermissionChecker.marketAdmin()).to.be.equal(marketUpdateTimelockAddress);
    expect(await marketAdminPermissionChecker.owner()).to.be.equal(localTimelockAddress);
    expect(await marketAdminPermissionChecker.marketAdminPauseGuardian()).to.be.equal(communityMultiSigAddress);

    expect(await marketUpdateTimelock.marketUpdateProposer()).to.be.equal(marketUpdateProposer.address);
    expect(await marketUpdateTimelock.governor()).to.be.equal(localTimelockAddress);
    expect(await marketUpdateTimelock.delay()).to.be.equal(2 * 24 * 60 * 60);

    expect(await marketUpdateProposer.governor()).to.be.equal(localTimelockAddress);
    expect(await marketUpdateProposer.marketAdmin()).to.be.equal(marketAdminAddress);

    expect(await marketUpdateProposer.timelock()).to.be.equal(marketUpdateTimelock.address);
    expect(await marketUpdateProposer.proposalGuardian()).to.be.equal(communityMultiSigAddress);

    tracer('All checks passed.');
  },
});
