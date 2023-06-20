// WIP !!!
import axios from "axios";
import {
  MsgGrantAuthorization,
  GenericAuthorization,
  AuthorizationGrant,
} from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpAccountAddress,
} from "../util";
import { CHAIN_PREFIX, LCD_ENDPOINT } from "../env";

const lcd = getLCD();

const mnemonicKey1 = getMnemonicKey();
const mnemonicKey2 = getMnemonicKey(true);
const wallet1 = getWallet(lcd, mnemonicKey1);
const wallet2 = getWallet(lcd, mnemonicKey2);

const granter = wallet1.key.accAddress(CHAIN_PREFIX);
let grantee = wallet2.key.accAddress(CHAIN_PREFIX);

/*
const axios = require('axios');

const lcdURL = 'https://rest-kralum.neutron-1.neutron.org/';
const contractAddress =
"neutron1h6828as2z5av0xqtlh4w9m75wxewapk8z9l2flvzc29zeyzhx6fqgp648z";
const queryMsg = {
  "withdrawable_amount": {
    "address": "neutron1cq8z4l5wzdlr7cucac49rqz2fnu8y8zx7za9vl"
  }
};

const queryContract = async () => {
  const queryB64Encoded = Buffer.from(JSON.stringify(queryMsg)).toString('base64');
  const res = await axios.get(`${lcdURL}/cosmwasm/wasm/v1/contract/${contractAddress}/smart/${queryB64Encoded}`);
  console.log(res.data);
};

queryContract();
*/
const grant = async () => {
  // expire in 2.5 minute
  const expiration = new Date(Date.now() + 1000 * 150);

  const msgTypeUrl = "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward";
  const genericAuthorization = new GenericAuthorization(msgTypeUrl);
  const grantGeneric = new AuthorizationGrant(genericAuthorization, expiration);

  // grant my warp account access to withdraw delegator reward on behalf of granter
  const warpAccount = await getWarpAccountAddress(lcd, granter);
  grantee = warpAccount;
  const grantGenericAuthorizationMsg = new MsgGrantAuthorization(granter, grantee, grantGeneric);

  // // wallet1 is granter
  // createSignBroadcastCatch(wallet1, [grantGenericAuthorizationMsg]);

  const apiUrl = `${LCD_ENDPOINT}/`; // Replace with the URL of your Cosmos SDK node

  // Construct the transaction payload
  const payload = {
    body: {
      messages: [
        // {
        //   type: 'wasm/MsgExecuteContract',
        //   value: {
        //     sender: '<sender-address>', // Replace with the sender address
        //     contract: contractAddress,
        //     msg: {
        //       [methodName]: params
        //     },
        //     funds: []
        //   }
        // }
        {
          "@type": "/cosmwasm.wasm.v1.ContractExecutionAuthorization",
          grants: [
            {
              contract: grantee,
              limit: expiration,
              filter: [],
            },
          ],
          contract: "neutron1h6828as2z5av0xqtlh4w9m75wxewapk8z9l2flvzc29zeyzhx6fqgp648z",
          funds: [],
          msg: {
            withdraw: {},
          },
          sender: granter,
        },
      ],
      memo: "Executing Wasm contract",
    },
    chain_id: "<chain-id>", // Replace with the chain ID of your Cosmos SDK chain
    account_number: "<account-number>", // Replace with the sender's account number
    sequence: "<sequence-number>", // Replace with the sender's sequence number
    fee: {
      amount: [],
      gas: "200000", // Set an appropriate gas limit for your transaction
    },
  };

  // Send the transaction to the REST API
  const response = await axios.post(`${apiUrl}/txs`, payload);
};

grant();
