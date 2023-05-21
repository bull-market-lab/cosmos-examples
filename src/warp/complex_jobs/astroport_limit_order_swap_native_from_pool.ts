import Big from 'big.js';
import { MsgExecuteContract, MsgSend } from '@terra-money/feather.js';
import { getLCD, getMnemonicKey, getWallet, printAxiosError, toBase64 } from '../../util';
import {
  ASTRO_LUNA_PAIR_ADDRESS,
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

const astroportAstroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const lunaAmount10 = (10_000_000).toString();
const lunaAmount1 = (1_000_000).toString();

// when max_spread and minimum_receive are both specified, the swap will fail if receive amount is not in the range of [minimum_receive, return_amount * (1 +/- max_spread)]
// actually i think i only need to specify minimum_receive in condition
// expectedReceivedAstroAmount is not required for actual swap msg cause checking condition is atomic with executing swap msg
const expectedReceivedAstroAmount = (9_091_852).toString();
// default spread is 0.01 which is 1%
// maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
const maxSpread = '0.1';

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

  const lunaSwapAmount = lunaAmount10;
  const lunaJobReward = lunaAmount1;
  const lunaJobRewardAndCreationFee = Big(lunaJobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .toString();

  // TODO: warp currently doesn't support create account and fund it in 1 tx, but it's in feature branch
  // const createWarpAccount = new MsgExecuteContract(myAddress, warpControllerAddress, {
  //   create_account: {},
  // });

  const fundWarpAccountForJobRewardAndCreationFee = new MsgSend(myAddress, warpAccountAddress, {
    uluna: lunaJobRewardAndCreationFee,
  });
  const fundWarpAccountForOfferedAmount = new MsgSend(myAddress, warpAccountAddress, {
    uluna: lunaSwapAmount,
  });

  const astroportNativeSwapMsg = {
    swap: {
      offer_asset: {
        info: {
          native_token: {
            denom: CHAIN_DENOM,
          },
        },
        amount: lunaSwapAmount,
      },
      /*
      Belief Price + Max Spread
      If belief_price is provided in combination with max_spread, 
      the pool will check the difference between the return amount (using belief_price) and the real pool price.
      The belief_price +/- the max_spread is the range of possible acceptable prices for this swap.
      */
      // belief_price: beliefPrice,
      // max_spread: '0.005',
      max_spread: maxSpread,
      // to: '...', // default to sender
      to: myAddress,
    },
  };
  const nativeSwap = {
    wasm: {
      execute: {
        contract_addr: astroportAstroLunaPairAddress,
        msg: toBase64(astroportNativeSwapMsg),
        funds: [{ denom: CHAIN_DENOM, amount: lunaSwapAmount }],
      },
    },
  };
  const nativeSwapJsonString = JSON.stringify(nativeSwap);

  const astroportSimulateNativeSwapMsg = {
    simulation: {
      offer_asset: {
        info: {
          native_token: {
            denom: CHAIN_DENOM,
          },
        },
        amount: lunaSwapAmount,
      },
    },
  };

  const jobVarName = 'luna-astro-price-10LUNA-receive-how-much-ASTRO';
  const jobVar = {
    query: {
      // kind: 'int', // uint, amount, decimal are all allowed
      kind: 'amount', // only int is not allowed since it expects result to be number, in fact result is string
      name: jobVarName,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(astroportSimulateNativeSwapMsg),
              contract_addr: astroportAstroLunaPairAddress,
            },
          },
        },
        selector: '$.return_amount',
      },
      reinitialize: false,
    },
  };

  const condition = {
    expr: {
      decimal: {
        op: 'gte',
        left: {
          ref: `$warp.variable.${jobVarName}`,
        },
        right: {
          simple: expectedReceivedAstroAmount,
        },
      },
    },
  };

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: 'astroport_limit_order_luna_to_astro_from_pool',
      recurring: false,
      requeue_on_evict: false,
      reward: lunaJobReward,
      condition: condition,
      msgs: [nativeSwapJsonString],
      vars: [jobVar],
    },
  });

  wallet
    .createAndSignTx({
      msgs: [fundWarpAccountForJobRewardAndCreationFee, fundWarpAccountForOfferedAmount, createJob],
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
