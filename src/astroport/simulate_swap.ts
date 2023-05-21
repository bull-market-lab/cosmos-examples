import { getLCD, printAxiosError } from '../util';
import {
  ASTROPORT_ROUTER_ADDRESS,
  ASTRO_LUNA_PAIR_ADDRESS,
  ASTRO_TOKEN_ADDRESS,
  CHAIN_DENOM,
} from '../env';

const lcd = getLCD();

// this is the astro-luna pair contract, not the astro-luna lp token contract
const astroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;
const astroportRouterAddress = ASTROPORT_ROUTER_ADDRESS!;
const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const lunaAmount10 = (10_000_000).toString();
const astroAmount10 = (10_000_000).toString();
const lunaSwapAmount = lunaAmount10.toString();
const astroSwapAmount = astroAmount10.toString();

const queryPool = async () => {
  // query pool info to calculate, didn't take into account slippage
  lcd.wasm
    .contractQuery(astroLunaPairAddress, { pool: {} })
    .then((result) => {
      console.log(`result`, JSON.stringify(result, null, 2));
      // @ts-ignore
      const beliefPrice = (result.assets[0].amount / result.assets[1].amount).toFixed(18);
      console.log(`query pool`, beliefPrice);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

const querySimulateSwap = async (fromLuna: boolean = true) => {
  // using simulate swap from pool, take into account slippage
  let offerAsset;
  if (fromLuna) {
    offerAsset = {
      info: {
        native_token: {
          denom: CHAIN_DENOM,
        },
      },
      amount: lunaSwapAmount,
    };
  } else {
    offerAsset = {
      info: {
        token: {
          contract_addr: astroTokenAddress,
        },
      },
      amount: astroSwapAmount,
    };
  }
  lcd.wasm
    .contractQuery(astroLunaPairAddress, {
      simulation: {
        offer_asset: offerAsset,
      },
    })
    .then((result) => {
      console.log(`query pool simulate swap endpoint`, JSON.stringify(result, null, 2));
      //   const beliefPrice = String(result.return_amount * 1_000_000);
      const beliefPrice = // @ts-ignore
        (result.return_amount / (fromLuna ? lunaSwapAmount : astroSwapAmount)).toFixed(18);
      console.log(`beliefPrice`, beliefPrice);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

const queryRouterSimulateSwap = async (fromLuna: boolean = true) => {
  // using simulate swap from router, take into account slippage
  let simulateSwapOperation;
  if (fromLuna) {
    simulateSwapOperation = {
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
    };
  } else {
    simulateSwapOperation = {
      offer_amount: astroSwapAmount,
      operations: [
        {
          astro_swap: {
            ask_asset_info: {
              native_token: {
                denom: CHAIN_DENOM,
              },
            },
            offer_asset_info: {
              token: {
                contract_addr: astroTokenAddress,
              },
            },
          },
        },
      ],
    };
  }
  lcd.wasm
    .contractQuery(astroportRouterAddress, {
      simulate_swap_operations: simulateSwapOperation,
    })
    .then((result) => {
      console.log(`query router simulate swap endpoint`, JSON.stringify(result, null, 2));
      const beliefPrice = // @ts-ignore
        (result.amount / (fromLuna ? lunaSwapAmount : astroSwapAmount)).toFixed(18);
      console.log(`beliefPrice`, beliefPrice);
    })
    .catch((e) => {
      printAxiosError(e);
      throw e;
    });
};

// queryPool();
querySimulateSwap(false);
// queryRouterSimulateSwap(false);
