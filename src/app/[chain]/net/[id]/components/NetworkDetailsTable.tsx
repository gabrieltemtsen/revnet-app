import {
  MAX_RULESET_COUNT,
  RESERVED_TOKEN_SPLIT_GROUP_ID,
} from "@/app/constants";
import { EthereumAddress } from "@/components/EthereumAddress";
import { Button } from "@/components/ui/button";
import { useNativeTokenSymbol } from "@/hooks/useNativeTokenSymbol";
import {
  ReservedPercent,
  getTokenBPrice,
  MAX_REDEMPTION_RATE,
  RedemptionRate,
  RulesetWeight,
  DecayPercent,
} from "juice-sdk-core";
import {
  useJBContractContext,
  useJBTokenContext,
  useReadJbControllerGetRulesetOf,
  useReadJbRulesetsRulesetsOf,
  useReadJbSplitsSplitsOf,
} from "juice-sdk-react";
import { useState } from "react";
import { twJoin } from "tailwind-merge";

export function NetworkDetailsTable() {
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);

  // const { ruleset, rulesetMetadata } = useJBRulesetContext();

  const {
    projectId,
    contracts: { controller },
  } = useJBContractContext();

  // TODO(perf) duplicate call, move to a new context
  const { data: rulesets } = useReadJbRulesetsRulesetsOf({
    args: [projectId, 0n, BigInt(MAX_RULESET_COUNT)],
    query: {
      select(data) {
        return data
          .map((ruleset) => {
            return {
              ...ruleset,
              weight: new RulesetWeight(ruleset.weight),
              decayPercent: new DecayPercent(ruleset.decayPercent),
            };
          })
          .reverse();
      },
    },
  });

  const selectedStage = rulesets?.[selectedStageIdx];
  const nativeTokenSymbol = useNativeTokenSymbol();
  const tokenA = { symbol: nativeTokenSymbol, decimals: 18 };
  const { token } = useJBTokenContext();

  const selectedStageMetadata = useReadJbControllerGetRulesetOf({
    address: controller.data ?? undefined,
    args: selectedStage?.id ? [projectId, BigInt(selectedStage.id)] : undefined,
    query: {
      select([, rulesetMetadata]) {
        return {
          ...rulesetMetadata,
          redemptionRate: new RedemptionRate(rulesetMetadata.redemptionRate),
          reservedPercent: new ReservedPercent(rulesetMetadata.reservedPercent),
        };
      },
    },
  });

  const { data: selectedStateReservedTokenSplits } = useReadJbSplitsSplitsOf({
    args:
      selectedStage && selectedStage
        ? [projectId, BigInt(selectedStage.id), RESERVED_TOKEN_SPLIT_GROUP_ID]
        : undefined,
  });
  const selectedStageBoost = selectedStateReservedTokenSplits?.[0];
  const reservedPercent = selectedStageMetadata?.data?.reservedPercent;

  const currentTokenBPrice =
    selectedStage && selectedStageMetadata?.data
      ? getTokenBPrice(tokenA.decimals, {
          weight: selectedStage?.weight,
          reservedPercent: selectedStageMetadata?.data?.reservedPercent,
        })
      : null;

  if (!selectedStage) return null;

  return (
    <div>
      <div className="flex gap-2 mb-2">
        {rulesets?.map((ruleset, idx) => {
          return (
            <Button
              variant="ghost"
              className={twJoin(
                "text-sm font-normal",
                selectedStageIdx === idx && "font-medium underline"
              )}
              key={ruleset.id.toString() + idx}
              onClick={() => setSelectedStageIdx(idx)}
            >
              Stage {idx + 1}
            </Button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-8 pl-4">
        <div className="border-t border-zinc-100 px-4 py-2 sm:col-span-1 sm:px-0 grid grid-cols-2">
          <dt className="text-sm font-medium leading-6 text-zinc-900">
            Starts at
          </dt>
          <dd className="text-sm leading-6 text-zinc-700">
            {new Date(Number(selectedStage.start) * 1000).toISOString()}
          </dd>
        </div>
        <div className="border-t border-zinc-100 px-4 py-2 sm:col-span-1 sm:px-0 grid grid-cols-2">
          <dt className="text-sm font-medium leading-6 text-zinc-900">
            Starting price
          </dt>
          <dd className="text-sm leading-6 text-zinc-700">
            {currentTokenBPrice?.format()} {tokenA.symbol} /{" "}
            {token.data?.symbol}
          </dd>
        </div>
        <div className="border-t border-zinc-100 px-4 py-2 sm:col-span-1 sm:px-0 grid grid-cols-2">
          <dt className="text-sm font-medium leading-6 text-zinc-900">
            Price increase
          </dt>
          <dd className="text-sm leading-6 text-zinc-700">
            {selectedStage.decayPercent.formatPercentage()}% every{" "}
            {(selectedStage.duration / 86400).toString()} days
          </dd>
        </div>
        <div className="border-t border-zinc-100 px-4 py-2 sm:col-span-1 sm:px-0 grid grid-cols-2">
          <dt className="text-sm font-medium leading-6 text-zinc-900">
            Exit tax
          </dt>
          <dd className="text-sm leading-6 text-zinc-700">
            {new RedemptionRate(
              MAX_REDEMPTION_RATE -
                Number(selectedStageMetadata?.data?.redemptionRate.value ?? 0n)
            ).formatPercentage()}
            %
          </dd>
        </div>
        <div className="border-t border-zinc-100 px-4 py-2 sm:col-span-1 sm:px-0 grid grid-cols-2">
          <dt className="text-sm font-medium leading-6 text-zinc-900">
            Operator
          </dt>
          <dd className="text-sm leading-6 text-zinc-700 overflow-hidden text-ellipsis">
            {selectedStageBoost?.beneficiary ? (
              <EthereumAddress
                withEnsName
                short
                address={selectedStageBoost.beneficiary}
              />
            ) : (
              "Not set"
            )}
          </dd>
        </div>
        <div className="border-t border-zinc-100 px-4 py-2 sm:col-span-1 sm:px-0 grid grid-cols-2">
          <dt className="text-sm font-medium leading-6 text-zinc-900">
            Operator token split
          </dt>
          {selectedStageBoost ? (
            <dd className="text-sm leading-6 text-zinc-700">
              {reservedPercent?.formatPercentage()}%
            </dd>
          ) : null}
        </div>
      </div>
    </div>
  );
}
