import { LUNA } from '@terra-money/warp-sdk';
import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from '../../util';

const mnemonicKey = getMnemonicKeyOld(true);
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);

const amount = 2_970_000;

const run = async () => {
  warpSdk
    .withdrawFromAccount(wallet.key.accAddress, wallet.key.accAddress, LUNA, amount.toString())
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
