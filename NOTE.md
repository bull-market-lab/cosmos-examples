# Note

WATCH OUT: if job failed, fund is not returned, this is very dangerous for jobs you send fund!!

## DCA

### create initial DCA job tx

- send 5.3 LUNA to warp account
  - creation fee 5% 0.05 for 5 jobs so 0.25 LUNA
  - eviction fee 0.01 for 5 jobs so 0.005 LUNA
  - job reward 1 LUNA for 5 jobs so 5 LUNA
- send 7 LUNA to warp account: this is for swapped amount since 1.4 x 5 = 7

### execute job tx

swap 1.4 LUNA to ASTRO at market price, reward is 1 LUNA

job creation fee is 5% of reward, hence 0.05 LUNA

each DCA swap job cost 3.05 LUNA

5 jobs should take 15.25 LUNA

meaning after job is created, warp account should hold 15.25 LUNA

not considering eviction, eviction fee is 0.01 LUNA paid per day if job stays pending for more than 1 day (e.g. DCA interval is 2 days)

### misc

balance 12.31 LUNA after initial job creation
7 LUNA for swapped amount
6 LUNA for reward
0.3 for creation fee
0.06 for eviction fee

    - 1 LUNA for first job reward
    - 0.05 for first job creation fee

job reward is kept at the warp controller contract

spend 2.45 LUNA per job
1 job reward
0.05 creation fee
1.4 swapped to ASTRO
balance 9.86 after first execution (first swap)

balance 7.41 after second swap

balance 4.96 after third swap

balance 2.51 after fourth swap

balance 0.006 after fifth swap

now condition becomes forever false cause counter exceeds 5
but we have a stuck job reward (1 LUNA) at warp controller

```json
{
  "data": {
    "job": {
      "id": "65",
      "owner": "terra1dcegyrekltswvyy0xy69ydgxn9x8x32zdtapd8",
      "last_update_time": "1685414363",
      "name": "astroport_dca_order_luna_to_astro_from_pool",
      "status": "Pending",
      "condition": {
        "and": [
          {
            "expr": {
              "uint": {
                "left": {
                  "env": "time"
                },
                "op": "gt",
                "right": {
                  "ref": "$warp.variable.swap-luna-to-astro-recursively"
                }
              }
            }
          },
          {
            "expr": {
              "int": {
                "left": {
                  "ref": "$warp.variable.swap-luna-to-astro-recursively-counter"
                },
                "op": "lt",
                "right": {
                  "simple": "5"
                }
              }
            }
          }
        ]
      },
      "msgs": [
        "{\"wasm\":{\"execute\":{\"contract_addr\":\"terra1uvu9epct9enjqytsxq8546zggyqhf5pj9q6k8ve73hq93ts98w3swwljr6\",\"msg\":\"eyJzd2FwIjp7Im9mZmVyX2Fzc2V0Ijp7ImluZm8iOnsibmF0aXZlX3Rva2VuIjp7ImRlbm9tIjoidWx1bmEifX0sImFtb3VudCI6IjE0MDAwMDAifSwibWF4X3NwcmVhZCI6IjAuMDEiLCJ0byI6InRlcnJhMWRjZWd5cmVrbHRzd3Z5eTB4eTY5eWRneG45eDh4MzJ6ZHRhcGQ4In19\",\"funds\":[{\"denom\":\"uluna\",\"amount\":\"1400000\"}]}}}"
      ],
      "vars": [
        {
          "static": {
            "kind": "uint",
            "name": "swap-luna-to-astro-recursively",
            "value": "1685414393",
            "update_fn": {
              "on_success": {
                "uint": {
                  "expr": {
                    "left": {
                      "simple": "30"
                    },
                    "op": "add",
                    "right": {
                      "env": "time"
                    }
                  }
                }
              },
              "on_error": null
            }
          }
        },
        {
          "static": {
            "kind": "int",
            "name": "swap-luna-to-astro-recursively-counter",
            "value": "5",
            "update_fn": {
              "on_success": {
                "int": {
                  "expr": {
                    "left": {
                      "ref": "$warp.variable.swap-luna-to-astro-recursively-counter"
                    },
                    "op": "add",
                    "right": {
                      "simple": "1"
                    }
                  }
                }
              },
              "on_error": null
            }
          }
        }
      ],
      "recurring": true,
      "requeue_on_evict": true,
      "reward": "1000000"
    }
  }
}
```

# authz

tried

  const exec = {
    grantee: warpAccountAddress,
    msgs: [
      {
        type_url: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
        value: toBase64({
          delegator_address: myAddress,
          validator_address: localterraValidator,
        }),
      },
    ],
  };
  Code=2 Message=failed to execute message; message index: 0: dispatch: submessages: Cannot unpack proto message with type URL: /cosmos.authz.v1beta1.MsgExec: invalid CosmosMsg from the contract [CosmWasm/wasmd@v0.30.0/x/wasm/keeper/handler_plugin_encoders.go:201] With gas wanted: '50000000' and gas used: '117846'

  const exec = {
    grantee: warpAccountAddress,
    // msgs: [
    //   {
    //     type_url: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
    //     value: toBase64({
    //       delegator_address: myAddress,
    //       validator_address: localterraValidator,
    //     }),
    //   },
    // ],
  };
  Code=2 Message=failed to execute message; message index: 0: dispatch: submessages: Cannot unpack proto message with type URL: /cosmos.authz.v1beta1.MsgExec: invalid CosmosMsg from the contract [CosmWasm/wasmd@v0.30.0/x/wasm/keeper/handler_plugin_encoders.go:201] With gas wanted: '50000000' and gas used: '113606'

  const exec = ""
  Code=2 Message=failed to execute message; message index: 0: dispatch: submessages: invalid grantee address: empty address string is not allowed: invalid address [cosmossdk.io/errors@v1.0.0-beta.7/errors.go:153] With gas wanted: '50000000' and gas used: '112434'