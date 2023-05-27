import { MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError } from '../util';
import { CHAIN_ID, CHAIN_PREFIX, ENTERPRISE_FACTORY_ADDRESS } from '../env';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
const enterpriseFactoryAddress = ENTERPRISE_FACTORY_ADDRESS!;

const run = async () => {
  const executeMsg = {
    create_dao: {
      dao_gov_config: {
        allow_early_proposal_execution: true,
        quorum: '0.30',
        threshold: '0.51',
        unlocking_period: {
          time: 840,
        },
        veto_threshold: '0.51',
        vote_duration: 420, // 7 minutes voting window for any proposal
      },
      dao_membership: {
        new_membership: {
          new_multisig: {
            multisig_members: [
              {
                // tester1
                address: 'terra1dcegyrekltswvyy0xy69ydgxn9x8x32zdtapd8',
                weight: '100',
              },
              {
                // tester2
                address: 'terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v',
                weight: '100',
              },
              {
                // make up a random address
                address: 'terra1333veey879eeqcff8j3gfcgwt8cfrg9mq20v6f',
                weight: '100',
              },
            ],
          },
        },
      },
      dao_metadata: {
        description: 'haha',
        logo: 'none',
        name: 'test',
        socials: {},
      },
    },
  };
  const execute = new MsgExecuteContract(
    wallet.key.accAddress(CHAIN_PREFIX), // sender
    enterpriseFactoryAddress, // contract account address
    { ...executeMsg } // handle msg
    // { uluna: 100000 } // coins
  );

  wallet
    .createAndSignTx({
      msgs: [execute],
      // msgs: [createJob],
      chainID: CHAIN_ID,
    })
    .then((tx) => lcd.tx.broadcast(tx, CHAIN_ID))
    .catch((e) => {
      console.log('error in create and sign tx');
      printAxiosError(e);
      throw e;
    })
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      console.log('error in broadcast tx');
      printAxiosError(e);
      throw e;
    });
};

run();
