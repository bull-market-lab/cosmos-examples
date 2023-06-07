import { CHAIN_PREFIX, ENTERPRISE_DAO_ADDRESS } from "../env";
import { MsgExecuteContract } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

const run = async () => {
  const executeMsg = {
    create_proposal: {
      description: "test",
      proposal_actions: [],
      title: "test_warp_execution",
    },
  };
  const execute = new MsgExecuteContract(
    wallet.key.accAddress(CHAIN_PREFIX), // sender
    enterpriseDaoAddress, // contract account address
    { ...executeMsg } // handle msg
    // { uluna: 100000 } // coins
  );

  createSignBroadcastCatch(wallet, [execute]);
};

run();
