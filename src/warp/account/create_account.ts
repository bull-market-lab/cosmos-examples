import { CHAIN_PREFIX } from "../../env";
import { getLCD, getMnemonicKey, getWallet, initWarpSdk, printAxiosError } from "../../util";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk();

const run = async () => {
  warpSdk
    .createAccount(wallet.key.accAddress(CHAIN_PREFIX))
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};
run();
