import { LUNA, CW20Token, CW20Addr } from '@terra-money/warp-sdk';
import {
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpAccountAddress,
  printAxiosError,
  toBase64,
} from '../../util';
import { ASTRO_TOKEN_ADDRESS, CHAIN_ID, CHAIN_PREFIX } from '../../env';
import { MsgExecuteContract } from '@terra-money/feather.js';

const mnemonicKey = getMnemonicKey(true);
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const lunaAmount = (9_370_000).toString();
const astroAmount = (6_701_058).toString();

const nativeToken = LUNA;
const astro: CW20Token = {
  key: 'astro',
  name: 'Astro',
  symbol: 'ASTRO',
  icon: '',
  decimals: 6,
  type: 'cw20',
  protocol: 'astroport',
  token: ASTRO_TOKEN_ADDRESS! as CW20Addr,
};

const checkAstroBalance = async () => {
  const astroBalance = await lcd.wasm.contractQuery(astroTokenAddress, {
    balance: {
      address: myAddress,
    },
  });
  console.log(`astroBalance is ${JSON.stringify(astroBalance, null, 2)}`);
};

const withdraw = async () => {
  const warpAccountAddress = await getWarpAccountAddress(lcd, myAddress);
  // const warpAccountAddress = 'terra1vj3hkx3sx742vtx9tg0lk6k33trwxra5zxe9px7yhplm9wm8ac9ss8am62';
  const executeMsg = {
    msgs: [
      // withdraw native token
      {
        bank: {
          send: {
            amount: [{ denom: 'uluna', amount: lunaAmount }],
            to_address: myAddress,
          },
        },
      },
      // withdraw cw20
      {
        wasm: {
          execute: {
            contract_addr: astroTokenAddress,
            msg: toBase64({
              transfer: {
                recipient: myAddress,
                amount: astroAmount,
              },
            }),
            funds: [],
          },
        },
      },
    ],
  };
  const contractSend = new MsgExecuteContract(myAddress, warpAccountAddress, executeMsg);

  wallet
    .createAndSignTx({
      msgs: [contractSend],
      chainID: CHAIN_ID,
      //   gasPrices: '0.15uluna',
      //   gasAdjustment: 1.4,
      //   gas: (1_500_793).toString(),
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

// checkAstroBalance();
withdraw();
