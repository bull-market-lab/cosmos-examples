# cosmos-examples

List of examples interacting with Cosmos SDK native modules (e.g. send native token) and CosmWasm contracts using [feather.js](https://github.com/terra-money/feather.js). If you are using cosmjs, osmojs, sei-js, injective-ts or any typescript SDK for Cosmos SDK chains, it should all be similar to feather.js.

***These examples are not meant to be used for production, it's meant for educational purpose and not guaranteed to work all the time as we sometimes build on developing branch of the contract***

## guide

First run `npm i` to install the dependency.

Create `.env` file from `example.env` and fill accordingly, please remember don't put your mainnet seed phrase!

Every example is a runnable typescript script, take a look at `package.json`  to find all available examples, run `npm run example-you-want` (e.g. `npm run warp-create-account`) to run it.

## Projects covered

### [authz](https://docs.terra.money/develop/module-specifications/spec-authz)

Authz is a cosmos sdk module that allows one account (granter) to grant another account (grantee) to do specified tx on behalf of it.

### [Warp](https://warp.money/)

Warp is an automation protocol that lets anyone do if this than that on blockchain, it does so by allowing people to create Warp job that has 2 parts, a condition that evaluates to true or false (e.g. query LUNA-USDC price on astroport and compare it with your desired price) and a list of msgs (e.g. swap LUNA to USDC on astroport).

You can find the testnet and mainnet warp controller contract address at [link](https://github.com/terra-money/warp-contracts/blob/master/refs.json).

### [Enterprise](https://enterprise.money/)

Enterprise is a no code solution for anyone to create DAO (multisig DAO, token DAO, NFT DAO).

Enterprise contract address at [link](https://github.com/terra-money/enterprise-contracts/blob/main/refs.json).

### [Astroport](https://astroport.fi/)

Astroport is a AMM DEX that lets any to provide liquidity or trade token.

Astroport contract address at [link](https://github.com/astroport-fi/astroport-changelog/tree/main).

### Warp x Astroport

Create Warp job that acts as limit order or DCA.

- limit order
  - swap from native through pool
  - swap from cw20 through pool
  - swap from native through router
  - swap from cw20 through router
- DCA (Dollar-Cost Averaging)
  - swap 1 token to another recursively (e.g. swap 1 LUNA to ASTRO at market price everyday for 10 days)
    - currently there is a limitation on DCA, after the last order is executed, we still create a job (because we cannot update `recurring` after we set it to `true` in initial job), but this job will be stuck at pending status forever as counter condition will never be satisfied. So we will keep paying eviction fee (0.05 LUNA everyday) for this dummy job. Warp team is working on adding a `terminate_fn` so we can update `recurring` to false at last run.

### Warp x Enterprise

Create warp job that execute proposal upon passing.

- execute proposal upon passing (note this doesn't work now because enterprise won't update proposal status even it becomes executable, we need a function to check proposal voting result to determine if it's executable, not something can be done easily in warp condition query)

### Warp x Authz

Create warp job that claim your staking reward.

- claim staking reward, warp account owner use authz module to grant warp account permission to withdraw staking reward on behalf of it.
