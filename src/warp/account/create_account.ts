import { MsgExecuteContract } from "@terra-money/feather.js";
import { CHAIN_DENOM, CHAIN_PREFIX, WARP_CONTROLLER_ADDRESS } from "../../env";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  initWarpSdk,
  printAxiosError,
} from "../../util";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);
// const warpSdk = initWarpSdk();

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async () => {
  // warpSdk
  //   .createAccount(wallet.key.accAddress(CHAIN_PREFIX))
  //   .then((txInfo) => {
  //     console.log(txInfo);
  //   })
  //   .catch((e) => {
  //     printAxiosError(e);
  //     throw e;
  //   });

  const executeCreateAccountMsg = {
    create_account: {},
  };
  const createAccount = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    executeCreateAccountMsg
  );

  const executeCreateSubAccountMsg = {
    create_account: {
      is_sub_account: true,
    },
  };
  const createSubAccount = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    executeCreateSubAccountMsg
  );

  createSignBroadcastCatch(wallet, [createAccount, createSubAccount]);
};
run();
