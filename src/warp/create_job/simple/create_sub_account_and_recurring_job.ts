import Big from "big.js";
import { MsgExecuteContract } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForRecurringJob,
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
} from "../../../util";
import { CHAIN_PREFIX, WARP_CONTROLLER_ADDRESS } from "../../../env";
import { DEFAULT_JOB_REWARD } from "../../../constant";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(2);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const senderAddress = wallet1.key.accAddress(CHAIN_PREFIX);
const receiverAddress = wallet2.key.accAddress(CHAIN_PREFIX);

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async () => {
  const totalPaymentAmount = (1_000_000).toString();

  const totalPaymentCount = (5).toString();

  // 86400 is 1 day in seconds
  // const dcaInterval = 60 * 60 * 24 * 7;
  // make it shorter for testing
  const paymentInterval = (20).toString();
  // initial value is current timestamp
  const paymentStartTime = String(Math.floor(Date.now() / 1000));

  // round down to 3 decimal places to avoid running out of fund
  const singlePaymentAmount = Big(totalPaymentAmount).div(totalPaymentCount).round(3, 0).toString();

  const warpProtocolFee = await calculateWarpProtocolFeeForRecurringJob(
    0,
    DEFAULT_JOB_REWARD,
    paymentInterval,
    totalPaymentCount
  );

  /// =========== var ===========

  const jobVarNameNextExecution = "next_payment_execution";
  const jobVarNextExecution = {
    static: {
      kind: "uint", // NOTE: it's better to use uint instead of timestamp to keep it consistent with condition
      name: jobVarNameNextExecution,
      value: paymentStartTime,
      update_fn: {
        // update value to current timestamp + paymentInterval, i.e. make next execution 1 day later
        on_success: {
          uint: {
            expr: {
              left: {
                simple: paymentInterval,
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

  const jobVarNameAlreadyRunCounter = "payment_already_made_counter";
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
              simple: totalPaymentCount,
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
          simple: totalPaymentCount,
        },
      },
    },
  };

  /// =========== job msgs ===========

  const bankSend = {
    bank: {
      send: {
        amount: [{ denom: "uluna", amount: singlePaymentAmount }],
        to_address: receiverAddress,
      },
    },
  };

  /// ========== cosmos msgs ==========

  const createSubAccountAndRecurringJob = new MsgExecuteContract(
    senderAddress,
    warpControllerAddress,
    {
      create_account_and_job: {
        name: "recurring_payment_using_sub_account",
        description: "recurring payment job using job account",
        labels: [],
        recurring: true,
        requeue_on_evict: true,
        reward: DEFAULT_JOB_REWARD,
        condition: JSON.stringify(condition),
        terminate_condition: JSON.stringify(terminateCondition),
        msgs: JSON.stringify([JSON.stringify(bankSend)]),
        vars: JSON.stringify([jobVarNextExecution, jobVarAlreadyRunCounter]),
        is_sub_account: true,
      },
    },
    {
      uluna: Big(warpProtocolFee).add(Big(totalPaymentAmount)).toString(),
    }
  );

  /// ========== sign and broadcast ==========

  createSignBroadcastCatch(wallet1, [createSubAccountAndRecurringJob]);
};

run();
