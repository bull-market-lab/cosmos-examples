import { warp_controller } from "@terra-money/warp-sdk";
import {
  LUNA_TOKEN,
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

const run = async () => {
  const warpAccountAddress = await warpSdk
    .account(wallet.key.accAddress(CHAIN_PREFIX))
    .then((warp_account: warp_controller.Account) => {
      return warp_account.account;
    });

  const amount = (4_000_000).toString();

  warpSdk
    .depositToAccount(wallet.key.accAddress(CHAIN_PREFIX), warpAccountAddress, LUNA_TOKEN, amount)
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
