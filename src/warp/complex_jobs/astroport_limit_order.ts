import Big from 'big.js';
import { Coins, MsgExecuteContract, MsgSend } from '@terra-money/feather.js';
import {
  getLCD,
  getMnemonicKey,
  getWallet,
  initWarpSdk,
  printAxiosError,
  toBase64,
} from '../../util';
import {
  ASTROPORT_ROUTER_ADDRESS,
  ASTRO_LUNA_PAIR_ADDRESS,
  ASTRO_TOKEN_ADDRESS,
  CHAIN_DENOM,
  CHAIN_ID,
  CHAIN_PREFIX,
  WARP_CONTROLLER_ADDRESS,
} from '../../env';

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

// astroport router knows all the pools
// even if we don't want multiple hop we can use it to avoid entering the pool address
const astroportRouterAddress = ASTROPORT_ROUTER_ADDRESS!;

const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const astroAmount100 = (100_000_000).toString();
const lunaAmount10 = (10_000_000).toString();
const lunaAmount1 = (1_000_000).toString();

const run = async () => {
  const warpConfig = await lcd.wasm.contractQuery(warpControllerAddress, {
    query_config: {},
  });
  // @ts-ignore
  const warpCreationFeePercentages = warpConfig.config.creation_fee_percentage;

  const warpAccount = await lcd.wasm.contractQuery(warpControllerAddress, {
    query_account: {
      owner: myAddress,
    },
  });
  // @ts-ignore
  const warpAccountAddress: string = warpAccount.account.account;

  const lunaReward = lunaAmount1;
  const lunaSendAmount = Big(lunaReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .toString();

  // TODO: warp currently doesn't support create account and fund it in 1 tx, but it's in feature branch
  // const createWarpAccount = new MsgExecuteContract(myAddress, warpControllerAddress, {
  //   create_account: {},
  // });

  // send 10 LUNA to warp account to use it for swap
  const fundWarpAccount = new MsgSend(myAddress, warpAccountAddress, {
    uluna: lunaSendAmount,
  });

  // const fund = {
  //   bank: {
  //     send: {
  //       amount: [{ denom: CHAIN_DENOM, amount: lunaAmount10 }],
  //       to_address: warpAccountAddress,
  //     },
  //   },
  // };

  // const fundJsonString = JSON.stringify(fund);

  const astroportMsg = {
    execute_swap_operations: {
      max_spread: '0.1',
      // minimum_receive: '9500000000',
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
  };

  // swap 10 LUNA to about 10 ASTRO
  const swap = {
    wasm: {
      execute: {
        contract_addr: astroportRouterAddress,
        msg: toBase64(astroportMsg),
        funds: [{ denom: CHAIN_DENOM, amount: lunaAmount10 }],
      },
    },
  };

  const swapJsonString = JSON.stringify(swap);

  const condition = {
    expr: {
      block_height: {
        comparator: '0',
        op: 'gt',
      },
    },
  };

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: 'astroport_limit_order',
      recurring: false,
      requeue_on_evict: false,
      reward: lunaReward,
      condition: condition,
      msgs: [swapJsonString],
      vars: [],
    },
  });

  wallet
    .createAndSignTx({
      msgs: [fundWarpAccount, createJob],
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
