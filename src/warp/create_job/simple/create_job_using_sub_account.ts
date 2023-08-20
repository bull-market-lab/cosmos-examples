import Big from "big.js";
import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpDefaultAccountAddress,
  getWarpJobCreationFeePercentage,
  getWarpFirstFreeSubAccountAddress,
} from "../../../util";
import { CHAIN_PREFIX, WARP_CONTROLLER_ADDRESS } from "../../../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(2);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const senderAddress = wallet1.key.accAddress(CHAIN_PREFIX);
const receiverAddress = wallet2.key.accAddress(CHAIN_PREFIX);

console.log("senderAddress", senderAddress);
console.log("receiverAddress", receiverAddress);

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async () => {
  const swapAmount = (100_000).toString();

  const jobReward = (50_000).toString();
  // creation fee + reward + potential eviction fee
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const lunaJobFee = Big(jobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    // .add(50_000) // eviction fee 0.05
    .toString();
  const swapAmountPlusFee = Big(swapAmount).add(lunaJobFee).toString();

  const freeSubAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, senderAddress);

  const bankSend = new MsgSend(senderAddress, freeSubAccountAddress, {
    uluna: swapAmountPlusFee,
  });

  const bankSendMsg = {
    bank: {
      send: {
        amount: [{ denom: "uluna", amount: swapAmount }],
        to_address: receiverAddress,
      },
    },
  };

  const condition = {
    expr: {
      block_height: {
        comparator: "0",
        op: "gt",
      },
    },
  };

  const createJob = new MsgExecuteContract(senderAddress, warpControllerAddress, {
    create_job: {
      name: "simple_send_luna_job_to_test_create_job_using_sub_account",
      description: "test create job using sub account",
      labels: [],
      recurring: false,
      requeue_on_evict: false,
      reward: jobReward,
      condition: JSON.stringify(condition),
      msgs: JSON.stringify([JSON.stringify(bankSendMsg)]),
      vars: JSON.stringify([]),
      // set account if we want to use sub account
      account: freeSubAccountAddress,
    },
  });

  createSignBroadcastCatch(wallet1, [bankSend, createJob]);
};

run();
