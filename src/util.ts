import axios from "axios";
import {
  LCDClient as LCDClientOld,
  MnemonicKey as MnemonicKeyOld,
  Wallet as WalletOld,
} from "@terra-money/terra.js";
import { LCDClient, MnemonicKey, Msg, Wallet } from "@terra-money/feather.js";

import { getContractAddress, getNetworkName, WarpSdk } from "@terra-money/warp-sdk";
import {
  CHAIN_DENOM,
  CHAIN_ID,
  CHAIN_PREFIX,
  LCD_ENDPOINT,
  TESTER1_MNEMONIC_KEY,
  TESTER2_MNEMONIC_KEY,
  TESTER3_MNEMONIC_KEY,
  WARP_CONTROLLER_ADDRESS,
} from "./env";
import { CHAIN_ID_LOCALTERRA } from "./constant";

export const getLCDOld = (): LCDClientOld => {
  return new LCDClientOld({
    URL: LCD_ENDPOINT,
    chainID: CHAIN_ID,
  });
};

export const getMnemonicKeyOld = (testerId = 1, isCoinType118 = false): MnemonicKeyOld => {
  switch (testerId) {
    case 1:
      return new MnemonicKeyOld({
        mnemonic: TESTER1_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
    case 2:
      return new MnemonicKeyOld({
        mnemonic: TESTER2_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
    case 3:
      return new MnemonicKeyOld({
        mnemonic: TESTER3_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
    default:
      return new MnemonicKeyOld({
        mnemonic: TESTER1_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
  }
};

export const getWalletOld = (lcd: LCDClientOld, mnemonicKey: MnemonicKeyOld): WalletOld => {
  return new WalletOld(lcd, mnemonicKey);
};

export const initWarpSdk = (lcd: LCDClientOld, wallet: WalletOld): WarpSdk => {
  // const contractAddress =
  //   CHAIN_ID === CHAIN_ID_LOCALTERRA
  //     ? WARP_CONTROLLER_ADDRESS!
  //     : getContractAddress(getNetworkName(lcd.config.chainID), "warp-controller")!;
  return new WarpSdk(wallet, WARP_CONTROLLER_ADDRESS!);
};

export const getCurrentBlockHeight = async (lcd: LCDClientOld): Promise<string> => {
  return (await lcd.tendermint.blockInfo()).block.header.height;
};

export const getLCD = (): LCDClient => {
  return new LCDClient({
    [CHAIN_ID]: {
      lcd: LCD_ENDPOINT,
      chainID: CHAIN_ID,
      gasAdjustment: 3.5,
      gasPrices: { [CHAIN_DENOM]: 0.015 },
      prefix: CHAIN_PREFIX, // bech32 prefix, used by the LCD to understand which is the right chain to query
    },
  });
};

export const getMnemonicKey = (testerId = 1, isCoinType118 = false): MnemonicKey => {
  switch (testerId) {
    case 1:
      return new MnemonicKey({
        mnemonic: TESTER1_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
    case 2:
      return new MnemonicKey({
        mnemonic: TESTER2_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
    case 3:
      return new MnemonicKey({
        mnemonic: TESTER3_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
    default:
      return new MnemonicKey({
        mnemonic: TESTER1_MNEMONIC_KEY,
        coinType: isCoinType118 ? 118 : 330,
      });
  }
};

export const getWallet = (lcd: LCDClient, mnemonicKey: MnemonicKey): Wallet => {
  return new Wallet(lcd, mnemonicKey);
};

export const toBase64 = (obj: Object) => {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
};

// !!! stargate msg value is binary encoded unlike others that are json encoded
export const toBase64FromBinary = (b: Uint8Array) => {
  return Buffer.from(b).toString("base64");
};

// used for encoding wasm contract
export const toBase64FromBuffer = (b: Buffer) => {
  return b.toString("base64");
};

export const getWarpAccountAddress = async (lcd: LCDClient, owner: string): Promise<string> => {
  const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;
  const warpAccount = await lcd.wasm.contractQuery(warpControllerAddress, {
    query_account: {
      owner: owner,
    },
  });
  // @ts-ignore
  return warpAccount.account.account;
};

export const getWarpJobCreationFeePercentage = async (lcd: LCDClient): Promise<string> => {
  const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;
  const warpConfig = await lcd.wasm.contractQuery(warpControllerAddress, {
    query_config: {},
  });
  // @ts-ignore
  return warpConfig.config.creation_fee_percentage;
};

// if is axios error then print the extracted part otherwise print whole error
// most of time it should be cause axios error is the one returned when we call lcd
export const printAxiosError = (e: any) => {
  if (axios.isAxiosError(e)) {
    if (e.response) {
      console.log(e.response.status);
      console.log(e.response.headers);
      if (
        typeof e.response.data === "object" &&
        e.response.data !== null &&
        "code" in e.response.data &&
        "message" in e.response.data
      ) {
        console.log(`Code=${e.response?.data["code"]} Message=${e.response?.data["message"]} \n`);
      } else {
        console.log(e.response.data);
      }
    }
  } else {
    console.log(e);
  }
};

export const createSignBroadcastCatch = async (
  wallet: Wallet,
  msgs: Msg[],
  autoEstimateFee = true
) => {
  const txOptions = {
    msgs: msgs,
    chainID: CHAIN_ID,
  };
  if (!autoEstimateFee) {
    txOptions["gasPrices"] = "0.15uluna";
    txOptions["gasAdjustment"] = 1.4;
    txOptions["gas"] = (1_500_000).toString();
  }
  wallet
    .createAndSignTx(txOptions)
    .then((tx) => wallet.lcd.tx.broadcast(tx, CHAIN_ID))
    .catch((e) => {
      console.log("error in create and sign tx");
      printAxiosError(e);
      throw e;
    })
    .then((txInfo) => {
      console.log(txInfo);
    })
    .catch((e) => {
      console.log("error in broadcast tx");
      printAxiosError(e);
      throw e;
    });
};
