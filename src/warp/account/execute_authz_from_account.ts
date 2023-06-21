import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpAccountAddress,
  toBase64FromBinary,
} from "../../util";
import { CHAIN_PREFIX, VALIDATOR_ADDRESS } from "../../env";
import {
  MsgExecAuthorized,
  MsgExecuteContract,
  MsgWithdrawDelegatorReward,
} from "@terra-money/feather.js";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const authzExecute = async () => {
  const warpAccountAddress = await getWarpAccountAddress(lcd, myAddress);

  const grantee = warpAccountAddress;
  const withdrawDelegatorRewardMsg: MsgWithdrawDelegatorReward[] = [
    new MsgWithdrawDelegatorReward(myAddress, VALIDATOR_ADDRESS),
  ];
  const execAuthorizedMsg = new MsgExecAuthorized(grantee, [...withdrawDelegatorRewardMsg]);

  const executeMsg = {
    generic: {
      msgs: [
        {
          stargate: {
            type_url: "/cosmos.authz.v1beta1.MsgExec",
            value: toBase64FromBinary(execAuthorizedMsg.packAny().value),
          },
        },
      ],
    },
  };
  const contractSend = new MsgExecuteContract(myAddress, warpAccountAddress, executeMsg);

  createSignBroadcastCatch(wallet, [contractSend]);
};

authzExecute();
