# Makefile for verifying contracts

# Environment variables for Etherscan API key and chain ID
ETHERSCAN_API_KEY = YOUR_ETHERSCAN_API_KEY
CHAIN_ID = 11155111  # Sepolia Testnet

# Define targets for each contract
verify-all: verify-MarketUpdateTimelock verify-MarketUpdateProposer verify-Configurator verify-CometProxyAdmin verify-MarketAdminPermissionChecker

verify-MarketUpdateTimelock:
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args 0000000000000000000000006d903f6003cca6255d85cca4d3b5e5146dc339250000000000000000000000000000000000000000000000000000000000057e40 \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0x09f92907978E1581C735ff0729fAbc44E688bdfd \
		contracts/marketupdates/MarketUpdateTimelock.sol:MarketUpdateTimelock

verify-MarketUpdateProposer:
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args 0000000000000000000000006d903f6003cca6255d85cca4d3b5e5146dc339250000000000000000000000007053e25f7076f4986d632a3c04313c81831e0d5500000000000000000000000077b65c68e52c31eb844fb3b4864b91133e2c130800000000000000000000000009f92907978e1581c735ff0729fabc44e688bdfd \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0xC8BD472ba473B30669C5333252cD25aFDf25242f \
		contracts/marketupdates/MarketUpdateProposer.sol:MarketUpdateProposer

verify-Configurator:
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0x8Ef30bA74f4C9381175Cc6DF6856734B55CfDE65 \
		contracts/Configurator.sol:Configurator

verify-CometProxyAdmin:
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args 0000000000000000000000006d903f6003cca6255d85cca4d3b5e5146dc33925 \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0x24ac95E852d471c6EE0115326886E17547214ABc \
		contracts/CometProxyAdmin.sol:CometProxyAdmin

verify-MarketAdminPermissionChecker:
	forge verify-contract \
		--chain-id $(CHAIN_ID) \
		--compiler-version "v0.8.15+commit.e14f2714" \
		--optimizer-runs 200 \
		--constructor-args 0000000000000000000000006d903f6003cca6255d85cca4d3b5e5146dc3392500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 \
		--etherscan-api-key $(ETHERSCAN_API_KEY) \
		--watch \
		--via-ir \
		0x317739F521DdA1BB6f16582b5dF3E70Ab3DE2FE3 \
		contracts/marketupdates/MarketAdminPermissionChecker.sol:MarketAdminPermissionChecker