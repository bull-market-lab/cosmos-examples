import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForOneTimeJob,
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
  OSMOSIS_SWAPPER_BY_MARS,
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

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const marsRedBankAddress = MARS_RED_BANK_ADDRESS!;

const usdcDenom = USDC_DENOM!;

const osmosisSwapperByMars = OSMOSIS_SWAPPER_BY_MARS!;

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

  // console.log("myAddress", myAddress);
  // const tmp = await lcd.bank.balance(myAddress).then((res) => {
  //   console.log(res);
  // })

  const warpResolverAddress = WARP_RESOLVER_ADDRESS!;

  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);

  const warpProtocolFee = await calculateWarpProtocolFeeForOneTimeJob();

  /// =========== vars ===========

  const osmosisSimulateNativeSwapMsg = {
    estimate_exact_in_swap: {
      coin_in: {
        denom: offeredTokenDenom,
        amount: swapAmount,
      },
      denom_out: CHAIN_DENOM,
    },
  };
  const jobVarNamePrice = "osmo_usdc_price";
  const jobVarPrice = {
    query: {
      kind: "amount",
      name: jobVarNamePrice,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(osmosisSimulateNativeSwapMsg),
              contract_addr: osmosisSwapperByMars,
            },
          },
        },
        selector: "$.amount",
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

  const osmosisNativeSwapMsg = {
    swap_exact_in: {
      coin_in: {
        denom: offeredTokenDenom,
        amount: `$warp.variable.${jobVarNameMarsBalance}`,
      },
      denom_out: CHAIN_DENOM,
      slippage: maxSpread,
    },
  };
  const jobVarNameOsmosisSwapMsg = "osmosis_swap_msg";
  const jobVarOsmosisSwapMsg = {
    static: {
      kind: "string",
      name: jobVarNameOsmosisSwapMsg,
      value: JSON.stringify(osmosisNativeSwapMsg),
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
        contract_addr: osmosisSwapperByMars,
        msg: `$warp.variable.${jobVarNameOsmosisSwapMsg}`,
        funds: [{ denom: offeredTokenDenom, amount: `$warp.variable.${jobVarNameMarsBalance}` }],
      },
    },
  };

  /// =========== cosmos msgs ===========

  const cosmosMsgEoaDepositToSubAccount = new MsgSend(myAddress, subAccountAddress, {
    [offeredTokenDenom]: swapAmount,
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
              funds: [{ denom: offeredTokenDenom, amount: swapAmount }],
            },
          },
        },
      ],
    },
  });

  const cosmosMsgCreateJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "osmosis_yield_bearing_limit_order_swap_usdc_to_osmos_from_pool",
      description: "woooooooo yield bearing limit order",
      labels: ["osmosis", "mars"],
      // set account explicitly if we want to use sub account, otherwise it will use default account
      account: subAccountAddress,
      recurring: false,
      requeue_on_evict: false,
      reward: DEFAULT_JOB_REWARD,
      vars: JSON.stringify([jobVarPrice, jobVarMarsBalance, jobVarOsmosisSwapMsg]),
      condition: JSON.stringify(condition),
      // TODO: claim mars rewards if available and send back to owner's EOA
      msgs: JSON.stringify([withdrawFromMars, nativeSwap]),
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
  //       jobVarOsmosisSwapMsg,
  //       // jobVarOsmosisSwapFund,
  //     ]),
  //     condition: JSON.stringify(condition),
  //     msgs: JSON.stringify([withdrawFromMars, nativeSwap]),
  //     // msgs: JSON.stringify([nativeSwap]),
  //   },
  // }).then((res) => console.log(res));

  // const hydratedVars = await queryWasmContractWithCatch(lcd, warpResolverAddress, {
  //   query_hydrate_vars: {
  //     // vars: JSON.stringify([jobVarPrice, jobVarMarsBalance, jobVarOsmosisSwapMsg, jobVarOsmosisSwapFund]),
  //     vars: JSON.stringify([jobVarPrice, jobVarMarsBalance, jobVarOsmosisSwapMsg])
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
  //     msgs: JSON.stringify([withdrawFromMars, nativeSwap]),
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
