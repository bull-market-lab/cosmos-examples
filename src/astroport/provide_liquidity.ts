import { Coins, MsgExecuteContract } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError } from '../util';
import {
  ASTRO_LUNA_PAIR_ADDRESS,
  ASTRO_TOKEN_ADDRESS,
  CHAIN_DENOM,
  CHAIN_ID,
  CHAIN_PREFIX,
} from '../env';

// i distributed initially balance to tester2
const mnemonicKey = getMnemonicKey(true);
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const astroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;
const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const astroAmount100 = 100_000_000;
const lunaAmount100 = 100_000_000;

const run = async () => {
  const increaseAllowance = new MsgExecuteContract(myAddress, astroTokenAddress, {
    increase_allowance: {
      spender: astroLunaPairAddress,
      amount: astroAmount100.toString(),
      expires: {
        never: {},
      },
    },
  });

  const provideLiquidity = new MsgExecuteContract(
    myAddress,
    astroLunaPairAddress,
    {
      provide_liquidity: {
        assets: [
          {
            info: {
              token: {
                contract_addr: astroTokenAddress,
              },
            },
            amount: astroAmount100.toString(),
          },
          {
            info: {
              native_token: {
                denom: CHAIN_DENOM,
              },
            },
            amount: lunaAmount100.toString(),
          },
        ],
        slippage_tolerance: '0.005',
        auto_stake: false,
        receiver: myAddress,
      },
    },
    new Coins({ [CHAIN_DENOM]: lunaAmount100.toString() })
  );

  wallet
    .createAndSignTx({
      //   msgs: [increaseAllowance],
      //   msgs: [provideLiquidity],
      msgs: [increaseAllowance, provideLiquidity],
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

const checkBalance = async () => {
  const response = await lcd.wasm.contractQuery(astroTokenAddress, {
    balance: { address: myAddress },
  });
  console.log(`astro balance`, response);

  const [terraBalance] = await lcd.bank.balance(myAddress);
  console.log(`terra balance`, terraBalance);
};

// console.log('myAddress', myAddress);

run();

// checkBalance();
