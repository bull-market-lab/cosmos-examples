import { warp_controller } from "@terra-money/warp-sdk";
import { getLCD, getMnemonicKey, getWallet, initWarpSdk, printAxiosError } from "../../util";
import { ASTRO_TOKEN_ADDRESS, CHAIN_PREFIX } from "../../env";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const warpSdk = initWarpSdk();

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
    .createAccount(wallet.key.accAddress(CHAIN_PREFIX), funds)
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

createAccountWithFunds();
