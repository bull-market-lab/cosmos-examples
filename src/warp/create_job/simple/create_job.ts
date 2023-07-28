// create immediately executable job and delay job (executable after 5 blocks, about 30s)
import { Coins, CreateTxOptions, MsgExecuteContract } from "@terra-money/feather.js";
import {
  getCurrentBlockHeight,
  getLCD,
  getMnemonicKey,
  getWallet,
  initWarpSdk,
  printAxiosError,
} from "../../../util";
import { warp_controller } from "@terra-money/warp-sdk";
import { CHAIN_ID, CHAIN_PREFIX, WARP_CONTROLLER_ADDRESS } from "../../../env";

function executeMsg<T extends {}>(sender: string, contract: string, msg: T, coins?: Coins.Input) {
  return new MsgExecuteContract(sender, contract, msg, coins);
}

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk();
const owner = wallet.key.accAddress(CHAIN_PREFIX);

const amount1Luna = (1_000_000).toString();

const run = async () => {
  // send money to myself
  const msg = {
    bank: {
      send: {
        amount: [{ denom: "uluna", amount: amount1Luna }],
        to_address: owner,
      },
    },
  };

  const conditionAlwaysTrue: warp_controller.Condition = {
    expr: {
      block_height: {
        comparator: "0",
        op: "gt",
      },
    },
  };

  const conditionAlwaysFalse: warp_controller.Condition = {
    expr: {
      block_height: {
        comparator: "0",
        op: "lt",
      },
    },
  };

  const delayBlock = 5;
  const blockHeightDelay = BigInt(await getCurrentBlockHeight(lcd)) + BigInt(delayBlock);
  const conditionDelay5BlocksTrue: warp_controller.Condition = {
    expr: {
      block_height: {
        comparator: blockHeightDelay.toString(),
        op: "gt",
      },
    },
  };

  const createJobMsgConditionAlwaysTrue: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: "test_job_condition_always_true",
    description: "test_job_condition_always_true",
    labels: [],
    recurring: false,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysFalse: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: "test_job_condition_always_false",
    description: "test_job_condition_always_false",
    labels: [],
    recurring: false,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionDelay5BlocksTrue: warp_controller.CreateJobMsg = {
    condition: conditionDelay5BlocksTrue,
    name: "test_delay",
    description: "test_delay",
    labels: [],
    recurring: false,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysTrueRequeueOnEvict: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: "test_job_condition_always_true_requeue_on_evict_job",
    description: "test_job_condition_always_true_requeue_on_evict_job",
    labels: [],
    recurring: false,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysFalseRequeueOnEvict: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: "test_job_condition_always_false_requeue_on_evict_job",
    description: "test_job_condition_always_false_requeue_on_evict_job",
    labels: [],
    recurring: false,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysTrueRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: "test_job_condition_always_true_recurring",
    description: "test_job_condition_always_true_recurring",
    labels: [],
    recurring: true,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  // this should only be evicted but never executed
  const createJobMsgConditionAlwaysFalseRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: "test_job_condition_always_false_recurring",
    description: "test_job_condition_always_false_recurring",
    labels: [],
    recurring: true,
    requeue_on_evict: false,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysTrueRequeueAndRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysTrue,
    name: "test_job_condition_always_true_requeue_and_recurring",
    description: "test_job_condition_always_true_requeue_and_recurring",
    labels: [],
    recurring: true,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  const createJobMsgConditionAlwaysFalseRequeueAndRecurring: warp_controller.CreateJobMsg = {
    condition: conditionAlwaysFalse,
    name: "test_job_condition_always_false_requeue_and_recurring",
    description: "test_job_condition_always_false_requeue_and_recurring",
    labels: [],
    recurring: true,
    requeue_on_evict: true,
    vars: [],
    reward: amount1Luna,
    msgs: [JSON.stringify(msg)],
  };

  // manually construct msg to create multiple job in 1 tx
  const cosmosMsgs = [
    createJobMsgConditionAlwaysTrue,
    createJobMsgConditionAlwaysFalse,
    createJobMsgConditionDelay5BlocksTrue,
    createJobMsgConditionAlwaysTrueRequeueOnEvict,
    createJobMsgConditionAlwaysFalseRequeueOnEvict,
    createJobMsgConditionAlwaysTrueRecurring,
    createJobMsgConditionAlwaysFalseRecurring,
    createJobMsgConditionAlwaysTrueRequeueAndRecurring,
    createJobMsgConditionAlwaysFalseRequeueAndRecurring,
  ].map((msg) =>
    executeMsg<Extract<warp_controller.ExecuteMsg, { create_job: warp_controller.CreateJobMsg }>>(
      owner,
      WARP_CONTROLLER_ADDRESS!,
      {
        create_job: msg,
      }
    )
  );

  // sdk can only create 1 job in 1 tx
  // warpSdk
  //   .createJob(owner, createJobMsg)
  //   .then((txInfo) => {
  //     console.log(txInfo);
  //     console.log('created job');
  //   }).catch(e => {
  //     printAxiosError(e)
  //   })

  // manually create jobs
  const txOptions: CreateTxOptions = {
    msgs: cosmosMsgs,
    chainID: CHAIN_ID,
  };

  const tx = await wallet
    .createAndSignTx(txOptions)
    .then((tx) => wallet.lcd.tx.broadcast(tx, CHAIN_ID))
    .then((txInfo) => {
      console.log(txInfo);
      console.log("created all jobs");
    })
    .catch((e) => {
      printAxiosError(e);
      // throw e
    });
};

run();
