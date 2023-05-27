import { ENTERPRISE_DAO_ADDRESS } from '../env';
import { getLCD } from '../util';

const lcd = getLCD();
const enterpriseDaoAddress = ENTERPRISE_DAO_ADDRESS!;

const run = async () => {
  const queryMsg = {
    proposal_status: {
      proposal_id: 2,
    },
  };
  lcd.wasm.contractQuery(enterpriseDaoAddress, queryMsg).then((result) => console.log(result));
};

run();
