import { MsgExecAuthorized, MsgWithdrawDelegatorReward } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";
import { CHAIN_PREFIX } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(true);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const granter = wallet1.key.accAddress(CHAIN_PREFIX);
let grantee = wallet2.key.accAddress(CHAIN_PREFIX);

const execute = async () => {
  const withdrawDelegatorRewardMsg: MsgWithdrawDelegatorReward[] = [];
  let hasMore = true;
  while (hasMore) {
    const [validators, pagination] = await lcd.staking.bondedValidators(granter, {
      "pagination.offset": withdrawDelegatorRewardMsg.length.toString(),
    });

    validators.forEach((validator) => {
      withdrawDelegatorRewardMsg.push(
        new MsgWithdrawDelegatorReward(granter, validator.operator_address)
      );
    });

    if (pagination.next_key) {
      hasMore = true;
    } else {
      hasMore = false;
    }
  }

  // claim staking reward on behalf of granter, claimed reward will still be sent to granter
  const execAuthorizedMsg = new MsgExecAuthorized(grantee, [...withdrawDelegatorRewardMsg]);

  //   console.log(execAuthorizedMsg);
  // wallet2 is grantee
  createSignBroadcastCatch(wallet2, [execAuthorizedMsg]);
};

execute();
