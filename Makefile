# Makefile for verifying contracts


# Declare constants at the top
GOVERNOR_TIMELOCK_ADDRESS = 0xDeployedGovernorTimelock
MARKET_UPDATE_MULTISIG = 0xDeployedMarketUpdateMultisig
PROPOSAL_GUARDIAN_ADDRESS = 0xDeployedProposalGuardian
MARKET_ADMIN_TIMELOCK_ADDRESS = 0xDeployedComputedTimelock
MARKET_UPDATE_PROPOSER = 0xDeployedComputedTimelock
CHAIN_ID = 11155111
ETHERSCAN_API_KEY = "your-api-key"

# Define targets for each contract
verify-all: verify-MarketUpdateTimelock verify-MarketUpdateProposer verify-Configurator verify-CometProxyAdmin verify-MarketAdminPermissionChecker

# Verifying MarketUpdateTimelock
verify-MarketUpdateTimelock:
	@echo "Verifying MarketUpdateTimelock..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args $(shell ./get-constructor-args.sh MarketUpdateTimelock $(GOVERNOR_TIMELOCK_ADDRESS) 360000) \
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
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args $(shell ./get-constructor-args.sh MarketUpdateProposer $(GOVERNOR_TIMELOCK_ADDRESS) $(MARKET_UPDATE_MULTISIG) $(PROPOSAL_GUARDIAN_ADDRESS) $(MARKET_ADMIN_TIMELOCK_ADDRESS)) \
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
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args $(shell ./get-constructor-args.sh CometProxyAdmin $(GOVERNOR_TIMELOCK_ADDRESS)) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0xDeployedCometProxyAdmin \
		contracts/CometProxyAdmin.sol:CometProxyAdmin

# Verifying Configurator
verify-Configurator:
	@echo "Verifying Configurator..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args $(shell ./get-constructor-args.sh Configurator) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0xDeployedConfigurator \
		contracts/Configurator.sol:Configurator

# Verifying MarketAdminPermissionChecker
verify-MarketAdminPermissionChecker:
	@echo "Verifying MarketAdminPermissionChecker..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args $(shell ./get-constructor-args.sh MarketAdminPermissionChecker $(GOVERNOR_TIMELOCK_ADDRESS) 0xAddress1 0xAddress2) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0xDeployedMarketAdminPermissionChecker \
		contracts/marketupdates/MarketAdminPermissionChecker.sol:MarketAdminPermissionChecker
