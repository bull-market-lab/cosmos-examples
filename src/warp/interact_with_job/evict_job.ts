import { CHAIN_PREFIX } from "../../env";
import { getLCD, getMnemonicKey, getWallet, initWarpSdk, printAxiosError } from "../../util";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk();
const owner = wallet.key.accAddress(CHAIN_PREFIX);

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
