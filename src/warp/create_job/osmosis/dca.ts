import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForRecurringJob,
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpFirstFreeSubAccountAddress,
  queryWasmContractWithCatch,
  toBase64,
} from "../../../util";
import {
  OSMOSIS_SWAPPER_BY_MARS,
  CHAIN_DENOM,
  CHAIN_PREFIX,
  USDC_DENOM,
  WARP_CONTROLLER_ADDRESS,
  WARP_RESOLVER_ADDRESS,
} from "../../../env";
import { DEFAULT_JOB_REWARD } from "../../../constant";
import Big from "big.js";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const osmosisSwapperByMars = OSMOSIS_SWAPPER_BY_MARS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;
const warpResolverAddress = WARP_RESOLVER_ADDRESS!;

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

  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);

  const warpProtocolFee = await calculateWarpProtocolFeeForRecurringJob(
    0,
    DEFAULT_JOB_REWARD,
    dcaInterval,
    dcaNumber
  );

  /// =========== var ===========

  const jobVarNameNextExecution = "dca_swap_usdc_to_osmo_next_execution";
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
      encode: false,
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

  const osmosisNativeSwapMsg = {
    swap_exact_in: {
      coin_in: {
        denom: offeredTokenDenom,
        amount: singleSwapAmount,
      },
      denom_out: CHAIN_DENOM,
      slippage: maxSpread,
    },
  };
  const nativeSwap = {
    wasm: {
      execute: {
        contract_addr: osmosisSwapperByMars,
        msg: toBase64(osmosisNativeSwapMsg),
        funds: [{ denom: offeredTokenDenom, amount: singleSwapAmount }],
      },
    },
  };

  /// =========== cosmos msgs ===========

  const cosmosMsgEoaDepositToSubAccount = new MsgSend(myAddress, subAccountAddress, {
    [offeredTokenDenom]: totalSwapAmount,
    [CHAIN_DENOM]: warpProtocolFee,
  });

  const cosmosMsgCreateJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "osmosis_dca_order_usdc_to_osmo",
      description: "DCA order",
      labels: [],
      account: subAccountAddress,
      recurring: true,
      requeue_on_evict: true,
      reward: DEFAULT_JOB_REWARD,
      vars: JSON.stringify([jobVarAlreadyRunCounter, jobVarNextExecution]),
      condition: JSON.stringify(condition),
      terminate_condition: JSON.stringify(terminateCondition),
      msgs: JSON.stringify([JSON.stringify(nativeSwap)]),
      // needs to specify assets_to_withdraw as osmosis swapper contract by mars doesn't support transfer swapped token to another address
      // NOTE: this must not be the asset we are swapping, otherwise it will be withdrawn and follow up jobs will fail
      assets_to_withdraw: [{ native: CHAIN_DENOM }],
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
    cosmosMsgCreateJob,
    cosmosMsgCreateNewSubAccount,
  ]);

  /// =========== debug ===========

  // queryWasmContractWithCatch(lcd, warpResolverAddress, {
  //   query_validate_job_creation: {
  //     vars: JSON.stringify([jobVarAlreadyRunCounter, jobVarNextExecution]),
  //     condition: JSON.stringify(condition),
  //     terminate_condition: JSON.stringify(terminateCondition),
  //     msgs: JSON.stringify([JSON.stringify(nativeSwap)]),
  //   },
  // }).then((res) => console.log(res));
};

run();
