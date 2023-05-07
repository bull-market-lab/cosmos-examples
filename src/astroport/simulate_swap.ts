import { getLCD } from '../util';
import { ASTRO_LUNA_PAIR_ADDRESS, CHAIN_DENOM } from '../env';

const lcd = getLCD();

// this is the astro-luna pair contract, not the astro-luna lp token contract
const astroLunaPairAddress = ASTRO_LUNA_PAIR_ADDRESS!;

const lunaAmount10 = 10_000_000;

const run = async () => {
  // query pool info to calculate, didn't take into account slippage
  lcd.wasm.contractQuery(astroLunaPairAddress, { pool: {} }).then((result) => {
    console.log(`result`, JSON.stringify(result, null, 2));
    // @ts-ignore
    const beliefPrice = (result.assets[0].amount / result.assets[1].amount).toFixed(18);
    console.log(`query pool`, beliefPrice);
  });

  // using simulate swap, take into account slippage
  lcd.wasm
    .contractQuery(astroLunaPairAddress, {
      simulation: {
        offer_asset: {
          info: {
            native_token: {
              denom: CHAIN_DENOM,
            },
          },
          amount: lunaAmount10.toString(),
        },
      },
    })
    .then((result) => {
      console.log(`result`, JSON.stringify(result, null, 2));
      // @ts-ignore
      //   const beliefPrice = String(result.return_amount * 1_000_000);
      const beliefPrice = (result.return_amount / lunaAmount10).toFixed(18);
      console.log(`query simulate swap endpoint`, beliefPrice);
    });
};

run();
