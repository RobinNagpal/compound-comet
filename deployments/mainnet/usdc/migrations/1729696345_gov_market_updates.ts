import { DeploymentManager } from '../../../../plugins/deployment_manager/DeploymentManager';
import { migration } from '../../../../plugins/deployment_manager/Migration';
import {
  MarketAdminPermissionChecker,
  MarketUpdateProposer,
  MarketUpdateTimelock,
  CometProxyAdmin,
  Configurator,
} from './../../../../build/types';
import { expect } from 'chai';
import { proposal } from '../../../../src/deploy';
import { Contract } from 'ethers';

interface Vars {}

const marketAdminAddress = '0xA1C7b6d8b4DeD5ee46330C865cC8aeCfB13c8b65';

const localTimelockAddress = '0x6d903f6003cca6255D85CcA4D3B5E5146dC33925';

const marketUpdateTimelockAddress = '0x81Bc6016Fa365bfE929a51Eec9217B441B598eC6';
const marketUpdateProposerAddress = '0xB6Ef3AC71E9baCF1F4b9426C149d855Bfc4415F9';
const newConfiguratorImplementationAddress = '0x371DB45c7ee248dAFf4Dc1FFB67A20faa0ecFE02';
const newCometProxyAdminAddress = '0x24D86Da09C4Dd64e50dB7501b0f695d030f397aF';
const marketAdminPermissionCheckerAddress = '0x62DD0452411113404cf9a7fE88A5E6E86f9B71a6';

const communityMultiSigAddress = '0xbbf3f1421D886E9b2c5D716B5192aC998af2012c';

const configuratorProxyAddress = '0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3';
const cometProxyUsdcAddress = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';
const cometProxyUsdtAddress = '0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840';
const cometProxyWethAddress = '0xA17581A9E3356d9A858b789D68B4d866e593aE94';
const cometProxyWstethAddress = '0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3';

export default migration('1729696345_gov_market_updates', {
  prepare: async () => {
    return {};
  },

  enact: async (
    deploymentManager: DeploymentManager,
  ) => {
    const trace = deploymentManager.tracer();
    const ethers = deploymentManager.hre.ethers;

    const { governor, cometAdmin, configurator } = await deploymentManager.getContracts();

    const newCometProxyAdmin = (await ethers.getContractAt(
      'CometProxyAdmin',
      newCometProxyAdminAddress
    )) as Contract;

    const actions = [
      {
        contract: cometAdmin,
        signature: 'changeProxyAdmin(address,address)',
        args: [cometProxyUsdcAddress, newCometProxyAdminAddress],
      },
      {
        contract: cometAdmin,
        signature: 'changeProxyAdmin(address,address)',
        args: [cometProxyUsdtAddress, newCometProxyAdminAddress],
      },
      {
        contract: cometAdmin,
        signature: 'changeProxyAdmin(address,address)',
        args: [cometProxyWethAddress, newCometProxyAdminAddress],
      },
      {
        contract: cometAdmin,
        signature: 'changeProxyAdmin(address,address)',
        args: [cometProxyWstethAddress, newCometProxyAdminAddress],
      },
      {
        contract: cometAdmin,
        signature: 'changeProxyAdmin(address,address)',
        args: [configuratorProxyAddress, newCometProxyAdminAddress],
      },
      {
        contract: newCometProxyAdmin,
        signature: 'upgrade(address,address)',
        args: [configuratorProxyAddress, newConfiguratorImplementationAddress],
      },
      {
        contract: configurator,
        signature: 'setMarketAdminPermissionChecker(address)',
        args: [marketAdminPermissionCheckerAddress],
      },
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

    const txn = await deploymentManager.retry(async () =>
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
