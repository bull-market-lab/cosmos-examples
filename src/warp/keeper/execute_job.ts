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
const owner = wallet.key.accAddress;

const run = async () => {
  warpSdk
    .executeJob(owner, '24')
    .then((txInfo) => console.log(txInfo))
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
