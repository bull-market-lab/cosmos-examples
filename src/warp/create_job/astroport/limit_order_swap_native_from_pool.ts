import Big from "big.js";
import { MsgExecuteContract } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForOneTimeJob,
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  toBase64,
} from "../../../util";
import {
  ASTRO_LUNA_PAIR_ADDRESS,
  CHAIN_DENOM,
  CHAIN_PREFIX,
  WARP_CONTROLLER_ADDRESS,
} from "../../../env";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const astroportAstroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async () => {
  // when max_spread and minimum_receive are both specified, the swap will fail if receive amount is not in the range of [minimum_receive, return_amount * (1 +/- max_spread)]
  // actually i think i only need to specify minimum_receive in condition
  // expectedReceivedAstroAmount is not required for actual swap msg cause checking condition is atomic with executing swap msg
  const expectedReceivedAstroAmount = (9_091_852).toString();
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.1";

  const swapAmount = (1_000_000).toString();
  const jobReward = (1_000_000).toString();

  const warpProtocolFee = await calculateWarpProtocolFeeForOneTimeJob();

  /// =========== var ===========

  const astroportSimulateNativeSwapMsg = {
    simulation: {
      offer_asset: {
        info: {
          native_token: {
            denom: CHAIN_DENOM,
          },
        },
        amount: swapAmount,
      },
    },
  };
  const jobVarName = "luna_astro_price";
  const jobVar = {
    query: {
      // kind: 'int', // uint, amount, decimal are all allowed
      kind: "amount", // only int is not allowed since it expects result to be number, in fact result is string
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
        selector: "$.return_amount",
      },
      reinitialize: false,
      encode: false,
    },
  };

  /// =========== condition ===========

  const condition = {
    expr: {
      decimal: {
        op: "gte",
        left: {
          ref: `$warp.variable.${jobVarName}`,
        },
        right: {
          simple: expectedReceivedAstroAmount,
        },
      },
    },
  };

  /// =========== job msgs ===========

  const astroportNativeSwapMsg = {
    swap: {
      offer_asset: {
        info: {
          native_token: {
            denom: CHAIN_DENOM,
          },
        },
        amount: swapAmount,
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
        funds: [{ denom: CHAIN_DENOM, amount: swapAmount }],
      },
    },
  };

  /// =========== cosmos msgs ===========
  const createWarpAccountIfNotExistAndFundAccount = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    {
      create_account: {},
    },
    {
      uluna: Big(warpProtocolFee).add(Big(swapAmount)).toString(),
    }
  );

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "astroport_limit_order_luna_to_astro_from_pool",
      description: "limit order",
      labels: [],
      recurring: false,
      requeue_on_evict: false,
      reward: jobReward,
      condition: condition,
      msgs: [JSON.stringify(nativeSwap)],
      vars: [jobVar],
    },
  });

  /// =========== sign and broadcast ===========

  createSignBroadcastCatch(wallet, [createWarpAccountIfNotExistAndFundAccount, createJob]);
};

run();
