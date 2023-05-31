import { LUNA, CW20Token, CW20Addr } from '@terra-money/warp-sdk';
import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from '../../util';
import { ASTRO_TOKEN_ADDRESS } from '../../env';

const mnemonicKey = getMnemonicKeyOld();
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);

const amount = 0_060_000;
const nativeToken = LUNA;
const astro: CW20Token = {
  key: 'astro',
  name: 'Astro',
  symbol: 'ASTRO',
  icon: '',
  decimals: 6,
  type: 'cw20',
  protocol: 'astroport',
  token: ASTRO_TOKEN_ADDRESS! as CW20Addr,
};

const run = async () => {
  warpSdk
    .withdrawFromAccount(
      wallet.key.accAddress,
      wallet.key.accAddress,
      nativeToken,
      amount.toString()
    )
    // .withdrawFromAccount(wallet.key.accAddress, wallet.key.accAddress, astro, amount.toString())
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
