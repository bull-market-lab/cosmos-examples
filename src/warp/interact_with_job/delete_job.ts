import { warp_controller } from "@terra-money/warp-sdk";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  initWarpSdk,
  printAxiosError,
} from "../../util";
import { Coins, CreateTxOptions, MsgExecuteContract } from "@terra-money/feather.js";
import { CHAIN_ID, CHAIN_PREFIX, WARP_CONTROLLER_ADDRESS } from "../../env";
// import { CreateTxOptions, Coins, MsgExecuteContract } from "@terra-money/terra.js";

function executeMsg<T extends {}>(sender: string, contract: string, msg: T, coins?: Coins.Input) {
  return new MsgExecuteContract(sender, contract, msg, coins);
}

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk();
const sender = wallet.key.accAddress(CHAIN_PREFIX);
const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async (jobId?: string) => {
  if (jobId) {
    console.log(`deleting job ${jobId}`);
    // warpSdk.deleteJob(owner, jobId);
    const deleteJob = new MsgExecuteContract(sender, warpControllerAddress, {
      delete_job: {
        id: jobId,
      },
    });

    createSignBroadcastCatch(wallet, [deleteJob]);
  } else {
    // delete all jobs on first page (50 jobs)
    // since all jobs are created by tester this should delete all pending jobs
    // this is for local test only, as we can only delete our own jobs
    warpSdk
      .jobs()
      .then((jobs) => {
        const deleteJobMsgs: warp_controller.DeleteJobMsg[] = jobs.map((job) => {
          return { id: job.id };
        });
        const cosmosMsgs = deleteJobMsgs.map((msg) =>
          executeMsg<
            Extract<warp_controller.ExecuteMsg, { delete_job: warp_controller.DeleteJobMsg }>
          >(sender, WARP_CONTROLLER_ADDRESS!, {
            delete_job: msg,
          })
        );
        // manually delete jobs
        const txOptions: CreateTxOptions = {
          msgs: cosmosMsgs,
          chainID: CHAIN_ID,
        };

        return wallet.createAndSignTx(txOptions);
      })
      .then((tx) => wallet.lcd.tx.broadcast(tx, CHAIN_ID))
      .then((txInfo) => {
        console.log(txInfo);
        console.log("created all jobs");
      })
      .catch((e) => {
        printAxiosError(e);
        throw e;
      });
  }
};

run("1");
