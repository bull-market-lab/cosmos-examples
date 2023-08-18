# cosmos-examples

List of examples interacting with Cosmos SDK native modules (e.g. send native token) and CosmWasm contracts using [feather.js](https://github.com/terra-money/feather.js). If you are using cosmjs, osmojs, sei-js, injective-ts or any typescript SDK for Cosmos SDK chains, it should all be similar to feather.js.

***These examples are not meant to be used for production, it's meant for educational purpose and not guaranteed to work all the time as we sometimes build on developing branch of the contract***

## guide

First run `npm i` to install the dependency.

Create `.env` file from `example.env` and fill accordingly, please remember don't put your mainnet seed phrase!

Every example is a runnable typescript script, take a look at `package.json` and run `npm run example-you-want` (e.g. `npm run warp-create-account`) to run it.

You can find the testnet and mainnet warp controller contract address at [link](https://github.com/terra-money/warp-contracts/blob/master/refs.json).

Enterprise contract address at [link](https://github.com/terra-money/enterprise-contracts/blob/main/refs.json).

Astroport contract address at [link](https://github.com/astroport-fi/astroport-changelog/tree/main).

## available examples

### [authz](https://docs.terra.money/develop/module-specifications/spec-authz)

Authz is a cosmos sdk module that allows one account (granter) to grant another account (grantee) to do specified tx on behalf of it.

- query grants
- query grantee
- query granter
- grant send native token permission
- execute send native token
- grant generic permission (use claim staking reward as an example)
- execute claim staking reward
- revoke grant

### [warp](https://warp.money/)

Warp is an automation protocol that lets anyone do if this than that on blockchain, it does so by allowing people to create Warp job that has 2 parts, a condition that evaluates to true or false (e.g. query LUNA-USDC price on astroport and compare it with your desired price) and a list of msgs (e.g. swap LUNA to USDC on astroport).

- create account
- deposit account
- withdraw account
- create job
- update job
- evict job
- execute job
- delete job
- directly operate warp account: this is usually how we test a job msg before actually creating the job to test, because warp job's msg in the end of the day is still executed by the warp account, it's just triggered by the keeper and passed to the account by controller contract, so we can send msg to warp account directly to test, also execute job error log is very vague. We can send any [cosmos msg](https://docs.rs/cosmwasm-std/latest/cosmwasm_std/enum.CosmosMsg.html#variants) to warp account, like `wasm`, `bank`, `staking`, etc. NOTE: the `stargate` msg is the tricky one, it's used to interact with SDK modules that's not natively supported (e.g. authz module), and we have to encode it carefully, checkout the example where we use authz execute to claim staking reward on behalf of owner from warp account.

### [enterprise](https://enterprise.money/)

Enterprise is a no code solution for anyone to create DAO (multisig DAO, token DAO, NFT DAO).

- create multisig dao
- create text proposal
- query proposal status
- vote proposal
- execute proposal

### [astroport](https://astroport.fi/)

Astroport is a AMM DEX that lets any to provide liquidity or trade token.

- increase allowance + provide liquidity
- swap
  - swap from native (native -> native, native -> cw20)
  - swap from cw20 (cw20 -> native, cw20 -> cw20)
  - multihop swap through router
  - simulate swap through pool or router (cw20 -> native, cw20 -> cw20)

### warp x astroport

Create Warp job that acts as limit order or DCA.

- limit order
  - swap from native through pool
  - swap from cw20 through pool
  - swap from native through router
  - swap from cw20 through router
- DCA (Dollar-Cost Averaging)
  - swap 1 token to another recursively (e.g. swap 1 LUNA to ASTRO at market price everyday for 10 days)
    - currently there is a limitation on DCA, after the last order is executed, we still create a job (because we cannot update `recurring` after we set it to `true` in initial job), but this job will be stuck at pending status forever as counter condition will never be satisfied. So we will keep paying eviction fee (0.05 LUNA everyday) for this dummy job. Warp team is working on adding a `terminate_fn` so we can update `recurring` to false at last run.

### warp x enterprise

Create warp job that execute proposal upon passing.

- execute proposal upon passing (note this doesn't work now because enterprise won't update proposal status even it becomes executable, we need a function to check proposal voting result to determine if it's executable, not something can be done easily in warp condition query)

### warp x authz

Create warp job that claim your staking reward.

- claim staking reward, warp account owner use authz module to grant warp account permission to withdraw staking reward on behalf of it.
