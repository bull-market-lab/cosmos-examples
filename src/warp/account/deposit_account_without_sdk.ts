import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpFirstFreeSubAccountAddress,
} from "../../util";
import { CHAIN_PREFIX } from "../../env";
import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const lunaAmount = (100_000).toString();

const run = async () => {
  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);

  const bankSend = new MsgSend(myAddress, subAccountAddress, {
    uluna: lunaAmount,
  });

  const executeMsg = {
    generic: {
      msgs: [
        // withdraw native token
        {
          bank: {
            send: {
              amount: [{ denom: "uluna", amount: lunaAmount }],
              to_address: myAddress,
            },
          },
        },
        // // withdraw cw20
        // {
        //   wasm: {
        //     execute: {
        //       contract_addr: astroTokenAddress,
        //       msg: toBase64({
        //         transfer: {
        //           recipient: myAddress,
        //           amount: astroAmount,
        //         },
        //       }),
        //       funds: [],
        //     },
        //   },
        // },
      ],
    },
  };
  const contractSend = new MsgExecuteContract(myAddress, subAccountAddress, executeMsg);

  createSignBroadcastCatch(wallet, [bankSend, contractSend]);
};

run();
