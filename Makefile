# Makefile for verifying contracts


# Declare constants at the top
GOVERNOR_TIMELOCK_ADDRESS = 0xDeployedGovernorTimelock
MARKET_UPDATE_MULTISIG = 0xDeployedMarketUpdateMultisig
PROPOSAL_GUARDIAN_ADDRESS = 0xDeployedProposalGuardian
MARKET_ADMIN_TIMELOCK_ADDRESS = 0xDeployedComputedTimelock
MARKET_UPDATE_PROPOSER = 0xDeployedComputedTimelock
CHAIN_ID = 11155111
ETHERSCAN_API_KEY = "your-api-key"
SOLIDITY_COMPILER_VERSION = "0.8.15"
SENDER = "0xYourSenderAddress"
EVM_VERSION = "london"
RPC_URL = "RPCUrlOfYourNetwork"

# Define targets for each contract
verify-all: verify-MarketUpdateTimelock verify-MarketUpdateProposer verify-Configurator verify-CometProxyAdmin verify-MarketAdminPermissionChecker

# Deploying the contracts
deploy-contracts:
	@echo "Deploying contracts..."
	forge script forge/script/marketupdates/DeployContracts.s.sol:DeployContracts \
		--rpc-url $(RPC_URL) \
		--optimize \
		--optimizer-runs 200 \
		--use $(SOLIDITY_COMPILER_VERSION) \
		--evm-version $(EVM_VERSION) \
		--broadcast \
		--verify \
		--via-ir \
		-vvvv \
		--sender $(SENDER)

# Verifying MarketUpdateTimelock
verify-MarketUpdateTimelock:
	@echo "Verifying MarketUpdateTimelock..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version $(COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address,uint256)" $(GOVERNOR_TIMELOCK_ADDRESS) 360000) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${MARKET_ADMIN_TIMELOCK_ADDRESS} \
		contracts/marketupdates/MarketUpdateTimelock.sol:MarketUpdateTimelock

# Verifying MarketUpdateProposer
verify-MarketUpdateProposer:
	@echo "Verifying MarketUpdateProposer..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version $(COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address,address,address,address)" $(GOVERNOR_TIMELOCK_ADDRESS) $(MARKET_UPDATE_MULTISIG) $(PROPOSAL_GUARDIAN_ADDRESS) $(MARKET_ADMIN_TIMELOCK_ADDRESS)) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${MARKET_UPDATE_PROPOSER} \
		contracts/marketupdates/MarketUpdateProposer.sol:MarketUpdateProposer

# Verifying CometProxyAdmin
verify-CometProxyAdmin:
	@echo "Verifying CometProxyAdmin..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version $(COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address)" $(GOVERNOR_TIMELOCK_ADDRESS)) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${COMET_PROXY_ADMIN} \
		contracts/CometProxyAdmin.sol:CometProxyAdmin

# Verifying Configurator
verify-Configurator:
	@echo "Verifying Configurator..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version $(COMPILER_VERSION) \
		--optimizer-runs 200 \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${CONFIGURATOR} \
		contracts/Configurator.sol:Configurator

# Verifying MarketAdminPermissionChecker
verify-MarketAdminPermissionChecker:
	@echo "Verifying MarketAdminPermissionChecker..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version $(COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address,address,address)" $(GOVERNOR_TIMELOCK_ADDRESS) 0x0000000000000000000000000000000000000000 0x0000000000000000000000000000000000000000) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${MARKET_ADMIN_PERMISSION_CHECKER} \
		contracts/marketupdates/MarketAdminPermissionChecker.sol:MarketAdminPermissionChecker
