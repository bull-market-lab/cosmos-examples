import { LUNA, CW20Token, CW20Addr } from "@terra-money/warp-sdk";
import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from "../../util";
import { ASTRO_TOKEN_ADDRESS } from "../../env";

const mnemonicKey = getMnemonicKeyOld(3);
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);

const nativeAmount = 1_900_000;
const nativeToken = LUNA;
const cw20Amount = 20_000_000;
const astro: CW20Token = {
  key: "astro",
  name: "Astro",
  symbol: "ASTRO",
  icon: "",
  decimals: 6,
  type: "cw20",
  protocol: "astroport",
  token: ASTRO_TOKEN_ADDRESS! as CW20Addr,
};

const run = async () => {
  warpSdk
    // .withdrawFromAccount(
    //   wallet.key.accAddress,
    //   wallet.key.accAddress,
    //   nativeToken,
    //   nativeAmount.toString()
    // )
    .withdrawFromAccount(wallet.key.accAddress, wallet.key.accAddress, astro, cw20Amount.toString())
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

run();
