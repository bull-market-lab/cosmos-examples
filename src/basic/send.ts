import { MsgSend } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";
import { CHAIN_PREFIX } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(2);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const receiver = "neutron1r623p6aqu6gupnhwvn8dhnwnt3p5tn90rdpvgq";

const send = async () => {
  const sendMsg = new MsgSend(wallet1.key.accAddress(CHAIN_PREFIX), receiver, {
    untrn: (1_500_000).toString(),
  });
  createSignBroadcastCatch(wallet1, [sendMsg]);
};

send();
