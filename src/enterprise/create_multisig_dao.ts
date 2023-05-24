import { MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet } from '../util';
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
        vote_duration: 420,
      },
      dao_membership: {
        new_membership: {
          new_multisig: {
            multisig_members: [
              {
                address: 'terra1lkccuqgj6sjwjn8gsa9xlklqv4pmrqg9dx2fxc',
                weight: '100',
              },
              {
                address: 'terra1fmcjjt6yc9wqup2r06urnrd928jhrde6gcld6n',
                weight: '100',
              },
              {
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

  const executeTx = await wallet.createAndSignTx({
    msgs: [execute],
    chainID: CHAIN_ID,
  });

  lcd.tx.broadcast(executeTx, CHAIN_ID).then((result) => console.log(result));
};

run();
