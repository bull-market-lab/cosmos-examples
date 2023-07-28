import { MsgExecuteContract } from "@terra-money/feather.js";
import { CHAIN_PREFIX, WARP_CONTROLLER_ADDRESS } from "../../env";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  initWarpSdk,
  printAxiosError,
} from "../../util";

const mnemonicKey = getMnemonicKey(2);
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk();
const sender = wallet.key.accAddress(CHAIN_PREFIX);
const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async (jobId?: string) => {
  if (!jobId) {
    // jobId = await warpSdk
    //   .jobs()
    //   .then((jobs) => jobs[0].id)
    //   .catch((e) => {
    //     printAxiosError(e);
    //     throw e;
    //   });
    jobId = await lcd.wasm
      .contractQuery(warpControllerAddress, {
        query_jobs: {},
      })
      .then((res) => {
        // @ts-ignore
        return res.jobs[0].id;
      });

    console.log("latest jobId", jobId);
  }

  const executeJob = new MsgExecuteContract(sender, warpControllerAddress, {
    execute_job: {
      id: jobId,
    },
  });

  createSignBroadcastCatch(wallet, [executeJob]);

  // warpSdk
  //   .executeJob(sender, jobId)
  //   .then((txInfo) => console.log(txInfo))
  //   .catch((e) => {
  //     printAxiosError(e);
  //     throw e;
  //   });
};

// run("1");
run();
