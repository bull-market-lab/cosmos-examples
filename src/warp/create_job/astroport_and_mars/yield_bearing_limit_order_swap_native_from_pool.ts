import Big from "big.js";
import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpFirstFreeSubAccountAddress,
  getWarpJobCreationFeePercentage,
  queryWasmContractWithCatch,
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
  // when max_spread and minimum_receive are both specified, the swap will fail if receive amount is not in the range of [minimum_receive, return_amount * (1 +/- max_spread)]
  // actually i think i only need to specify minimum_receive in condition
  // expectedReceivedAmount is not required for actual swap msg cause checking condition is atomic with executing swap msg
  // const expectedReceivedAmount = (9_091_852).toString();
  // for testing purpose, set expectedReceivedAmount to 1 to make condition always true
  const expectedReceivedAmount = (1).toString();
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.1";

  // 0.01 USDC
  const swapAmount = (10_000).toString();

  const offeredTokenDenom = usdcDenom;

  // 0.01 NTRN
  const jobReward = (10_000).toString();

  // console.log("myAddress", myAddress);
  // const tmp = await lcd.bank.balance(myAddress).then((res) => {
  //   console.log(res);
  // })

  const warpResolverAddress = WARP_RESOLVER_ADDRESS!;

  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);

  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);

  const jobRewardAndCreationFee = Big(jobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .toString();

  const cosmosMsgEoaDepositToSubAccount = new MsgSend(myAddress, subAccountAddress, {
    [offeredTokenDenom]: swapAmount,
    [CHAIN_DENOM]: jobRewardAndCreationFee,
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
              funds: [{ denom: offeredTokenDenom, amount: swapAmount }],
            },
          },
        },
      ],
    },
  });

  /// =========== vars ===========

  const astroportSimulateNativeSwapMsg = {
    simulation: {
      offer_asset: {
        info: {
          native_token: {
            denom: offeredTokenDenom,
          },
        },
        amount: swapAmount,
      },
    },
  };
  const jobVarNamePrice = "ntrn_usdc_price";
  const jobVarPrice = {
    query: {
      kind: "amount",
      name: jobVarNamePrice,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(astroportSimulateNativeSwapMsg),
              contract_addr: astroportNtrnUsdcPairAddress,
            },
          },
        },
        selector: "$.return_amount",
      },
      reinitialize: false,
      encode: false,
    },
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
        // amount: swapAmount,
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
    expr: {
      decimal: {
        op: "gte",
        left: {
          ref: `$warp.variable.${jobVarNamePrice}`,
        },
        right: {
          simple: expectedReceivedAmount,
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

  const executeMsg = {
    create_job: {
      name: "astroport_yield_bearing_limit_order_swap_usdc_to_ntrn_from_pool",
      description: "woooooooo yield bearing limit order",
      labels: ["astroport", "mars"],
      // set account explicitly if we want to use sub account, otherwise it will use default account
      account: subAccountAddress,
      recurring: false,
      requeue_on_evict: false,
      reward: jobReward,
      vars: JSON.stringify([jobVarPrice, jobVarMarsBalance, jobVarAstroportSwapMsg]),
      condition: JSON.stringify(condition),
      // TODO: claim mars rewards if available and send back to owner's EOA
      msgs: JSON.stringify([JSON.stringify(withdrawFromMars), JSON.stringify(nativeSwap)]),
    },
  };

  const cosmosMsgCreateNewSubAccountCreateJob = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    executeMsg
  );

  // create a new sub account since we just used the first free sub account
  // this is optional if user has more free accounts
  const cosmosMsgCreateNewSubAccount = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_account: {
      is_sub_account: true,
    },
  });

  createSignBroadcastCatch(wallet, [
    cosmosMsgEoaDepositToSubAccount,
    cosmosMsgSubAccountDepositToMars,
    cosmosMsgCreateNewSubAccountCreateJob,
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
