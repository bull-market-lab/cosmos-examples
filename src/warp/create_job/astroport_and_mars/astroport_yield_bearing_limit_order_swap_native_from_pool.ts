import Big from "big.js";
import { MsgExecuteContract } from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpJobCreationFeePercentage,
  toBase64,
} from "../../../util";
import {
  ASTRO_LUNA_PAIR_ADDRESS,
  CHAIN_DENOM,
  CHAIN_PREFIX,
  MARS_RED_BANK_ADDRESS,
  USDC_DENOM,
  WARP_CONTROLLER_ADDRESS,
} from "../../../env";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const astroportAstroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const marsRedBankAddress = MARS_RED_BANK_ADDRESS!;

const usdcDenom = USDC_DENOM!;

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

  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const jobRewardAndCreationFee = Big(jobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .toString();

  /// init_msgs
  const depositToMarsMsg = {
    deposit: {},
  };

  const depositToMars = {
    wasm: {
      execute: {
        contract_addr: marsRedBankAddress,
        msg: toBase64(depositToMarsMsg),
        funds: [{ denom: usdcDenom, amount: swapAmount }],
      },
    },
  };

  /// vars
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

  const jobVarNamePrice = "ntrn-usdc-price";
  const jobVarPrice = {
    query: {
      // kind: 'int', // uint, amount, decimal are all allowed
      kind: "amount", // only int is not allowed since it expects result to be number, in fact result is string
      name: jobVarNamePrice,
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
    },
  };

  const marsQueryUserCollateralMsg = {
    user_collateral: {
      user: "$warp.variable.${jobVarNameJobAccountAddress}", // can we nest variable like this?
      denom: usdcDenom,
    },
  };

  const jobVarNameMarsCollateralPosition = "mars-usdc-collateral-position";
  const jobVarMarsCollateralPosition = {
    query: {
      // kind: 'int', // uint, amount, decimal are all allowed
      kind: "amount", // only int is not allowed since it expects result to be number, in fact result is string
      name: jobVarNameMarsCollateralPosition,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(marsQueryUserCollateralMsg),
              contract_addr: marsRedBankAddress,
            },
          },
        },
        selector: "$.amount",
      },
      reinitialize: false,
    },
  };

  /// condition
  const condition = {
    expr: {
      decimal: {
        op: "gte",
        left: {
          ref: `$warp.variable.${jobVarNamePrice}`,
        },
        right: {
          simple: expectedReceivedAstroAmount,
        },
      },
    },
  };

  /// msgs
  const withdrawFromMarsMsg = {
    withdraw: {
      // unset will default to withdraw full amount
      // amount: "10000",
      denom: USDC_DENOM,
    },
  };
  const withdrawFromMars = {
    wasm: {
      execute: {
        contract_addr: marsRedBankAddress,
        msg: toBase64(withdrawFromMarsMsg),
        funds: [],
      },
    },
  };

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

  const createJobAccountAndJob = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    {
      create_account_and_job: {
        name: "astroport_yield_bearing_limit_order_usdc_to_ntrn_from_pool",
        description: "yield bearing limit order",
        labels: ["astroport", "mars"],
        recurring: false,
        requeue_on_evict: false,
        reward: jobReward,
        condition: JSON.stringify(condition),
        // TODO: also claim mars rewards if available
        msgs: JSON.stringify([JSON.stringify(withdrawFromMars), JSON.stringify(nativeSwap)]),
        vars: JSON.stringify([jobVarPrice, jobVarMarsCollateralPosition]),
        initial_msgs: JSON.stringify([JSON.stringify(depositToMars)]),
      },
    },
    {
      uluna: Big(jobRewardAndCreationFee).add(Big(swapAmount)).toString(),
    }
  );

  createSignBroadcastCatch(wallet, [createJobAccountAndJob]);
};

run();
