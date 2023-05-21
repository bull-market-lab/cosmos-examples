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
