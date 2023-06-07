import { getLCD, getMnemonicKey, getWallet, printAxiosError } from "../util";
import { CHAIN_PREFIX } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(true);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const granter = wallet1.key.accAddress(CHAIN_PREFIX);
const grantee = wallet2.key.accAddress(CHAIN_PREFIX);

const getGrantee = async () => {
  lcd.authz
    .grantee(grantee)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((e) => {
      console.log("error in create and sign tx");
      printAxiosError(e);
      throw e;
    });
};

getGrantee();
