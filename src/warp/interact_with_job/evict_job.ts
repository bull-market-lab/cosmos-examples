import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from "../../util";

const mnemonicKey = getMnemonicKeyOld();
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);
const owner = wallet.key.accAddress;

const run = async () => {
  warpSdk
    .evictJob(owner, "5")
    .then((txInfo) => {
      console.log(txInfo);
      console.log("evicted job");
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
