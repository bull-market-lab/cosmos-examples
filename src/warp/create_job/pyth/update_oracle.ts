// ===================== PLEASE READ THIS =====================
/*

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
  PYTH_ADDRESS,
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

const pythAddress = PYTH_ADDRESS!;

const run = async () => {
  const dcaNumber = (5).toString();

  // 86400 is 1 day in seconds
  // const dcaInterval = 60 * 60 * 24 * 7;
  // make it shorter for testing, 30 seconds
  const dcaInterval = (30).toString();
  // initial value is current timestamp
  const dcaStartTime = String(Math.floor(Date.now() / 1000));

  const warpResolverAddress = WARP_RESOLVER_ADDRESS!;

  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);

  const warpProtocolFee = await calculateWarpProtocolFeeForRecurringJob(
    0,
    DEFAULT_JOB_REWARD,
    dcaInterval,
    dcaNumber
  );

  // each pyth update needs 1 native denom fee, e.g. on Neutron it's 1 untrn
  const pythSingleUpdateFee = "1";
  const totalPythUpdateFee = Big(pythSingleUpdateFee).times(dcaNumber).toString();

  /// =========== vars ===========

  const jobVarNameNextExecution = "update_pyth_oracle_next_execution";
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

  const jobVarNameAlreadyRunCounter = "update_pyth_oracle_already_run_counter";
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

  //   const updatePythOracleMsg = {
  //     update_price_feeds: {
  //       data: [
  //         `$warp.variable.${jobVarNamePythData}`,
  //       ],
  //     },
  //   };
  const jobVarNamePythData = "astroport_swap_msg";
  const jobVarPythData = {
    external: {
      kind: "string",
      name: jobVarNamePythData,
      encode: false,
      init_fn: {
        url: "https://xc-mainnet.pyth.network/api/latest_vaas",
        method: "get",
      },
      reinitialize: true,
      //   value: JSON.stringify(updatePythOracleMsg),
      // update_fn: {}
    },
  };

  const updatePythOracleMsg = {
    update_price_feeds: {
      // TODO: check if this is per price feed, if we want to get all price feeds, we may need json array var kind
      // data: `$warp.variable.${jobVarNamePythDataArray}`,
      data: [`$warp.variable.${jobVarNamePythData}`],
    },
  };
  const jobVarNameUpdatePythOracleMsg = "astroport_swap_msg";
  const jobVarUpdatePythOracleMsg = {
    static: {
      kind: "string",
      name: jobVarNameUpdatePythOracleMsg,
      value: JSON.stringify(updatePythOracleMsg),
      encode: true,
    },
  };

  /// =========== condition ===========

  const condition = {
    and: [
      {
        expr: {
          uint: {
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

  const updatePythOracle = {
    wasm: {
      execute: {
        contract_addr: pythAddress,
        msg: `$warp.variable.${jobVarNameUpdatePythOracleMsg}`,
        funds: [{ denom: CHAIN_DENOM, amount: pythSingleUpdateFee }],
      },
    },
  };

  /// =========== cosmos msgs ===========

  const cosmosMsgEoaDepositToSubAccount = new MsgSend(myAddress, subAccountAddress, {
    [CHAIN_DENOM]: Big(warpProtocolFee).add(totalPythUpdateFee).toString(),
  });

  const cosmosMsgCreateJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "update_pyth_oracle",
      description: "periodically update pyth oracle",
      labels: ["pyth"],
      // set account explicitly if we want to use sub account, otherwise it will use default account
      account: subAccountAddress,
      recurring: true,
      requeue_on_evict: true,
      reward: DEFAULT_JOB_REWARD,
      vars: JSON.stringify([
        jobVarAlreadyRunCounter,
        jobVarNextExecution,
        jobVarPythData,
        jobVarUpdatePythOracleMsg,
      ]),
      condition: JSON.stringify(condition),
      terminate_condition: JSON.stringify(terminateCondition),
      msgs: JSON.stringify([updatePythOracle]),
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
    // haha we can even deposit to mars and withdraw little by little for each execution
    // take the idea of yield bearing DCA
    // cosmosMsgSubAccountDepositToMars,
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
  //     msgs: JSON.stringify([withdrawFromMars, nativeSwap]),
  //     // msgs: JSON.stringify([nativeSwap]),
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
