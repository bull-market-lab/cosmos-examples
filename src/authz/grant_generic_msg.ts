import {
  MsgGrantAuthorization,
  GenericAuthorization,
  AuthorizationGrant,
} from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpDefaultAccountAddress,
} from "../util";
import { CHAIN_PREFIX } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(2);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const granter = wallet1.key.accAddress(CHAIN_PREFIX);
let grantee = wallet2.key.accAddress(CHAIN_PREFIX);

const grant = async () => {
  // expire in 2.5 minute
  const expiration = new Date(Date.now() + 1000 * 150);

  const msgTypeUrl = "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward";
  const genericAuthorization = new GenericAuthorization(msgTypeUrl);
  const grantGeneric = new AuthorizationGrant(genericAuthorization, expiration);

  // grant my warp account access to withdraw delegator reward on behalf of granter
  const warpAccount = await getWarpDefaultAccountAddress(lcd, granter);
  grantee = warpAccount;
  const grantGenericAuthorizationMsg = new MsgGrantAuthorization(granter, grantee, grantGeneric);

  // wallet1 is granter
  createSignBroadcastCatch(wallet1, [grantGenericAuthorizationMsg]);
};

grant();
