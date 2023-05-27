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

### warp x enterprise

- execute proposal upon passing (note this doesn't work now because enterprise won't update proposal status even it becomes executable, we need a function to check proposal voting result to determine if it's executable, not something can be done easily in warp condition query)
