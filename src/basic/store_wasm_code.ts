import * as fs from "fs";
import { MsgStoreCode } from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  toBase64FromBuffer,
} from "../util";
import { CHAIN_PREFIX } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const wallet1 = getWallet(lcd, mnemonicKey1);
const myAddress1 = wallet1.key.accAddress(CHAIN_PREFIX);

const wasmCodeDirectory =
  "/Users/dev0/go/src/github.com/neutron-org/neutron-tge-contracts/artifacts/";
/*
astroport_oracle.wasm      credits.wasm               neutron_lockdrop.wasm      vesting_lp.wasm
checksums.txt              cw20_merkle_airdrop.wasm   neutron_price_feed.wasm    vesting_lti.wasm
checksums_intermediate.txt neutron_auction.wasm       vesting_investors.wasm
*/

const creditsWasm = wasmCodeDirectory + "credits.wasm";
const neutronLockdropWasm = wasmCodeDirectory + "neutron_lockdrop.wasm";
const neutronPriceFeedWasm = wasmCodeDirectory + "neutron_price_feed.wasm";
const neutronAuctionWasm = wasmCodeDirectory + "neutron_auction.wasm";
const vestingLpWasm = wasmCodeDirectory + "vesting_lp.wasm";
const vestingLtiWasm = wasmCodeDirectory + "vesting_lti.wasm";
const vestingInvestorsWasm = wasmCodeDirectory + "vesting_investors.wasm";

// console.log("myAddress1", myAddress1);
// lcd.bank.balance(myAddress1).then((res) => {
//   console.log(res);
// });

const storeCode = async () => {
  const storeCodeMsg = new MsgStoreCode(
    myAddress1,
    toBase64FromBuffer(fs.readFileSync(vestingLpWasm))
  );
  createSignBroadcastCatch(wallet1, [storeCodeMsg]);
};

storeCode();
