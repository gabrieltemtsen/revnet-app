import { ChainIdToChain, chainNames } from "@/app/constants";
import { EthereumAddress } from "@/components/EthereumAddress";
import EtherscanLink from "@/components/EtherscanLink";
import {
  OrderDirection,
  PayEvent,
  ProjectEvent_OrderBy,
  ProjectEventsDocument,
  RedeemEvent,
} from "@/generated/graphql";
import { useOmnichainSubgraphQuery } from "@/graphql/useOmnichainSubgraphQuery";
import { formatDistance } from "date-fns";
import { Ether, JBProjectToken } from "juice-sdk-core";
import {
  JBChainId,
  useJBChainId,
  useJBContractContext,
  useJBTokenContext,
} from "juice-sdk-react";
import { useMemo } from "react";
import { Address } from "viem";

type PayActivityItemData = {
  id: string;
  amount: Ether;
  beneficiary: Address;
  beneficiaryTokenCount?: JBProjectToken;
  timestamp: number;
  txHash: string;
};

function PayActivityItem(
  payEvent: Pick<
    PayEvent,
    | "amount"
    | "beneficiary"
    | "beneficiaryTokenCount"
    | "timestamp"
    | "txHash"
    | "note"
  > & { chainId: JBChainId }
) {
  const { token } = useJBTokenContext();
  const chainId = useJBChainId();
  const chain = chainId && ChainIdToChain[chainId];
  if (!token?.data || !payEvent) return null;

  const activityItemData = {
    amount: new Ether(BigInt(payEvent.amount)),
    beneficiary: payEvent.beneficiary,
    beneficiaryTokenCount: new JBProjectToken(
      BigInt(payEvent.beneficiaryTokenCount)
    ),
    memo: payEvent.note,
  };

  const formattedDate = formatDistance(payEvent.timestamp * 1000, new Date(), {
    addSuffix: true,
  });

  return (
    <div>
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <EthereumAddress
          address={activityItemData.beneficiary}
          withEnsName
          withEnsAvatar
          avatarProps={{ size: "sm" }}
          short
        />
        <div>
          bought {activityItemData.beneficiaryTokenCount?.format(6)}{" "}
          {token.data.symbol} on {chainNames[payEvent.chainId]}
        </div>
      </div>
      <div className="text-xs text-zinc-500 ml-7">
        Contributed {activityItemData.amount.format(6)} ETH •{" "}
        <EtherscanLink type="tx" value={payEvent.txHash} chain={chain}>
          {formattedDate}
        </EtherscanLink>
      </div>
      <div className="text-xs text-zinc-500 ml-7">{activityItemData.memo}</div>
    </div>
  );
}

function RedeemActivityItem(
  redeemEvent: Pick<
    RedeemEvent,
    "reclaimAmount" | "beneficiary" | "txHash" | "timestamp" | "redeemCount"
  > & { chainId: JBChainId }
) {
  const { token } = useJBTokenContext();
  if (!token?.data || !redeemEvent) return null;

  const activityItemData = {
    amount: new Ether(BigInt(redeemEvent.reclaimAmount)),
    beneficiary: redeemEvent.beneficiary,
    redeemCount: new JBProjectToken(BigInt(redeemEvent.redeemCount)),
  };

  const formattedDate = formatDistance(
    redeemEvent.timestamp * 1000,
    new Date(),
    {
      addSuffix: true,
    }
  );

  return (
    <div>
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <EthereumAddress
          address={activityItemData.beneficiary}
          withEnsName
          withEnsAvatar
          avatarProps={{ size: "sm" }}
          short
        />
        <div>
          cashed out {activityItemData.redeemCount?.format(6)}{" "}
          {token.data.symbol} on {chainNames[redeemEvent.chainId]}
        </div>
      </div>
      <div className="text-xs text-zinc-500 ml-7">
        Received {activityItemData.amount.format(6)} ETH •{" "}
        <EtherscanLink type="tx" value={redeemEvent.txHash}>
          {formattedDate}
        </EtherscanLink>
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const { projectId } = useJBContractContext();
  const { data } = useOmnichainSubgraphQuery(ProjectEventsDocument, {
    orderBy: ProjectEvent_OrderBy.timestamp,
    orderDirection: OrderDirection.desc,
    where: {
      projectId: Number(projectId),
    },
  });
  const projectEvents = useMemo(() => {
    return data?.flatMap((d) => {
      return d.value.response.projectEvents.map((e) => {
        return {
          ...e,
          chainId: d.value.chainId,
        };
      });
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [data]);

  return (
    <div>
      <div className="mb-3 font-medium">Activity</div>
      <div className="flex flex-col gap-3">
        {projectEvents && projectEvents.length > 0 ? (
          projectEvents?.map((event) => {
            if (event.payEvent) {
              return (
                <PayActivityItem
                  key={event.id}
                  chainId={event.chainId}
                  {...event.payEvent}
                />
              );
            }
            if (event.redeemEvent) {
              return (
                <RedeemActivityItem
                  key={event.id}
                  chainId={event.chainId}
                  {...event.redeemEvent}
                />
              );
            }

            return null;
          })
        ) : (
          <span className="text-zinc-500 text-sm">No activity yet.</span>
        )}
      </div>
    </div>
  );
}
