import { CHAIN_ID, ENTERPRISE_DAO_ADDRESS } from '../env';
import { MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet } from '../util';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

export const createTextProposal = async () => {
  const executeMsg = {
    create_proposal: {
      description: 'test',
      proposal_actions: [],
      title: 'test_warp_execution',
    },
  };
  const execute = new MsgExecuteContract(
    wallet.key.accAddress('terra'), // sender
    enterpriseDaoAddress, // contract account address
    { ...executeMsg } // handle msg
    // { uluna: 100000 } // coins
  );

  const executeTx = await wallet.createAndSignTx({
    msgs: [execute],
    chainID: CHAIN_ID,
  });

  lcd.tx.broadcast(executeTx, CHAIN_ID).then((result) => console.log(result));
};
