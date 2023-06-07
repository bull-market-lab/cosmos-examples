import { ASTRO_TOKEN_ADDRESS, CHAIN_PREFIX } from "../env";
import { getLCD, getMnemonicKey, getWallet } from "../util";

// i distributed initially balance to tester2
const mnemonicKey = getMnemonicKey(true);
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);
// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);
const astroTokenAddress = ASTRO_TOKEN_ADDRESS!;

const checkBalance = async () => {
  const response = await lcd.wasm.contractQuery(astroTokenAddress, {
    balance: { address: myAddress },
  });
  console.log(`astro balance`, response);

  const [terraBalance] = await lcd.bank.balance(myAddress);
  console.log(`terra balance`, terraBalance);
};

checkBalance();
