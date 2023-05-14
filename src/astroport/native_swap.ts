import { Coins, MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError } from '../util';
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

const astroAmount100 = (100_000_000).toString();
const lunaAmount10 = (10_000_000).toString();

const run = async () => {
  const swap = new MsgExecuteContract(
    myAddress,
    astroLunaPairAddress,
    {
      swap: {
        offer_asset: {
          info: {
            native_token: {
              denom: CHAIN_DENOM,
            },
          },
          amount: lunaAmount10,
        },
        /*
        Belief Price + Max Spread
        If belief_price is provided in combination with max_spread, 
        the pool will check the difference between the return amount (using belief_price) and the real pool price.
        The belief_price +/- the max_spread is the range of possible acceptable prices for this swap.
        */
        // belief_price: beliefPrice,
        // max_spread: '0.005',
        max_spread: '0.5',
        // to: '...', // default to sender
      },
    },
    new Coins({ [CHAIN_DENOM]: lunaAmount10 })
  );

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

// swap from native to native or cw20, e.g. LUNA to ASTRO or LUNA to UST
run();
