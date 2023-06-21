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
  ASTROPORT_ROUTER_ADDRESS,
  ASTRO_TOKEN_ADDRESS,
  CHAIN_DENOM,
  CHAIN_PREFIX,
  WARP_CONTROLLER_ADDRESS,
} from "../../../env";

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

const run = async () => {
  // when max_spread and minimum_receive are both specified, the swap will fail if receive amount is not in the range of [minimum_receive, return_amount * (1 +/- max_spread)]
  // actually i think i only need to specify minimum_receive in condition
  // no need for actual swap msg cause checking condition is atomic with executing swap msg
  const expectedReceivedAstroAmount = (9_010_335).toString();
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.1";

  const lunaSwapAmount = (10_000_000).toString();
  const lunaJobReward = (1_000_000).toString();
  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const lunaJobRewardAndCreationFee = Big(lunaJobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .toString();

  const createWarpAccountIfNotExistAndFundAccount = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    {
      create_account: {},
    },
    {
      uluna: Big(lunaJobRewardAndCreationFee).add(Big(lunaSwapAmount)).toString(),
    }
  );

  const astroportSwapMsg = {
    execute_swap_operations: {
      max_spread: maxSpread,
      // minimum_receive: expectedReceivedAstroAmount,
      to: myAddress,
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

  const swap = {
    wasm: {
      execute: {
        contract_addr: astroportRouterAddress,
        msg: toBase64(astroportSwapMsg),
        funds: [{ denom: CHAIN_DENOM, amount: lunaSwapAmount }],
      },
    },
  };

  const swapJsonString = JSON.stringify(swap);

  const astroportSimulateSwapMsg = {
    simulate_swap_operations: {
      offer_amount: lunaSwapAmount,
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

  const jobVarName = "luna-astro-price-10LUNA-receive-how-much-ASTRO";
  const jobVar = {
    query: {
      // kind: 'int', // uint, amount, decimal are all allowed
      kind: "amount", // only int is not allowed since it expects result to be number, in fact result is string
      name: jobVarName,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(astroportSimulateSwapMsg),
              contract_addr: astroportRouterAddress,
            },
          },
        },
        selector: "$.amount",
      },
      reinitialize: false,
    },
  };

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

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "astroport_limit_order_astro_to_luna_from_router",
      description: "limit order",
      labels: [],
      recurring: false,
      requeue_on_evict: false,
      reward: lunaJobReward,
      condition: condition,
      msgs: [swapJsonString],
      vars: [jobVar],
    },
  });

  createSignBroadcastCatch(wallet, [createWarpAccountIfNotExistAndFundAccount, createJob]);
};

run();
