import { Coins, MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError, toBase64 } from '../util';
import {
  ASTRO_LUNA_PAIR_ADDRESS,
  ASTRO_TOKEN_ADDRESS,
  CHAIN_DENOM,
  CHAIN_ID,
  CHAIN_PREFIX,
} from '../env';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

// this is the astro-luna pair contract, not the astro-luna lp token contract
const astroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;
const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const astroAmount5 = (5_000_000).toString();
const lunaAmount10 = (10_000_000).toString();

const run = async () => {
  const swap = new MsgExecuteContract(myAddress, astroTokenAddress, {
    send: {
      contract: astroLunaPairAddress,
      amount: astroAmount5,
      msg: toBase64({
        swap: {
          ask_asset_info: {
            native_token: {
              denom: CHAIN_DENOM,
            },
          },
          // belief_price: beliefPrice,
          max_spread: '0.5',
          // to: '...',
        },
      }),
    },
  });

  wallet
    .createAndSignTx({
      msgs: [swap],
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

// swap from cw20 to native or cw20, e.g. ASTRO to LUNA or ASTRO to UST
run();
