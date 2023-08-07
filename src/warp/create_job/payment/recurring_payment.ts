import Big from "big.js";
import { MsgExecuteContract } from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpJobCreationFeePercentage,
} from "../../../util";
import { CHAIN_PREFIX, WARP_CONTROLLER_ADDRESS } from "../../../env";

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

  const totalPaymentCount = (2).toString();

  // 86400 is 1 day in seconds
  // const dcaInterval = 60 * 60 * 24 * 7;
  // make it shorter for testing
  const paymentInterval = (20).toString();
  // initial value is current timestamp
  const paymentStartTime = String(Math.floor(Date.now() / 1000));

  // round down to 3 decimal places to avoid running out of fund
  const singlePaymentAmount = Big(totalPaymentAmount).div(totalPaymentCount).round(3, 0).toString();

  const jobReward = (500_000).toString();
  // creation fee + reward + potential eviction fee
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const lunaJobFee = Big(jobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    // .add(50_000) // eviction fee 0.05
    .mul(totalPaymentCount)
    .toString();

  const createWarpAccountIfNotExistAndFundAccount = new MsgExecuteContract(
    senderAddress,
    warpControllerAddress,
    {
      create_account: {},
    },
    {
      uluna: Big(lunaJobFee).add(Big(totalPaymentAmount)).toString(),
    }
  );

  const bankSend = {
    bank: {
      send: {
        amount: [{ denom: "uluna", amount: singlePaymentAmount }],
        to_address: receiverAddress,
      },
    },
  };

  const jobVarNameNextExecution = "next-payment-execution";
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
    },
  };

  const jobVarNameAlreadyRunCounter = "payment-already-made-counter";
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
  };

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

  const createJob = new MsgExecuteContract(senderAddress, warpControllerAddress, {
    create_job: {
      name: "recurring_payment",
      description: "recurring payment job",
      labels: [],
      recurring: true,
      requeue_on_evict: true,
      reward: jobReward,
      condition: JSON.stringify(condition),
      // terminate_condition: JSON.stringify(terminateCondition),
      msgs: JSON.stringify([JSON.stringify(bankSend)]),
      vars: JSON.stringify([
        // JSON.stringify(jobVarNextExecution),
        // JSON.stringify(jobVarAlreadyRunCounter),
        jobVarNextExecution,
        jobVarAlreadyRunCounter,
      ]),
    },
  });

  createSignBroadcastCatch(wallet1, [createWarpAccountIfNotExistAndFundAccount, createJob]);
};

run();
