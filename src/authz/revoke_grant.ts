import { MsgExecAuthorized, MsgRevokeAuthorization, MsgSend } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";
import { CHAIN_PREFIX } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(true);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const lunaAmount1 = (1_000_000).toString();

const granter = wallet1.key.accAddress(CHAIN_PREFIX);
const grantee = wallet2.key.accAddress(CHAIN_PREFIX);

const revoke = async () => {
  const msgTypeUrl = "/cosmos.bank.v1beta1.MsgSend";
  const revokeMsg = new MsgRevokeAuthorization(granter, grantee, msgTypeUrl);

  // wallet1 is granter
  createSignBroadcastCatch(wallet1, [revokeMsg]);
};

const execute = async () => {
  const execAuthorizedMsg = new MsgExecAuthorized(grantee, [
    // send from granter to grantee
    new MsgSend(granter, grantee, { uluna: lunaAmount1 }),
  ]);

  // wallet2 is grantee
  // this should fail now since granter has revoked the authorization
  createSignBroadcastCatch(wallet2, [execAuthorizedMsg]);
};

// revoke();

execute();
