// ===================== PLEASE READ THIS =====================
/*
yield bearing DCA is a little tricky as we need to know how much to withdraw each time, this could be solved by deploying an simple query contract that calculates it, pass DCA already run counter, total count
withdraw_amount = mars_balance / (total_dca_count - dca_already_run_counter)
*/

import Big from "big.js";
import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForRecurringJob,
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpFirstFreeSubAccountAddress,
  toBase64,
} from "../../../util";
import {
  CHAIN_DENOM,
  CHAIN_PREFIX,
  MARS_RED_BANK_ADDRESS,
  NTRN_USDC_PAIR_ADDRESS,
  USDC_DENOM,
  WARP_CONTROLLER_ADDRESS,
  WARP_RESOLVER_ADDRESS,
} from "../../../env";
import { DEFAULT_JOB_REWARD } from "../../../constant";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const astroportNtrnUsdcPairAddress = NTRN_USDC_PAIR_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const marsRedBankAddress = MARS_RED_BANK_ADDRESS!;

const usdcDenom = USDC_DENOM!;

const run = async () => {
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.1";

  // 0.05 USDC
  const totalSwapAmount = (50_000).toString();

  const offeredTokenDenom = usdcDenom;

  const dcaNumber = (5).toString();

  // 86400 is 1 day in seconds
  // const dcaInterval = 60 * 60 * 24 * 7;
  // make it shorter for testing, 30 seconds
  const dcaInterval = (30).toString();
  // initial value is current timestamp
  const dcaStartTime = String(Math.floor(Date.now() / 1000));

  // round down to 3 decimal places to avoid running out of fund
  const singleSwapAmount = Big(totalSwapAmount).div(dcaNumber).round(3, 0).toString();

  const warpResolverAddress = WARP_RESOLVER_ADDRESS!;

  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);

  const warpProtocolFee = await calculateWarpProtocolFeeForRecurringJob(
    0,
    DEFAULT_JOB_REWARD,
    dcaInterval,
    dcaNumber
  );

  /// =========== vars ===========

  const jobVarNameNextExecution = "dca_swap_usdc_to_ntrn_next_execution";
  const jobVarNextExecution = {
    static: {
      kind: "uint", // NOTE: it's better to use uint instead of timestamp to keep it consistent with condition
      name: jobVarNameNextExecution,
      value: dcaStartTime,
      update_fn: {
        // update value to current timestamp + dcaInterval, i.e. make next execution 1 day later
        on_success: {
          uint: {
            expr: {
              left: {
                simple: dcaInterval,
              },
              op: "add",
              right: {
                env: "time",
              },
            },
          },
        },
        // on error, do nothing for now, this will stop creating new jobs
        // on_error: {
        // }
      },
      encode: false,
    },
  };

  const jobVarNameAlreadyRunCounter = "dca_already_run_counter";
  const jobVarAlreadyRunCounter = {
    static: {
      kind: "int",
      name: jobVarNameAlreadyRunCounter,
      value: (0).toString(), // initial counter value is 0
      update_fn: {
        // increment counter
        on_success: {
          int: {
            expr: {
              left: {
                ref: `$warp.variable.${jobVarNameAlreadyRunCounter}`,
              },
              op: "add",
              right: {
                simple: (1).toString(),
              },
            },
          },
        },
        // on error, do nothing for now, this will stop creating new jobs
        // on_error: {
        // }
      },
    },
    encode: false,
  };

  const queryMarsBalanceMsg = {
    user_collateral: {
      user: subAccountAddress,
      denom: offeredTokenDenom,
    },
  };
  const jobVarNameMarsBalance = "usdc_balance_in_mars";
  const jobVarMarsBalance = {
    query: {
      kind: "amount",
      name: jobVarNameMarsBalance,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(queryMarsBalanceMsg),
              contract_addr: marsRedBankAddress,
            },
          },
        },
        selector: "$.amount",
      },
      reinitialize: false,
      encode: false,
    },
  };

  const astroportNativeSwapMsg = {
    swap: {
      offer_asset: {
        info: {
          native_token: {
            denom: offeredTokenDenom,
          },
        },
        amount: `$warp.variable.${jobVarNameMarsBalance}`,
      },
      /*
      Belief Price + Max Spread
      If belief_price is provided in combination with max_spread, 
      the pool will check the difference between the return amount (using belief_price) and the real pool price.
      The belief_price +/- the max_spread is the range of possible acceptable prices for this swap.
      */
      // belief_price: beliefPrice,
      // max_spread: '0.005',
      max_spread: maxSpread,
      // to: '...', // default to sender, need to set explicitly cause default is sub account
      to: myAddress,
    },
  };
  const jobVarNameAstroportSwapMsg = "astroport_swap_msg";
  const jobVarAstroportSwapMsg = {
    static: {
      kind: "string",
      name: jobVarNameAstroportSwapMsg,
      value: JSON.stringify(astroportNativeSwapMsg),
      encode: true,
    },
  };

  /// =========== condition ===========

  const condition = {
    and: [
      {
        expr: {
          uint: {
            // NOTE: we must use uint instead of timestamp here as timestamp can only compare current time with var
            // there is no left side of expression
            left: {
              env: "time",
            },
            op: "gt",
            right: {
              ref: `$warp.variable.${jobVarNameNextExecution}`,
            },
          },
        },
      },
      {
        expr: {
          int: {
            left: {
              ref: `$warp.variable.${jobVarNameAlreadyRunCounter}`,
            },
            op: "lt",
            right: {
              simple: dcaNumber,
            },
          },
        },
      },
    ],
  };

  const terminateCondition = {
    expr: {
      int: {
        left: {
          ref: `$warp.variable.${jobVarNameAlreadyRunCounter}`,
        },
        op: "gte",
        right: {
          simple: dcaNumber,
        },
      },
    },
  };

  /// =========== job msgs ===========

  const withdrawFromMarsMsg = {
    withdraw: {
      // unset will default to withdraw full amount
      denom: offeredTokenDenom,
    },
  };
  const withdrawFromMars = {
    wasm: {
      execute: {
        contract_addr: marsRedBankAddress,
        msg: toBase64(withdrawFromMarsMsg),
        funds: [],
      },
    },
  };

  const nativeSwap = {
    wasm: {
      execute: {
        contract_addr: astroportNtrnUsdcPairAddress,
        msg: `$warp.variable.${jobVarNameAstroportSwapMsg}`,
        funds: [{ denom: offeredTokenDenom, amount: `$warp.variable.${jobVarNameMarsBalance}` }],
      },
    },
  };

  /// =========== cosmos msgs ===========

  const cosmosMsgEoaDepositToSubAccount = new MsgSend(myAddress, subAccountAddress, {
    [offeredTokenDenom]: totalSwapAmount,
    [CHAIN_DENOM]: warpProtocolFee,
  });

  const depositToMarsMsg = {
    deposit: {},
  };
  const cosmosMsgSubAccountDepositToMars = new MsgExecuteContract(myAddress, subAccountAddress, {
    generic: {
      msgs: [
        {
          wasm: {
            execute: {
              contract_addr: marsRedBankAddress,
              msg: toBase64(depositToMarsMsg),
              funds: [{ denom: offeredTokenDenom, amount: totalSwapAmount }],
            },
          },
        },
      ],
    },
  });

  const cosmosMsgCreateJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "astroport_yield_bearing_dca_order_swap_usdc_to_ntrn_from_pool",
      description: "woooooooo yield bearing DCA order",
      labels: ["astroport", "mars"],
      // set account explicitly if we want to use sub account, otherwise it will use default account
      account: subAccountAddress,
      recurring: true,
      requeue_on_evict: true,
      reward: DEFAULT_JOB_REWARD,
      vars: JSON.stringify([
        jobVarAlreadyRunCounter,
        jobVarNextExecution,
        jobVarMarsBalance,
        jobVarAstroportSwapMsg,
      ]),
      condition: JSON.stringify(condition),
      terminate_condition: JSON.stringify(terminateCondition),
      // TODO: claim mars rewards if available and send back to owner's EOA
      msgs: JSON.stringify([JSON.stringify(withdrawFromMars), JSON.stringify(nativeSwap)]),
    },
  });

  // create a new sub account since we just used the first free sub account
  // this is optional if user has more free accounts
  const cosmosMsgCreateNewSubAccount = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_account: {
      is_sub_account: true,
    },
  });

  /// =========== sign and broadcast ===========

  createSignBroadcastCatch(wallet, [
    cosmosMsgEoaDepositToSubAccount,
    cosmosMsgSubAccountDepositToMars,
    cosmosMsgCreateJob,
    cosmosMsgCreateNewSubAccount,
  ]);

  /// =========== debug ===========

  // queryWasmContractWithCatch(lcd, warpResolverAddress, {
  //   query_validate_job_creation: {
  //     vars: JSON.stringify([
  //       jobVarPrice,
  //       jobVarMarsBalance,
  //       jobVarAstroportSwapMsg,
  //       // jobVarAstroportSwapFund,
  //     ]),
  //     condition: JSON.stringify(condition),
  //     msgs: JSON.stringify([JSON.stringify(withdrawFromMars), JSON.stringify(nativeSwap)]),
  //     // msgs: JSON.stringify([JSON.stringify(nativeSwap)]),
  //   },
  // }).then((res) => console.log(res));

  // const hydratedVars = await queryWasmContractWithCatch(lcd, warpResolverAddress, {
  //   query_hydrate_vars: {
  //     // vars: JSON.stringify([jobVarPrice, jobVarMarsBalance, jobVarAstroportSwapMsg, jobVarAstroportSwapFund]),
  //     vars: JSON.stringify([jobVarPrice, jobVarMarsBalance, jobVarAstroportSwapMsg])
  //   },
  // });

  // console.log(JSON.stringify(hydratedVars, null, 2));

  // queryWasmContractWithCatch(lcd, warpResolverAddress, {
  //   query_resolve_condition: {
  //     condition: JSON.stringify(condition),
  //     vars: hydratedVars,
  //   },
  // }).then((res) => {
  //   console.log(res);
  // });

  // const hydratedMsgs = await queryWasmContractWithCatch(lcd, warpResolverAddress, {
  //   query_hydrate_msgs: {
  //     msgs: JSON.stringify([JSON.stringify(withdrawFromMars), JSON.stringify(nativeSwap)]),
  //     vars: hydratedVars,
  //   },
  // });

  // console.log(JSON.stringify(hydratedMsgs, null, 2));

  // const msg = new MsgExecuteContract(myAddress, subAccountAddress, {
  //   generic: {
  //     msgs: hydratedMsgs,
  //   },
  // });

  // createSignBroadcastCatch(wallet, [msg]);
};

run();
