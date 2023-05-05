import axios from 'axios';
import { LCDClient, MnemonicKey, Wallet } from '@terra-money/terra.js';
import { getContractAddress, getNetworkName, WarpSdk } from '@terra-money/warp-sdk';
import {
  CHAIN_ID,
  LCD_ENDPOINT,
  MNEMONIC_KEY,
  TESTER_MNEMONIC_KEY,
  WARP_CONTROLLER_ADDRESS,
} from '../env';
import { CHAIN_ID_LOCALTERRA } from '../constant';

export const getLCD = (): LCDClient => {
  return new LCDClient({
    URL: LCD_ENDPOINT,
    chainID: CHAIN_ID,
  });
};

// tester create job and update job, deposit / withdraw
// non tester (keeper) execute job, evict job
export const getMnemonicKey = (isTester = false): MnemonicKey => {
  if (isTester) {
    return new MnemonicKey({ mnemonic: TESTER_MNEMONIC_KEY });
  }
  return new MnemonicKey({ mnemonic: MNEMONIC_KEY });
};

export const getWallet = (lcd: LCDClient, mnemonicKey: MnemonicKey): Wallet => {
  return new Wallet(lcd, mnemonicKey);
};

export const initWarpSdk = (lcd: LCDClient, wallet: Wallet): WarpSdk => {
  const contractAddress =
    CHAIN_ID === CHAIN_ID_LOCALTERRA
      ? WARP_CONTROLLER_ADDRESS!
      : getContractAddress(getNetworkName(lcd.config.chainID), 'warp-controller')!;
  return new WarpSdk(wallet, contractAddress);
};

export const getCurrentBlockHeight = async (lcd: LCDClient): Promise<string> => {
  return (await lcd.tendermint.blockInfo()).block.header.height;
};

// if is axios error then print the extracted part otherwise print whole error
// most of time it should be cause axios error is the one returned when we call lcd
export const printAxiosError = (e: any) => {
  if (axios.isAxiosError(e)) {
    if (e.response) {
      console.log(e.response.status);
      console.log(e.response.headers);
      if (
        typeof e.response.data === 'object' &&
        e.response.data !== null &&
        'code' in e.response.data &&
        'message' in e.response.data
      ) {
        console.log(`Code=${e.response?.data['code']} Message=${e.response?.data['message']} \n`);
      } else {
        console.log(e.response.data);
      }
    }
  } else {
    console.log(e);
  }
};
