import { MsgExecAuthorized, MsgSend } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";
import { CHAIN_PREFIX } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(2);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const lunaAmount1 = (1_000_000).toString();

const granter = wallet1.key.accAddress(CHAIN_PREFIX);
const grantee = wallet2.key.accAddress(CHAIN_PREFIX);

const execute = async () => {
  const execAuthorizedMsg = new MsgExecAuthorized(grantee, [
    // send from granter to grantee
    new MsgSend(granter, grantee, { uluna: lunaAmount1 }),
  ]);

  // wallet2 is grantee
  createSignBroadcastCatch(wallet2, [execAuthorizedMsg]);
};

execute();
