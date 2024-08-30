import hre from "hardhat";
import {
  CometProxyAdmin__factory,
  GovernorSimple__factory,
  SimpleTimelock__factory,
  TransparentUpgradeableProxy__factory,
} from "../build/types";
import { ethers, event, expect, makeConfigurator, wait } from "./helpers";

describe("test existing workflow", function() {
  it("should allow the governor (timelock's admin) to execute transactions, but prevent unauthorized users from doing so", async () => {
    const { signer, timelock } = await initializeAndFundTimelock();

    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    // Prepare calldata for setting the pause guardian
    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // Governor (timelock's admin) successfully executes the transaction
    await timelock.executeTransactions(
      [configuratorProxy.address],
      [0], // no Ether to be sent
      ["setPauseGuardian(address,address)"],
      [setPauseGuardianCalldata]
    );
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .pauseGuardian
    ).to.be.equal(alice.address);

    // Unauthorized user (alice) attempts to execute the transaction and fails
    await expect(
      timelock.connect(alice).executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWithCustomError(timelock, "Unauthorized");
  });

  it("should allow timelock (as the governor of the configurator) to execute transactions and set the pause guardian", async () => {
    const { signer, timelock } = await initializeAndFundTimelock();

    const {
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    // Prepare calldata for setting the pause guardian
    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // Timelock, acting as the governor of the configurator, successfully executes the transaction
    await timelock.executeTransactions(
      [configuratorProxy.address],
      [0], // no Ether to be sent
      ["setPauseGuardian(address,address)"],
      [setPauseGuardianCalldata]
    );

    // Verify that the pause guardian has been correctly set to Alice
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address))
        .pauseGuardian
    ).to.be.equal(alice.address);
  });

  it("should prevent timelock from executing transactions after the configurator's governorship is transferred to an unauthorized person (Alice)", async () => {
    const { signer, timelock } = await initializeAndFundTimelock();

    const {
      governor,
      configurator,
      configuratorProxy,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    // Transfer governorship of the configurator from timelock to Alice
    await configuratorAsProxy.connect(governor).transferGovernor(alice.address);

    // Prepare calldata for setting the pause guardian
    let setPauseGuardianCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [cometProxy.address, alice.address]
    );

    // Expect this transaction to revert since Alice is now the governor of configurator, not the timelock
    await expect(
      timelock.executeTransactions(
        [configuratorProxy.address],
        [0], // no Ether to be sent
        ["setPauseGuardian(address,address)"],
        [setPauseGuardianCalldata]
      )
    ).to.be.revertedWith("failed to call");
  });

  it("should allow timelock, as the owner of CometProxyAdmin, to execute deploy and upgrade transactions", async () => {
    const { signer, timelock } = await initializeAndFundTimelock();

    const {
      configuratorProxy,
      proxyAdmin,
      cometProxy,
    } = await makeConfigurator({
      governor: signer,
    });

    // Prepare calldata for deploying and upgrading the Comet contract
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );

    // Timelock, acting as the owner of CometProxyAdmin, successfully executes the deploy and upgrade transaction
    const txn = (await wait(
      timelock.executeTransactions(
        [proxyAdmin.address],
        [0], // no Ether to be sent
        ["deployAndUpgradeTo(address,address)"],
        [deployAndUpgradeToCalldata]
      )
    )) as any;

    // Define the ABI for the expected events
    const abi = [
      "event CometDeployed(address indexed cometProxy, address indexed newComet)",
      "event Upgraded(address indexed implementation)",
    ];

    // Initialize the contract interface for decoding events
    const iface = new ethers.utils.Interface(abi);
    const events = [];

    // Decode and store the emitted events
    txn.receipt.events.forEach((event) => {
      try {
        const decodedEvent = iface.parseLog(event);
        events.push(decodedEvent);
      } catch (error) {
        console.log("Failed to decode event:", error);
      }
    });

    // Verify that the correct events were emitted
    expect(events[0].name).to.be.equal("CometDeployed");
    expect(events[1].name).to.be.equal("Upgraded");

    // Verify the addresses involved in the deployment and upgrade
    const oldCometProxyAddress = cometProxy.address;
    const oldCometProxyAddressFromEvent = events[0].args.cometProxy;
    const newCometProxyAddress = events[0].args.newComet;

    expect(oldCometProxyAddress).to.be.equal(oldCometProxyAddressFromEvent);
    expect(oldCometProxyAddress).to.be.not.equal(newCometProxyAddress);
  });

  it("should prevent timelock from executing deploy and upgrade transactions after CometProxyAdmin's ownership is transferred to an unauthorized person (Alice)", async () => {
    const { signer, timelock } = await initializeAndFundTimelock();

    const {
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      users: [alice],
    } = await makeConfigurator({
      governor: signer,
    });

    // Transfer ownership of CometProxyAdmin from timelock to Alice
    await proxyAdmin.transferOwnership(alice.address);

    // Prepare calldata for deploying and upgrading the Comet contract
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );

    // Expect the transaction to revert because timelock is no longer the owner of CometProxyAdmin
    expect(
      timelock.executeTransactions(
        [proxyAdmin.address],
        [0], // no Ether to be sent
        ["deployAndUpgradeTo(address,address)"],
        [deployAndUpgradeToCalldata]
      )
    ).to.be.revertedWith("failed to call");
  });

  it("should allow CometProxyAdmin to correctly manage CometProxy, including setting a new governor", async () => {
    const {
      configurator,
      configuratorProxy,
      proxyAdmin,
      comet,
      cometProxy,
      users: [alice],
    } = await makeConfigurator();

    // Attach the comet and configurator contracts to their respective proxies
    const cometAsProxy = comet.attach(cometProxy.address);
    const configuratorAsProxy = configurator.attach(configuratorProxy.address);

    // Verify the initial governor of the comet contract through the configurator
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(await comet.governor());

    // Set a new governor (Alice) for the comet contract via the configurator
    const oldGovernor = await comet.governor();
    const newGovernor = alice.address;
    const txn = await wait(
      configuratorAsProxy.setGovernor(cometProxy.address, newGovernor)
    );

    // Deploy and upgrade the comet contract via the proxy admin
    await wait(
      proxyAdmin.deployAndUpgradeTo(
        configuratorProxy.address,
        cometProxy.address
      )
    );

    // Verify that the SetGovernor event was emitted with correct details
    expect(event(txn, 0)).to.be.deep.equal({
      SetGovernor: {
        cometProxy: cometProxy.address,
        oldGovernor,
        newGovernor,
      },
    });

    // Verify that the governor was successfully changed
    expect(oldGovernor).to.be.not.equal(newGovernor);
    expect(
      (await configuratorAsProxy.getConfiguration(cometProxy.address)).governor
    ).to.be.equal(newGovernor);
    expect(await cometAsProxy.governor()).to.be.equal(newGovernor);
  });

  it("should create a proposal to update the asset supply cap on Comet and deploy the comet through ProxyAdmin", async () => {
    const { signer, timelock } = await initializeAndFundTimelock();
    const {
      governor,
      configuratorProxy,
      proxyAdmin,
      cometProxy,
      comet,
    } = await makeConfigurator({
      governor: signer,
    });
    const GovernorFactory = (await ethers.getContractFactory(
      "GovernorSimple"
    )) as GovernorSimple__factory;
    const governorBravo = await GovernorFactory.deploy();
    await governorBravo.deployed();
    governorBravo.initialize(timelock.address, [governor.address]);

    // Setting GovernorBravo as the admin of timelock
    timelock.setAdmin(governorBravo.address);

    const cometAsProxy = comet.attach(cometProxy.address);
    const ASSET_ADDRESS = (await cometAsProxy.getAssetInfo(1)).asset;
    const NEW_ASSET_SUPPLY_CAP = ethers.BigNumber.from("500000000000000000000");

    expect((await cometAsProxy.getAssetInfo(1)).supplyCap).to.be.not.equal(
      NEW_ASSET_SUPPLY_CAP
    );

    let updateAssetSupplyCapCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint128"],
      [cometProxy.address, ASSET_ADDRESS, NEW_ASSET_SUPPLY_CAP]
    );
    let deployAndUpgradeToCalldata = ethers.utils.defaultAbiCoder.encode(
      ["address", "address"],
      [configuratorProxy.address, cometProxy.address]
    );

    const proposeTx = (await wait(
      governorBravo
        .connect(governor)
        .propose(
          [configuratorProxy.address, proxyAdmin.address],
          [0, 0],
          [
            "updateAssetSupplyCap(address,address,uint128)",
            "deployAndUpgradeTo(address,address)",
          ],
          [updateAssetSupplyCapCalldata, deployAndUpgradeToCalldata],
          "Proposal to update Comet's governor"
        )
    )) as any;

    const proposalId = proposeTx.receipt.events[0].args.id.toNumber();

    await wait(governorBravo.connect(governor).queue(proposalId));

    await wait(governorBravo.connect(governor).execute(proposalId));

    expect(
      (await cometAsProxy.getAssetInfoByAddress(ASSET_ADDRESS)).supplyCap
    ).to.be.equal(NEW_ASSET_SUPPLY_CAP);
  });
});
async function initializeAndFundTimelock() {
  const signers = await ethers.getSigners();
  const gov = signers[0];
  const TimelockFactory = (await ethers.getContractFactory(
    "SimpleTimelock"
  )) as SimpleTimelock__factory;
  const timelock = await TimelockFactory.deploy(gov.address);
  const timelockAddress = await timelock.deployed();

  // Impersonate the account
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [timelockAddress.address],
  });

  // Fund the impersonated account
  await gov.sendTransaction({
    to: timelock.address,
    value: ethers.utils.parseEther("1.0"), // Sending 1 Ether to cover gas fees
  });

  // Get the signer from the impersonated account
  const signer = await ethers.getSigner(timelockAddress.address);
  return { signer, timelock };
}
