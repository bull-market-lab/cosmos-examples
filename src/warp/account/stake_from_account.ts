import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpAccountAddress,
} from "../../util";
import { CHAIN_DENOM, CHAIN_PREFIX, VALIDATOR_ADDRESS } from "../../env";
import { MsgExecuteContract } from "@terra-money/feather.js";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const lunaAmount = (10_000_000).toString();

const stake = async () => {
  const warpAccountAddress = await getWarpAccountAddress(lcd, myAddress);
  const executeMsg = {
    msgs: [
      {
        staking: {
          delegate: {
            validator: VALIDATOR_ADDRESS,
            amount: {
              denom: CHAIN_DENOM,
              amount: lunaAmount,
            },
          },
        },
      },
    ],
  };
  const contractSend = new MsgExecuteContract(myAddress, warpAccountAddress, executeMsg);

  createSignBroadcastCatch(wallet, [contractSend]);
};

stake();
