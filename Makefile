# Makefile for verifying contracts


# Declare constants at the top
GOVERNOR_TIMELOCK_ADDRESS = 0xc28aD44975C614EaBe0Ed090207314549e1c6624
MARKET_UPDATE_MULTISIG = 0xc8Acc2fA0d6A136a0D413652855011fe9f62D2C1
PROPOSAL_GUARDIAN_ADDRESS = 0x7053e25f7076F4986D632A3C04313C81831e0d55
MARKET_ADMIN_TIMELOCK_ADDRESS = 0x7F346793222a814484C40472A68D6B53a70Ce575
MARKET_UPDATE_PROPOSER = 0x657E2c356939C41a41f6fA2d283793800ecDa9f2
CONFIGURATOR = 0xdaF69cFd0Efad1e2C633abce4D445B852990ABF5
COMET_PROXY_ADMIN = 0xFd5d8BDcaD2f75AA6813D102e3e4Cca548cE7711
MARKET_ADMIN_PERMISSION_CHECKER = 0x5E8Ffe14245dec91bC60c03264E7928463d7AfC3
CHAIN_ID = 11155111
ETHERSCAN_API_KEY = "your-api-key"
SOLIDITY_COMPILER_VERSION = "0.8.15"
SENDER = "0xcecd704e3bB2359F4aB7339BDDBcB9dF3Bd26EC5"
EVM_VERSION = "london"
RPC_URL = "https://ethereum-sepolia.blockpi.network/v1/rpc/public"

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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
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
		--compiler-version $(SOLIDITY_COMPILER_VERSION) \
		--optimizer-runs 200 \
		--constructor-args $(shell cast abi-encode "constructor(address,address,address)" $(GOVERNOR_TIMELOCK_ADDRESS) 0x0000000000000000000000000000000000000000 0x0000000000000000000000000000000000000000) \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		${MARKET_ADMIN_PERMISSION_CHECKER} \
		contracts/marketupdates/MarketAdminPermissionChecker.sol:MarketAdminPermissionChecker
