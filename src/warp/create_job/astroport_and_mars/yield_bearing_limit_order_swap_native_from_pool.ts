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
  CHAIN_DENOM,
  CHAIN_PREFIX,
  MARS_RED_BANK_ADDRESS,
  NTRN_USDC_PAIR_ADDRESS,
  USDC_DENOM,
  WARP_CONTROLLER_ADDRESS,
} from "../../../env";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const astroportNtrnUsdcPairAddress = NTRN_USDC_PAIR_ADDRESS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const marsRedBankAddress = MARS_RED_BANK_ADDRESS!;

const usdcDenom = USDC_DENOM!;

const run = async () => {
  // when max_spread and minimum_receive are both specified, the swap will fail if receive amount is not in the range of [minimum_receive, return_amount * (1 +/- max_spread)]
  // actually i think i only need to specify minimum_receive in condition
  // expectedReceivedAmount is not required for actual swap msg cause checking condition is atomic with executing swap msg
  // const expectedReceivedAmount = (9_091_852).toString();
  // for testing purpose, set expectedReceivedAmount to 1 to make condition always true
  const expectedReceivedAmount = (1).toString();
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.1";

  const swapAmount = (100_000).toString();

  const offeredTokenDenom = usdcDenom;

  const jobReward = (10_000).toString();

  // console.log("myAddress", myAddress);
  // const tmp = await lcd.bank.balance(myAddress).then((res) => {
  //   console.log(res);
  // })

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
        funds: [{ denom: offeredTokenDenom, amount: swapAmount }],
      },
    },
  };

  /// vars
  const jobVarNameAccountAddress = "account_address";
  const jobVarAccountAddress = {
    static: {
      kind: "string",
      name: jobVarNameAccountAddress,
      value: "", // value will be set in the reply of create_account_and_job after account is created
    },
  };

  const astroportSimulateNativeSwapMsg = {
    simulation: {
      offer_asset: {
        info: {
          native_token: {
            denom: offeredTokenDenom,
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
              contract_addr: astroportNtrnUsdcPairAddress,
            },
          },
        },
        selector: "$.return_amount",
      },
      reinitialize: false,
    },
  };

  const queryMarsBalanceMsg = {
    user_collateral: {
      user: `$warp.variable.${jobVarNameAccountAddress}`, // can we nest variable like this?
      denom: offeredTokenDenom,
    },
  };

  const jobVarNameMarsBalance = "usdc-balance-in-mars";
  const jobVarMarsBalance = {
    query: {
      // kind: 'int', // uint, amount, decimal are all allowed
      kind: "amount", // only int is not allowed since it expects result to be number, in fact result is string
      name: jobVarNameMarsBalance,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(queryMarsBalanceMsg),
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
          simple: expectedReceivedAmount,
        },
      },
    },
  };

  /// msgs
  const withdrawFromMarsMsg = {
    withdraw: {
      // unset will default to withdraw full amount
      // amount: "10000",
      denom: offeredTokenDenom,
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
            denom: offeredTokenDenom,
          },
        },
        amount: `$warp.variable.${jobVarNameMarsBalance}`,
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
        contract_addr: astroportNtrnUsdcPairAddress,
        msg: toBase64(astroportNativeSwapMsg),
        funds: [{ denom: offeredTokenDenom, amount: `$warp.variable.${jobVarNameMarsBalance}` }],
      },
    },
  };

  const executeMsg = {
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
      // msgs: JSON.stringify([JSON.stringify(nativeSwap)]),
      vars: JSON.stringify([jobVarAccountAddress, jobVarPrice, jobVarMarsBalance]),
      initial_msgs: JSON.stringify([JSON.stringify(depositToMars)]),
      should_update_var_account_address: true,
    },
  };

  console.log("executeMsg", executeMsg);

  const createJobAccountAndJob = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    executeMsg,
    {
      [CHAIN_DENOM]: Big(jobRewardAndCreationFee).add(Big(swapAmount)).toString(),
    }
  );

  createSignBroadcastCatch(wallet, [createJobAccountAndJob]);
};

run();
