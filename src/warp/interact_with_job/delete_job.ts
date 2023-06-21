import { warp_controller } from "@terra-money/warp-sdk";
import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from "../../util";
import { CreateTxOptions, Coins, MsgExecuteContract } from "@terra-money/terra.js";

function executeMsg<T extends {}>(sender: string, contract: string, msg: T, coins?: Coins.Input) {
  return new MsgExecuteContract(sender, contract, msg, coins);
}

const mnemonicKey = getMnemonicKeyOld(3);
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);
const owner = wallet.key.accAddress;

const run = async (jobId?: string) => {
  if (jobId) {
    console.log(`deleting job ${jobId}`);
    warpSdk.deleteJob(owner, jobId);
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
          >(owner, warpSdk.controllerContract, {
            delete_job: msg,
          })
        );
        // manually delete jobs
        const txOptions: CreateTxOptions = {
          msgs: cosmosMsgs,
        };

        return wallet.createAndSignTx(txOptions);
      })
      .then((tx) => wallet.lcd.tx.broadcast(tx))
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

run("12");
