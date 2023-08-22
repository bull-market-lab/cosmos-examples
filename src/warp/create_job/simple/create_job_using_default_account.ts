import Big from "big.js";
import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForOneTimeJob,
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpDefaultAccountAddress,
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

console.log("senderAddress", senderAddress);
console.log("receiverAddress", receiverAddress);

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async () => {
  const swapAmount = (100_000).toString();

  const warpProtocolFee = await calculateWarpProtocolFeeForOneTimeJob();

  const warpDefaultAccount = await getWarpDefaultAccountAddress(lcd, senderAddress);

  const bankSend = new MsgSend(wallet1.key.accAddress(CHAIN_PREFIX), warpDefaultAccount, {
    uluna: Big(swapAmount).add(warpProtocolFee).toString(),
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
      name: "simple_send_luna_job_to_test_create_job_using_default_account",
      description: "test create job using default account",
      labels: [],
      // do not set account if we want to use default account
      //   account: freeSubAccountAddress,
      recurring: false,
      requeue_on_evict: false,
      reward: DEFAULT_JOB_REWARD,
      condition: JSON.stringify(condition),
      msgs: JSON.stringify([bankSendMsg]),
      vars: JSON.stringify([]),
    },
  });

  createSignBroadcastCatch(wallet1, [bankSend, createJob]);
};

run();
