import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from "../../util";

const mnemonicKey = getMnemonicKeyOld(1);
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);
const owner = wallet.key.accAddress;

const run = async (jobId?: string) => {
  if (!jobId) {
    jobId = await warpSdk
      .jobs()
      .then((jobs) => jobs[0].id)
      .catch((e) => {
        printAxiosError(e);
        throw e;
      });
  }
  console.log("latest jobId", jobId);
  warpSdk
    .executeJob(owner, jobId)
    .then((txInfo) => console.log(txInfo))
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

// run("11");
run();
