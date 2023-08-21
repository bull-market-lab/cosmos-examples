import { MsgExecuteContract, MsgSend } from "@terra-money/feather.js";
import {
  calculateWarpProtocolFeeForOneTimeJob,
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpFirstFreeSubAccountAddress,
  queryWasmContractWithCatch,
  toBase64,
} from "../../../util";
import {
  OSMOSIS_SWAPPER_BY_MARS,
  CHAIN_DENOM,
  CHAIN_PREFIX,
  USDC_DENOM,
  WARP_CONTROLLER_ADDRESS,
  WARP_RESOLVER_ADDRESS,
} from "../../../env";
import { DEFAULT_JOB_REWARD } from "../../../constant";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const osmosisSwapperByMars = OSMOSIS_SWAPPER_BY_MARS!;

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const warpResolverAddress = WARP_RESOLVER_ADDRESS!;

const usdcDenom = USDC_DENOM!;

const run = async () => {
  // when max_spread and minimum_receive are both specified, the swap will fail if receive amount is not in the range of [minimum_receive, return_amount * (1 +/- max_spread)]
  // actually i think i only need to specify minimum_receive in condition
  // expectedReceivedAmount is not required for actual swap msg cause checking condition is atomic with executing swap msg
  const expectedReceivedAmount = (1).toString();
  // default spread is 0.01 which is 1%
  // maybe i don't need to specify spread in swap msg, as condition already ensure i get the price i want
  const maxSpread = "0.1";

  const swapAmount = (80_000).toString();

  const offeredTokenDenom = usdcDenom;

  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);
  const warpProtocolFee = await calculateWarpProtocolFeeForOneTimeJob();

  /// =========== var ===========

  const osmosisSimulateNativeSwapMsg = {
    estimate_exact_in_swap: {
      coin_in: {
        denom: offeredTokenDenom,
        amount: swapAmount,
      },
      denom_out: CHAIN_DENOM,
    },
  };

  const jobVarName = "osmo_usdc_price";
  const jobVar = {
    query: {
      kind: "amount",
      name: jobVarName,
      init_fn: {
        query: {
          wasm: {
            smart: {
              msg: toBase64(osmosisSimulateNativeSwapMsg),
              contract_addr: osmosisSwapperByMars,
            },
          },
        },
        selector: "$.amount",
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
          simple: expectedReceivedAmount,
        },
      },
    },
  };

  /// =========== job msgs ===========

  const osmosisNativeSwapMsg = {
    swap_exact_in: {
      coin_in: {
        denom: offeredTokenDenom,
        amount: swapAmount,
      },
      denom_out: CHAIN_DENOM,
      slippage: maxSpread,
    },
  };
  const nativeSwap = {
    wasm: {
      execute: {
        contract_addr: osmosisSwapperByMars,
        msg: toBase64(osmosisNativeSwapMsg),
        funds: [{ denom: offeredTokenDenom, amount: swapAmount }],
      },
    },
  };

  /// =========== cosmos msgs ===========

  const cosmosMsgEoaDepositToSubAccount = new MsgSend(myAddress, subAccountAddress, {
    [offeredTokenDenom]: swapAmount,
    [CHAIN_DENOM]: warpProtocolFee,
  });

  const cosmosMsgCreateJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "osmosis_limit_order_usdc_to_osmo",
      description: "limit order",
      labels: [],
      account: subAccountAddress,
      recurring: false,
      requeue_on_evict: false,
      reward: DEFAULT_JOB_REWARD,
      vars: JSON.stringify([jobVar]),
      condition: JSON.stringify(condition),
      msgs: JSON.stringify([JSON.stringify(nativeSwap)]),
      // needs to specify assets_to_withdraw as osmosis swapper contract by mars doesn't support transfer swapped token to another address
      assets_to_withdraw: [{ native: CHAIN_DENOM }],
    },
  });

  // create a new sub account since we just used the first free sub account
  // this is optional if user has more free accounts
  const cosmosMsgCreateNewSubAccount = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_account: {
      is_sub_account: true,
    },
  });

  /// =========== sign and broadcast ===========

  createSignBroadcastCatch(wallet, [
    cosmosMsgEoaDepositToSubAccount,
    cosmosMsgCreateJob,
    cosmosMsgCreateNewSubAccount,
  ]);

  /// =========== debug ===========

  // queryWasmContractWithCatch(lcd, warpResolverAddress, {
  //   query_validate_job_creation: {
  //     vars: JSON.stringify([jobVar]),
  //     condition: JSON.stringify(condition),
  //     msgs: JSON.stringify([JSON.stringify(nativeSwap)]),
  //   },
  // }).then((res) => console.log(res));
};

run();
