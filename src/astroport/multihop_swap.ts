import { Coins, MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError } from '../util';
import {
  ASTROPORT_ROUTER_ADDRESS,
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

// astroport router knows all the pools
// even if we don't want multiple hop we can use it to avoid entering the pool address
const astroportRouterAddress = ASTROPORT_ROUTER_ADDRESS!;

const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const astroAmount100 = (100_000_000).toString();
const lunaAmount10 = (10_000_000).toString();

const run = async () => {
  const swap = new MsgExecuteContract(
    myAddress,
    astroportRouterAddress,
    {
      execute_swap_operations: {
        max_spread: '0.5',
        // minimum_receive: '9500000000',
        // to: '...', // default to sender
        // attach multiple operation to achieve multiple hop
        operations: [
          {
            astro_swap: {
              ask_asset_info: {
                token: {
                  contract_addr: astroTokenAddress,
                },
              },
              offer_asset_info: {
                native_token: {
                  denom: CHAIN_DENOM,
                },
              },
            },
          },
        ],
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

run();
