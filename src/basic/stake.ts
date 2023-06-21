import { MsgDelegate, Coin } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";
import { CHAIN_PREFIX, VALIDATOR_ADDRESS } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(2);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const granter = wallet1.key.accAddress(CHAIN_PREFIX);
let grantee = wallet2.key.accAddress(CHAIN_PREFIX);

const stake = async () => {
  const stakeMsg = new MsgDelegate(granter, VALIDATOR_ADDRESS, new Coin("uluna", 10_500_000));
  createSignBroadcastCatch(wallet1, [stakeMsg]);
};

stake();
