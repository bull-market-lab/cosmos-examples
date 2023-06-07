import {
  MsgGrantAuthorization,
  SendAuthorization,
  AuthorizationGrant,
} from "@terra-money/feather.js";
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

const grant = async () => {
  // expire in 1 minute
  const expiration = new Date(Date.now() + 1000 * 60);

  const sendAuthorization = new SendAuthorization({ uluna: lunaAmount1 });
  const grantSend = new AuthorizationGrant(sendAuthorization, expiration);
  const grantSendAuthorizationMsg = new MsgGrantAuthorization(granter, grantee, grantSend);

  // wallet1 is granter
  createSignBroadcastCatch(wallet1, [grantSendAuthorizationMsg]);
};

grant();
