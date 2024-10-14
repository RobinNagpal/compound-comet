# Makefile for verifying contracts


# Declare constants at the top
GOVERNOR_TIMELOCK_ADDRESS = 0xDeployedGovernorTimelock
MARKET_UPDATE_MULTISIG = 0
PROPOSAL_GUARDIAN_ADDRESS = 0
MARKET_ADMIN_TIMELOCK_ADDRESS = 0xcEBA8eb2D2Abd786d4e8f7c029ebbfCeD365af6e
MARKET_UPDATE_PROPOSER = 0x7a1DB8214AA9247e9Ea2f372415E5b6FdD28B8eC
CONFIGURATOR_IMPL = 0x33d3dFAAc03696AD800E3232944bf4b7f3b58aAf
COMET_PROXY_ADMIN = 0x02c136cb84e58616b4f75b5Ee24e8A129e21D5f8
MARKET_ADMIN_PERMISSION_CHECKER = 0x6eA1d5D46565b273A1815Da4EcC9275101B3405e

SOLIDITY_COMPILER_VERSION = "0.8.15"
SENDER = "0x470579d16401a36BF63b1428eaA7189FBdE5Fee9"
EVM_VERSION = "london"
OWNERS = '["0xDD659911EcBD4458db07Ee7cDdeC79bf8F859AbC", "0xda32C5AEE8Fc5C51Ed9a99f5608c33f435F740B4", "0x1D8e0b8F4CEd9262C9ac0c0870BF8B45D74ad9D9", "0x47526FDDBA0A5a7ef001FaaD4836b771B3e92522"]'
THRESHOLD = 2

#RPC_URL = "RPCUrlOfTheNetwork"
#SENDER = "0x470579d16401a36BF63b1428eaA7189FBdE5Fee9"
#ETHERSCAN_API_KEY = ""
#CHAIN_ID = ChainIdOfTheNetwork
#SALT = 'salt-salt-sale-salt'

include .env

# Define targets for each contract
verify-all: verify-MarketUpdateTimelock verify-MarketUpdateProposer verify-Configurator verify-CometProxyAdmin verify-MarketAdminPermissionChecker

# Deploying Safe
deploy-safe:
	@echo "Deploying Safe..."
	OWNERS=$(OWNERS) THRESHOLD=$(THRESHOLD) SALT=$(SALT) CHAIN_ID=$(CHAIN_ID) yarn hardhat run scripts/marketupdates/deploySafe.ts

# Deploying the contracts
deploy-contracts:
	@echo "Deploying contracts..."
	CHAIN_ID=$(CHAIN_ID) forge script forge/script/marketupdates/DeployContracts.s.sol:DeployContracts \
		--rpc-url $(RPC_URL) \
		--optimize \
		--optimizer-runs 200 \
		--use $(SOLIDITY_COMPILER_VERSION) \
		--evm-version $(EVM_VERSION) \
		--broadcast \
		--via-ir \
		-vvvv \
		--sender $(SENDER)

# Verifying MarketUpdateTimelock
verify-MarketUpdateTimelock:
	@echo "Verifying MarketUpdateTimelock..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address,uint256)" $(SENDER) 360000) \
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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address,address,address,address)" $(SENDER) $(MARKET_UPDATE_MULTISIG) $(PROPOSAL_GUARDIAN_ADDRESS) $(MARKET_ADMIN_TIMELOCK_ADDRESS)) \
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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address)" $(SENDER)) \
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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
		--optimizer-runs 200 \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${CONFIGURATOR_IMPL} \
		contracts/Configurator.sol:Configurator

# Verifying MarketAdminPermissionChecker
verify-MarketAdminPermissionChecker:
	@echo "Verifying MarketAdminPermissionChecker..."
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address,address,address)" $(SENDER) $(MARKET_UPDATE_MULTISIG) 0x0000000000000000000000000000000000000000) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${MARKET_ADMIN_PERMISSION_CHECKER} \
		contracts/marketupdates/MarketAdminPermissionChecker.sol:MarketAdminPermissionChecker
