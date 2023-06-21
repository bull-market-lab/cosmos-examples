import { warp_controller } from "@terra-money/warp-sdk";
import {
  getLCDOld,
  getMnemonicKeyOld,
  getWalletOld,
  initWarpSdk,
  printAxiosError,
} from "../../util";
import { ASTRO_TOKEN_ADDRESS } from "../../env";

const mnemonicKey = getMnemonicKeyOld();
const lcd = getLCDOld();
const wallet = getWalletOld(lcd, mnemonicKey);
const warpSdk = initWarpSdk(lcd, wallet);

const astroAmount1 = (1_000_000).toString();
const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const createAccountWithFunds = async () => {
  const funds: warp_controller.Fund[] = [
    {
      cw20: {
        amount: astroAmount1.toString(),
        contract_addr: astroTokenAddress,
      },
    },
  ];
  warpSdk
    .createAccount(wallet.key.accAddress, funds)
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

createAccountWithFunds();
