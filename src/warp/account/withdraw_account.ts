import {
  ASTRO_TOKEN,
  getLCD,
  getMnemonicKey,
  getWallet,
  initWarpSdk,
  printAxiosError,
} from "../../util";
import { CHAIN_PREFIX } from "../../env";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk();

const nativeAmount = 1_900_000;
const cw20Amount = 20_000_000;

const run = async () => {
  warpSdk
    // .withdrawFromAccount(
    //   wallet.key.accAddress,
    //   wallet.key.accAddress,
    //   nativeToken,
    //   nativeAmount.toString()
    // )
    .withdrawFromAccount(
      wallet.key.accAddress(CHAIN_PREFIX),
      wallet.key.accAddress(CHAIN_PREFIX),
      ASTRO_TOKEN,
      cw20Amount.toString()
    )
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
