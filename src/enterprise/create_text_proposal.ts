import { CHAIN_ID, CHAIN_PREFIX, ENTERPRISE_DAO_ADDRESS } from '../env';
import { MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError } from '../util';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

const run = async () => {
  const executeMsg = {
    create_proposal: {
      description: 'test',
      proposal_actions: [],
      title: 'test_warp_execution',
    },
  };
  const execute = new MsgExecuteContract(
    wallet.key.accAddress(CHAIN_PREFIX), // sender
    enterpriseDaoAddress, // contract account address
    { ...executeMsg } // handle msg
    // { uluna: 100000 } // coins
  );

  wallet
    .createAndSignTx({
      msgs: [execute],
      // msgs: [createJob],
      chainID: CHAIN_ID,
    })
    .then((tx) => {
      /*
Tx {
  body: TxBody {
    messages: [ [MsgExecuteContract] ],
    memo: '',
    timeout_height: 0
  },
  auth_info: AuthInfo {
    signer_infos: [ [SignerInfo] ],
    fee: Fee { gas_limit: 801808, payer: '', granter: '', amount: [Coins] }
  },
  signatures: [
    '+o0xmK5SMC3eod95J0Ar4cUzZHb31m6O7eY6rf7BvK4qAnVyZ2cybFYhCiZfH4WlKSGiVrWqFY+sBQrn6q3AbQ=='
  ]
}
*/
      return lcd.tx.broadcast(tx, CHAIN_ID);
    })
    .catch((e) => {
      console.log('error in create and sign tx');
      printAxiosError(e);
      throw e;
    })
    .then((txInfo) => {
      // console.log(txInfo);
    })
    .catch((e) => {
      console.log('error in broadcast tx');
      printAxiosError(e);
      throw e;
    });
};

run();
