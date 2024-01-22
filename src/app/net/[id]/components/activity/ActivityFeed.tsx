import { EthereumAddress } from "@/components/EthereumAddress";
import EtherscanLink from "@/components/EtherscanLink";
import {
  OrderDirection,
  PayEvent_OrderBy,
  PayEventsQuery,
  usePayEventsQuery,
} from "@/generated/graphql";
import { formatDistance } from "date-fns";
import { Ether, JBProjectToken } from "juice-sdk-core";
import { useJBContractContext, useJBTokenContext } from "juice-sdk-react";
import { Address } from "viem";

type PayEvent = {
  id: string;
  amount: Ether;
  beneficiary: Address;
  beneficiaryTokenCount: JBProjectToken;
  timestamp: number;
  txHash: string;
};

function ActivityItem(ev: PayEvent) {
  const { token } = useJBTokenContext();
  if (!token?.data) return null;

  const formattedDate = formatDistance(ev.timestamp * 1000, new Date(), {
    addSuffix: true,
  });

  return (
    <div>
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <EthereumAddress
          address={ev.beneficiary}
          withEnsName
          withEnsAvatar
          avatarProps={{ size: "sm" }}
          short
        />
        <div>
          bought {ev.beneficiaryTokenCount.format()} {token.data.symbol}
        </div>
      </div>
      <div className="text-xs text-zinc-500 ml-7">
        Paid {ev.amount.format()} ETH •{" "}
        <EtherscanLink type="tx" value={ev.txHash}>
          {formattedDate}
        </EtherscanLink>
      </div>
    </div>
  );
}

function transformPayEventsRes(
  data: PayEventsQuery | undefined
): PayEvent[] | undefined {
  return data?.payEvents.map((event) => {
    return {
      id: event.id,
      amount: new Ether(BigInt(event.amount)),
      beneficiary: event.beneficiary,
      beneficiaryTokenCount: new JBProjectToken(
        BigInt(event.beneficiaryTokenCount)
      ),
      timestamp: event.timestamp,
      txHash: event.txHash,
    };
  });
}

export function ActivityFeed() {
  const { projectId } = useJBContractContext();
  const { data } = usePayEventsQuery({
    variables: {
      orderBy: PayEvent_OrderBy.id,
      orderDirection: OrderDirection.desc,
      where: {
        // pv: PV2,
        projectId: Number(projectId),
      },
    },
  });

  const payEvents = transformPayEventsRes(data);

  return (
    <div>
      <div className="mb-3">Activity</div>
      <div className="flex flex-col gap-3">
        {payEvents && payEvents.length > 0 ? (
          payEvents?.map((event) => {
            return <ActivityItem key={event.id} {...event} />;
          })
        ) : (
          <span className="text-zinc-500 text-sm">No activity yet.</span>
        )}
      </div>
    </div>
  );
}
