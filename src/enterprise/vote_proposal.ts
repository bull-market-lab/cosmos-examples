import { CHAIN_ID, ENTERPRISE_DAO_ADDRESS } from '../env';
import { MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet } from '../util';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

export const voteProposal = async () => {
  const executeMsg = {
    cast_vote: {
      outcome: 'yes',
      proposal_id: 3,
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
