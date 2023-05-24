import { ENTERPRISE_DAO_ADDRESS } from '../env';
import { getLCD } from '../util';

const lcd = getLCD();
const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

export const queryProposalStatus = async () => {
  const queryMsg = {
    proposal_status: {
      proposal_id: 3,
    },
  };
  //   const execute = new MsgExecuteContract(
  //     wallet.key.accAddress("terra"), // sender
  //     "terra1v99r4pl7z5d8nhvm7lrevutqyr4snvu90h3mvfqqwglce30v7vnqh8z37m", // contract account address
  //     { ...executeMsg } // handle msg
  //     // { uluna: 100000 } // coins
  //   );

  //   const executeTx = await wallet.createAndSignTx({
  //     msgs: [execute],
  //     chainID: chainId,
  //   });

  //   terra.tx.broadcast(executeTx, chainId).then((result) => console.log(result));
  lcd.wasm.contractQuery(enterpriseDaoAddress, queryMsg).then((result) => console.log(result));
};
