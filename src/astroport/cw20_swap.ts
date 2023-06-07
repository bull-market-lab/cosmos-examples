import { MsgExecuteContract } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet, toBase64 } from "../util";
import { ASTRO_LUNA_PAIR_ADDRESS, ASTRO_TOKEN_ADDRESS, CHAIN_DENOM, CHAIN_PREFIX } from "../env";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

// this is the astro-luna pair contract, not the astro-luna lp token contract
const astroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;
const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const astroAmount5 = (5_000_000).toString();
const lunaAmount10 = (10_000_000).toString();

const run = async () => {
  const swap = new MsgExecuteContract(myAddress, astroTokenAddress, {
    send: {
      contract: astroLunaPairAddress,
      amount: astroAmount5,
      msg: toBase64({
        swap: {
          ask_asset_info: {
            native_token: {
              denom: CHAIN_DENOM,
            },
          },
          // belief_price: beliefPrice,
          max_spread: "0.5",
          // to: '...',
        },
      }),
    },
  });

  createSignBroadcastCatch(wallet, [swap]);
};

// swap from cw20 to native or cw20, e.g. ASTRO to LUNA or ASTRO to UST
run();
