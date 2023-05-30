# cosmos-examples

List of examples interacting with Cosmos SDK native modules (e.g. send native token) and CosmWasm contracts using [feather.js](https://github.com/terra-money/feather.js).

## available examples

### [warp](https://warp.money/)

- create account
- deposit account
- withdraw account
- create job
- update job
- evict job
- execute job
- delete job

### [enterprise](https://enterprise.money/)

- create multisig dao
- create text proposal
- query proposal status
- vote proposal
- execute proposal

### [astroport](https://astroport.fi/)

- increase allowance + provide liquidity
- swap
  - swap from native (native -> native, native -> cw20)
  - swap from cw20 (cw20 -> native, cw20 -> cw20)
  - multihop swap through router
  - simulate swap through pool or router (cw20 -> native, cw20 -> cw20)

### warp x astroport

- limit order
  - swap from native through pool
  - swap from cw20 through pool
  - swap from native through router
  - swap from cw20 through router
- DCA (Dollar-Cost Averaging)
  - swap 1 token to another recursively (e.g. swap 1 LUNA to ASTRO at market price everyday for 10 days)
    - currently there is a limitation on DCA, after the last order is executed, we still create a job (because we cannot update `recurring` after we set it to `true` in initial job), but this job will be stuck at pending status forever as counter condition will never be satisfied. So we will keep paying eviction fee (0.01 LUNA everyday) for this dummy job. Warp team is working on adding a `terminate_fn` so we can update `recurring` to false at last run.

### warp x enterprise

- execute proposal upon passing (note this doesn't work now because enterprise won't update proposal status even it becomes executable, we need a function to check proposal voting result to determine if it's executable, not something can be done easily in warp condition query)
