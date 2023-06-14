import { MsgSend, Coins } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";
import { CHAIN_PREFIX, VALIDATOR_ADDRESS } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(true);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const receiver = "terra1903a3ymy0klyzgvf2eguype6lvv83v0y50w48y";

const send = async () => {
  const stakeMsg = new MsgSend(wallet1.key.accAddress(CHAIN_PREFIX), receiver, {
    uluna: (100_500_000).toString(),
  });
  createSignBroadcastCatch(wallet1, [stakeMsg]);
};

send();
