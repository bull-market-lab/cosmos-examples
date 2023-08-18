import Big from "big.js";
import {
  MsgExecAuthorized,
  MsgExecuteContract,
  MsgWithdrawDelegatorReward,
} from "@terra-money/feather.js";
import {
  createSignBroadcastCatch,
  getLCD,
  getMnemonicKey,
  getWallet,
  getWarpDefaultAccountAddress,
  getWarpJobCreationFeePercentage,
  toBase64FromBinary,
} from "../../../util";
import { CHAIN_PREFIX, VALIDATOR_ADDRESS, WARP_CONTROLLER_ADDRESS } from "../../../env";

const mnemonicKey = getMnemonicKey();
const lcd = getLCD();
const wallet = getWallet(lcd, mnemonicKey);

// sender
const myAddress = wallet.key.accAddress(CHAIN_PREFIX);

const warpControllerAddress = WARP_CONTROLLER_ADDRESS!;

const run = async () => {
  // 86400 is 1 day in seconds
  // make it shorter for testing, 10 seconds
  const claimInterval = (10).toString();
  // initial value is current timestamp
  const claimStartTime = String(Math.floor(Date.now() / 1000));

  const warpCreationFeePercentages = await getWarpJobCreationFeePercentage(lcd);
  const warpAccountAddress = await getWarpDefaultAccountAddress(lcd, myAddress);

  const jobReward = (1_000_000).toString();
  const jobRewardAndCreationFee = Big(jobReward)
    .mul(Big(warpCreationFeePercentages).add(100).div(100))
    .toString();

  const createWarpAccountIfNotExistAndFundAccount = new MsgExecuteContract(
    myAddress,
    warpControllerAddress,
    {
      create_account: {},
    },
    {
      uluna: jobRewardAndCreationFee,
    }
  );

  // TODO: we may need to switch to amino manually? not sure if feather.js handles the conversion automatically
  // ledger wallet only works with amino encoding
  const grantee = warpAccountAddress;
  const withdrawDelegatorRewardMsg: MsgWithdrawDelegatorReward[] = [
    new MsgWithdrawDelegatorReward(myAddress, VALIDATOR_ADDRESS),
  ];
  const execAuthorizedMsg = new MsgExecAuthorized(grantee, [...withdrawDelegatorRewardMsg]);

  const authzClaimStakingReward = {
    stargate: {
      type_url: "/cosmos.authz.v1beta1.MsgExec",
      value: toBase64FromBinary(execAuthorizedMsg.packAny().value),
    },
  };

  const authzClaimStakingRewardJsonString = JSON.stringify(authzClaimStakingReward);

  const jobVarNameNextExecution = "next-claim-time";
  const jobVarNextExecution = {
    static: {
      kind: "uint", // NOTE: it's better to use uint instead of timestamp to keep it consistent with condition
      name: jobVarNameNextExecution,
      value: claimStartTime,
      update_fn: {
        // update value to current timestamp + dcaInterval, i.e. make next execution 1 day later
        on_success: {
          uint: {
            expr: {
              left: {
                simple: claimInterval,
              },
              op: "add",
              right: {
                env: "time",
              },
            },
          },
        },
        // on error, do nothing for now, this will stop creating new jobs
        // on_error: {
        // }
      },
    },
  };

  const condition = {
    expr: {
      uint: {
        // NOTE: we must use uint instead of timestamp here as timestamp can only compare current time with var
        // there is no left side of expression
        left: {
          env: "time",
        },
        op: "gt",
        right: {
          ref: `$warp.variable.${jobVarNameNextExecution}`,
        },
      },
    },
  };

  const createJob = new MsgExecuteContract(myAddress, warpControllerAddress, {
    create_job: {
      name: "authz_recurring_claim_staking_reward_via_authz",
      description: "claim staking reward via authz",
      labels: [],
      recurring: true,
      requeue_on_evict: false,
      reward: jobReward,
      condition: condition,
      msgs: [authzClaimStakingRewardJsonString],
      vars: [jobVarNextExecution],
    },
  });

  createSignBroadcastCatch(wallet, [createWarpAccountIfNotExistAndFundAccount, createJob]);
};

run();
