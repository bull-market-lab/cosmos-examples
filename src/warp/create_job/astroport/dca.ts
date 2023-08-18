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
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.01";

  const swapAmount = (1_000_000).toString();

  const dcaNumber = (2).toString();
  const dcaNumberPlus1 = (parseInt(dcaNumber) + 1).toString();

  // 86400 is 1 day in seconds
  // const dcaInterval = 60 * 60 * 24 * 7;
  // make it shorter for testing, 30 seconds
  const dcaInterval = (30).toString();
  // initial value is current timestamp
  const dcaStartTime = String(Math.floor(Date.now() / 1000));

  // round down to 3 decimal places to avoid running out of fund
  const singleSwapAmount = Big(swapAmount).div(dcaNumber).round(3, 0).toString();

  const jobReward = (1_000_000).toString();
  // creation fee + reward + potential eviction fee
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const lunaJobFee = Big(jobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .add(50_000) // eviction fee 0.05
    .mul(dcaNumberPlus1) // each recurring job needs to pay creation fee and reward, plus 1 to cover the dummy job that created after last execution, TODO: remove it after warp supports terminate_fn
    .toString();

  const createWarpAccountIfNotExistAndFundAccount = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    {
      create_account: {},
    },
    {
      uluna: Big(lunaJobFee).add(Big(swapAmount)).toString(),
    }
  );

  const astroportNativeSwapMsg = {
    swap: {
      offer_asset: {
        info: {
          native_token: {
            denom: CHAIN_DENOM,
          },
        },
        amount: singleSwapAmount,
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
        funds: [{ denom: CHAIN_DENOM, amount: singleSwapAmount }],
      },
    },
  };
  const nativeSwapJsonString = JSON.stringify(nativeSwap);

  const jobVarNameNextExecution = "dca-swap-luna-to-astro";
  const jobVarNextExecution = {
    static: {
      kind: "uint", // NOTE: it's better to use uint instead of timestamp to keep it consistent with condition
      name: jobVarNameNextExecution,
      value: dcaStartTime,
      update_fn: {
        // update value to current timestamp + dcaInterval, i.e. make next execution 1 day later
        on_success: {
          uint: {
            expr: {
              left: {
                simple: dcaInterval,
              },
              op: "add",
              right: {
                env: "time",
              },
            },
          },
        },
        // on error, do nothing for now, this will stop creating new jobs
        // on_error: {
        // }
      },
    },
  };

  const jobVarNameAlreadyRunCounter = "swap-luna-to-astro-recursively-counter";
  const jobVarAlreadyRunCounter = {
    static: {
      kind: "int",
      name: jobVarNameAlreadyRunCounter,
      value: (0).toString(), // initial counter value is 0
      update_fn: {
        // increment counter
        on_success: {
          int: {
            expr: {
              left: {
                ref: `$warp.variable.${jobVarNameAlreadyRunCounter}`,
              },
              op: "add",
              right: {
                simple: (1).toString(),
              },
            },
          },
        },
        // on error, do nothing for now, this will stop creating new jobs
        // on_error: {
        // }
      },
    },
  };

  const condition = {
    and: [
      {
        expr: {
          uint: {
            // NOTE: we must use uint instead of timestamp here as timestamp can only compare current time with var
            // there is no left side of expression
            left: {
              env: "time",
            },
            op: "gt",
            right: {
              ref: `$warp.variable.${jobVarNameNextExecution}`,
            },
          },
        },
      },
      {
        expr: {
          int: {
            left: {
              ref: `$warp.variable.${jobVarNameAlreadyRunCounter}`,
            },
            op: "lt",
            right: {
              simple: dcaNumber,
            },
          },
        },
      },
    ],
  };

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "astroport_dca_order_luna_to_astro_from_pool",
      description: "DCA order from Luna to Astro from Astroport Astro-Luna pool",
      labels: [],
      recurring: true,
      requeue_on_evict: true,
      reward: jobReward,
      condition: condition,
      msgs: [nativeSwapJsonString],
      vars: [jobVarNextExecution, jobVarAlreadyRunCounter],
    },
  });

  createSignBroadcastCatch(wallet, [createWarpAccountIfNotExistAndFundAccount, createJob]);
};

run();
