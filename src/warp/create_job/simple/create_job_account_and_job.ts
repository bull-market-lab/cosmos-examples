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
  const lunaSwapAmount = (100_000).toString();

  const lunaJobReward = (50_000).toString();
  // creation fee + reward + potential eviction fee
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const lunaJobFee = Big(lunaJobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    // .add(50_000) // eviction fee 0.05
    .toString();

  const swapAmountPlusFee = Big(lunaSwapAmount).add(lunaJobFee).toString();

  const bankSend = {
    bank: {
      send: {
        amount: [{ denom: "uluna", amount: lunaSwapAmount }],
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

  const createJobAccountAndJob = new MsgExecuteContract(
    senderAddress,
    warpControllerAddress,
    {
      create_account_and_job: {
        name: "simple_send_luna_job_to_test_create_job_account_and_job_in_one_msg",
        description: "test create_job_account_and_job in one msg",
        labels: [],
        recurring: false,
        requeue_on_evict: false,
        reward: lunaJobReward,
        condition: JSON.stringify(condition),
        msgs: JSON.stringify([JSON.stringify(bankSend)]),
        vars: JSON.stringify([]),
        is_job_account: true,
      },
    },
    { uluna: swapAmountPlusFee }
  );

  createSignBroadcastCatch(wallet1, [createJobAccountAndJob]);
};

run();
