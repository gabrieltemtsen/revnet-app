import {
  OrderDirection,
  Participant_OrderBy,
  ParticipantsDocument,
} from "@/generated/graphql";
import { ParticipantsTable } from "../../../ParticipantsTable";
import { useJBContractContext, useJBTokenContext } from "juice-sdk-react";
import { useBoostRecipient } from "@/hooks/useBoostRecipient";
import { useTotalOutstandingTokens } from "@/hooks/useTotalOutstandingTokens";
import { useState } from "react";
import { ParticipantsPieChart } from "../../../ParticipantsPieChart";
import { zeroAddress } from "viem";
import { Button } from "@/components/ui/button";
import { formatTokenSymbol } from "@/lib/utils";
import { twJoin } from "tailwind-merge";
import { useSubgraphQuery } from "@/graphql/useSubgraphQuery";
import { SectionTooltip } from "../SectionTooltip";

export function HoldersSection() {
  const [participantsView, setParticipantsView] = useState<"table" | "pie">(
    "table"
  );
  const { projectId } = useJBContractContext();
  const { token } = useJBTokenContext();
  const boostRecipient = useBoostRecipient();
  const totalOutstandingTokens = useTotalOutstandingTokens();

  const { data: participantsData } = useSubgraphQuery(ParticipantsDocument, {
    orderBy: Participant_OrderBy.balance,
    orderDirection: OrderDirection.desc,
    where: {
      projectId: Number(projectId),
      balance_gt: "0", // TODO is this a subgraph bug?
      wallet_not: zeroAddress,
    },
  });

  const hasHolders =
    participantsData && participantsData.participants.length > 0;

  return (
    <div>
      {hasHolders ? (
        <div className="mb-2">
          <SectionTooltip name="Owners">
            <div className="max-w-md space-y-4 p-2">
              <p className="text-sm text-black-300">
                The accounts who hold {formatTokenSymbol(token)}, either by:
              </p>
              <ul className="text-sm text-black-300 space-y-2 list-disc pl-4">
                <li>Contributing payments to this revnet and receiving {formatTokenSymbol(token)}.</li>
                <li>Receiving {formatTokenSymbol(token)} from splits.</li>
                <li>Receiving {formatTokenSymbol(token)} from automints.</li>
                <li>Acquiring {formatTokenSymbol(token)} from someone else.</li>
              </ul>
            </div>
          </SectionTooltip>
          <Button
            variant={participantsView === "table" ? "tab-selected" : "bottomline"}
            className={twJoin(
              "text-sm text-zinc-400",
              participantsView === "table" && "text-inherit"
            )}
            onClick={() => setParticipantsView("table")}
          >
            List
          </Button>
          <Button
            variant={participantsView === "pie" ? "tab-selected" : "bottomline"}
            className={twJoin(
              "ml-4 text-sm text-zinc-400",
              participantsView === "pie" && "text-inherit"
            )}
            onClick={() => setParticipantsView("pie")}
          >
            Chart
          </Button>
        </div>
      ) : null}

      {hasHolders && token?.data ? (
        <>
          <div
            className={twJoin(
              "max-h-96 overflow-auto p-2 bg-zinc-50 rounded-md border-zinc-100 border",
              participantsView === "table" ? "" : "hidden"
            )}
          >
            <ParticipantsTable
              participants={participantsData}
              token={token.data}
              totalSupply={totalOutstandingTokens}
              boostRecipient={boostRecipient}
            />
          </div>
          <div className={participantsView === "pie" ? "" : "hidden"}>
            <ParticipantsPieChart
              participants={participantsData}
              totalSupply={totalOutstandingTokens}
              token={token?.data}
            />
          </div>
        </>
      ) : (
        <span className="text-zinc-500">No owners yet.</span>
      )}
    </div>
  );
}
