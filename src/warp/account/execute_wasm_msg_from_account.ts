import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpFirstFreeSubAccountAddress,
  toBase64,
} from "../../util";
import { CHAIN_DENOM, CHAIN_PREFIX, OSMOSIS_SWAPPER_BY_MARS, USDC_DENOM } from "../../env";
import { MsgExecuteContract } from "@terra-money/feather.js";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const usdcDenom = USDC_DENOM!;
const offeredTokenDenom = usdcDenom;
const swapAmount = (80_000).toString();
const maxSpread = "0.1";

const osmosisSwapperByMars = OSMOSIS_SWAPPER_BY_MARS!;

const run = async () => {
  const subAccountAddress = await getWarpFirstFreeSubAccountAddress(lcd, myAddress);

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

  const execute = new MsgExecuteContract(myAddress, subAccountAddress, {
    generic: {
      msgs: [
        {
          wasm: {
            execute: {
              contract_addr: osmosisSwapperByMars,
              msg: toBase64(osmosisNativeSwapMsg),
              funds: [{ denom: CHAIN_DENOM, amount: swapAmount }],
            },
          },
        },
      ],
    },
  });

  createSignBroadcastCatch(wallet, [execute]);
};

run();
