import { Coins, MsgExecuteContract } from "@terra-money/feather.js";
import { createSignBroadcastCatch, getLCD, getMnemonicKey, getWallet } from "../util";
import { ASTRO_LUNA_PAIR_ADDRESS, ASTRO_TOKEN_ADDRESS, CHAIN_DENOM, CHAIN_PREFIX } from "../env";

// i distributed initially balance to tester2
const mnemonicKey = getMnemonicKey(true);
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const astroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;
const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const astroAmount10000 = (10_000_000_000).toString();
const lunaAmount10000 = (10_000_000_000).toString();

const run = async () => {
  const increaseAllowance = new MsgExecuteContract(myAddress, astroTokenAddress, {
    increase_allowance: {
      spender: astroLunaPairAddress,
      amount: astroAmount10000,
      expires: {
        never: {},
      },
    },
  });

  const provideLiquidity = new MsgExecuteContract(
    myAddress,
    astroLunaPairAddress,
    {
      provide_liquidity: {
        assets: [
          {
            info: {
              token: {
                contract_addr: astroTokenAddress,
              },
            },
            amount: astroAmount10000,
          },
          {
            info: {
              native_token: {
                denom: CHAIN_DENOM,
              },
            },
            amount: lunaAmount10000,
          },
        ],
        slippage_tolerance: "0.1",
        auto_stake: false,
        receiver: myAddress,
      },
    },
    new Coins({ [CHAIN_DENOM]: lunaAmount10000 })
  );

  createSignBroadcastCatch(wallet, [increaseAllowance, provideLiquidity]);
};

run();
